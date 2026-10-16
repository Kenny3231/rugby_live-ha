"""Timeline engine: reconcile ESPN plays, apply the user delay, compute the visible state.

Pure module (no Home Assistant import). One MatchTimeline per match.

Why reconciliation (docs/01): ESPN corrects a play by deleting it and recreating it
with a new id, sometimes ~50 min later, deletes cancelled tries, and ids follow entry
order, not match order. A logical event therefore has its own stable `key`.

Delay: every event / score / status change gets `observed_at` (first time we saw it).
It becomes visible at observed_at + delay; everything the user sees derives from
visible items only. Catch-up items (first sight of an in-progress match in this run)
are visible at once and never emitted.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any

from .models import MatchStatus, Play, PlayType

# Measured on 2026-10-10 (Perpignan-Vannes): ESPN re-entered a whole half; versions of
# one play kept type, team and athlete but moved by up to 6 min of game clock, and could
# be absent for ~100 s between deletion and re-creation. Score-after is NOT reliable.
REMATCH_WINDOW = 120.0  # game-clock seconds, only when the athlete is unknown
ATHLETE_WINDOW = 600.0  # game-clock seconds, same athlete
REVOKE_GRACE = timedelta(seconds=180)  # missing that long -> revoked
GRAVEYARD_TTL = timedelta(minutes=20)  # revoked events can still be restored silently
PERIOD_CAP = {1: 40 * 60, 2: 80 * 60}  # extra time: 100 min


@dataclass
class TimelineEvent:
    key: str
    play_id: str
    type: PlayType
    team_id: str | None
    period: int
    clock: float
    home_score: int
    away_score: int
    athlete_id: str | None
    observed_at: datetime
    released: bool = False
    catch_up: bool = False
    missing_since: datetime | None = None

    @property
    def minute(self) -> int:
        return int(self.clock // 60) + 1


@dataclass
class Change:
    """A score or status change (value is (home, away) or a MatchStatus)."""

    observed_at: datetime
    value: Any
    released: bool = False
    catch_up: bool = False


@dataclass
class Visible:
    status: MatchStatus | None
    home_score: int
    away_score: int
    events: list[TimelineEvent]
    minute: int | None
    minute_source: str | None
    stoppage: bool  # minute capped at 40/80: show "40+" / "80+"
    provisional: bool = False  # score taken from a play the scoreboard has not confirmed yet


SCORING = (PlayType.TRY, PlayType.CONVERSION, PlayType.PENALTY_GOAL, PlayType.DROP_GOAL)


def _visible(item: TimelineEvent | Change, cutoff: datetime) -> bool:
    return item.catch_up or item.observed_at <= cutoff


class MatchTimeline:
    """State of one match across polls."""

    def __init__(self, match_id: str, home_id: str, away_id: str) -> None:
        self.match_id = match_id
        self.home_id = home_id
        self.away_id = away_id
        self.events: dict[str, TimelineEvent] = {}
        self.scores: list[Change] = []
        self.statuses: list[Change] = []
        self.graveyard: dict[str, tuple[TimelineEvent, datetime]] = {}  # key -> (event, revoked_at)
        self._seq = 0

    # ---------------------------------------------------------------- ingestion

    def side(self, team_id: str | None) -> str | None:
        return {self.home_id: "home", self.away_id: "away"}.get(team_id or "")

    def ingest_plays(
        self, plays: list[Play], now: datetime, catch_up: bool = False
    ) -> tuple[list[TimelineEvent], list[TimelineEvent]]:
        """Reconcile a full plays snapshot. Returns (new events, revoked events)."""
        self.graveyard = {
            k: (ev, at) for k, (ev, at) in self.graveyard.items() if now - at < GRAVEYARD_TTL
        }
        current = {p.id for p in plays}
        by_play = {ev.play_id: ev for ev in self.events.values()}
        missing = [ev for ev in self.events.values() if ev.play_id not in current]
        missing += [ev for ev, _ in self.graveyard.values()]
        new: list[TimelineEvent] = []

        for play in plays:
            ev = by_play.get(play.id)
            if ev is None:
                ev = self._rematch(play, missing)
                if ev is not None:  # a deleted play recreated with a new id
                    missing.remove(ev)
                    if self.graveyard.pop(ev.key, None):
                        self.events[ev.key] = ev
            if ev is not None:
                self._update(ev, play)
                continue
            self._seq += 1
            ev = TimelineEvent(
                key=f"{self.match_id}-{self._seq}",
                play_id=play.id,
                type=play.type,
                team_id=play.team_id,
                period=play.period,
                clock=play.clock,
                home_score=play.home_score,
                away_score=play.away_score,
                athlete_id=play.athlete_id,
                observed_at=now,
                released=catch_up,
                catch_up=catch_up,
            )
            self.events[ev.key] = ev
            new.append(ev)

        revoked = []
        for ev in missing:
            if ev.key not in self.events:  # already in the graveyard
                continue
            ev.missing_since = ev.missing_since or now
            if now - ev.missing_since >= REVOKE_GRACE:
                revoked.append(self.events.pop(ev.key))
                self.graveyard[ev.key] = (ev, now)
        return new, revoked

    @staticmethod
    def _rematch(play: Play, missing: list[TimelineEvent]) -> TimelineEvent | None:
        def same(ev: TimelineEvent) -> bool:
            if (ev.type, ev.team_id, ev.period) != (play.type, play.team_id, play.period):
                return False
            gap = abs(ev.clock - play.clock)
            if ev.athlete_id and play.athlete_id:
                return ev.athlete_id == play.athlete_id and gap <= ATHLETE_WINDOW
            return gap <= REMATCH_WINDOW

        candidates = [ev for ev in missing if same(ev)]
        return min(candidates, key=lambda ev: abs(ev.clock - play.clock), default=None)

    @staticmethod
    def _update(ev: TimelineEvent, play: Play) -> None:
        ev.play_id = play.id
        ev.clock = play.clock
        ev.home_score = play.home_score
        ev.away_score = play.away_score
        ev.athlete_id = play.athlete_id or ev.athlete_id
        ev.missing_since = None

    def ingest_score(self, home: int, away: int, now: datetime, catch_up: bool = False) -> None:
        if not self.scores or self.scores[-1].value != (home, away):
            self.scores.append(Change(now, (home, away), released=True, catch_up=catch_up))

    def ingest_status(
        self, status: MatchStatus, now: datetime, catch_up: bool = False
    ) -> Change | None:
        """Record a status change; returns it when it is new."""
        if self.statuses and self.statuses[-1].value == status:
            return None
        change = Change(now, status, released=catch_up, catch_up=catch_up)
        self.statuses.append(change)
        return change

    # ------------------------------------------------------------------ release

    def due(self, now: datetime, delay: float) -> list[TimelineEvent | Change]:
        """Items that just became visible: mark them released, return them in order."""
        cutoff = now - timedelta(seconds=delay)
        items: list[TimelineEvent | Change] = [
            item
            for item in [*self.events.values(), *self.statuses]
            if not item.released and item.observed_at <= cutoff
        ]
        for item in items:
            item.released = True
        return sorted(items, key=lambda i: i.observed_at)

    def next_release(self, delay: float) -> datetime | None:
        pending = [
            item.observed_at
            for item in [*self.events.values(), *self.statuses]
            if not item.released
        ]
        return min(pending) + timedelta(seconds=delay) if pending else None

    # ------------------------------------------------------------------- state

    def visible(self, now: datetime, delay: float, kickoff: datetime) -> Visible:
        cutoff = now - timedelta(seconds=delay)
        events = sorted(
            (ev for ev in self.events.values() if _visible(ev, cutoff)),
            key=lambda ev: (ev.period, ev.clock),
        )
        statuses = [c for c in self.statuses if _visible(c, cutoff)]
        status = statuses[-1].value if statuses else None

        # Score from scoreboard snapshots only: score-after on plays is unreliable
        # (a conversion was recorded as 2-0 right after a 5-0 try on 2026-10-10).
        scores = [c for c in self.scores if _visible(c, cutoff)]
        home, away = scores[-1].value if scores else (0, 0)
        since = scores[-1].observed_at if scores else None
        # Pre-shot score: a scoring play seen after the last scoreboard change and whose
        # score-after is ahead of it shows its score at once, flagged provisional until the
        # scoreboard confirms it. A scoreboard change after the play wins (cancelled try).
        ahead = [
            ev
            for ev in events
            if ev.type in SCORING
            and (since is None or ev.observed_at >= since)
            and ev.home_score + ev.away_score > home + away
        ]
        provisional = bool(ahead)
        if ahead:
            last = max(ahead, key=lambda ev: (ev.period, ev.clock))
            home, away = max(home, last.home_score), max(away, last.away_score)

        minute, source, stoppage = self._minute(events, statuses, status, cutoff, kickoff)
        return Visible(status, home, away, events, minute, source, stoppage, provisional)

    def _minute(
        self,
        events: list[TimelineEvent],
        statuses: list[Change],
        status: MatchStatus | None,
        cutoff: datetime,
        kickoff: datetime,
    ) -> tuple[int | None, str | None, bool]:
        """Estimated minute of play (ESPN's displayClock is wrong, docs/01)."""
        if status is None or status in (
            MatchStatus.SCHEDULED,
            MatchStatus.POSTPONED,
            MatchStatus.CANCELLED,
        ):
            return None, None, False
        if status == MatchStatus.HALF_TIME:
            return 40, "status", False
        if status == MatchStatus.FINISHED:
            return max([ev.minute for ev in events] + [80]), "status", False

        period = {MatchStatus.FIRST_HALF: 1, MatchStatus.SECOND_HALF: 2}.get(status, 3)
        cap = PERIOD_CAP.get(period, 100 * 60)
        # Anchor on the official clock of the last play (+ time since we saw it). The
        # scheduled kickoff runs ahead: Clermont-UBB 10/10 kicked off 2 min 23 late and the
        # clock stops for TMO / injuries. Fallback: when ESPN switched the period on.
        last = max(
            (ev for ev in events if ev.period == period), key=lambda e: e.clock, default=None
        )
        if last is not None and not last.catch_up:
            elapsed = max((cutoff - last.observed_at).total_seconds(), 0.0)
            seconds, source = last.clock + elapsed, "play_clock"
        else:
            start = next(
                (c.observed_at for c in statuses if c.value == status and not c.catch_up), None
            )
            if start is None and period == 1:
                start = kickoff
            if start is not None:
                base = {1: 0, 2: 40 * 60}.get(period, 80 * 60)
                seconds = base + (cutoff - start).total_seconds()
                seconds = max(seconds, last.clock if last else 0.0)
                source = "kickoff_estimate"
            elif last is not None:
                seconds = last.clock + max((cutoff - last.observed_at).total_seconds(), 0.0)
                source = "play_clock"
            else:
                return None, None, False
        return int(min(seconds, cap - 1) // 60) + 1, source, seconds >= cap

    # ------------------------------------------------------------- persistence

    def to_dict(self) -> dict[str, Any]:
        def change(c: Change) -> dict[str, Any]:
            value = list(c.value) if isinstance(c.value, tuple) else str(c.value)
            return {**asdict(c), "observed_at": c.observed_at.isoformat(), "value": value}

        return {
            "match_id": self.match_id,
            "home_id": self.home_id,
            "away_id": self.away_id,
            "seq": self._seq,
            "events": [
                {
                    **asdict(ev),
                    "type": str(ev.type),
                    "observed_at": ev.observed_at.isoformat(),
                    "missing_since": None,  # restarts the revoke grace after a reload
                }
                for ev in self.events.values()
            ],
            "scores": [change(c) for c in self.scores[-5:]],
            "statuses": [change(c) for c in self.statuses],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> MatchTimeline:
        tl = cls(data["match_id"], data["home_id"], data["away_id"])
        tl._seq = data.get("seq", 0)
        for raw in data.get("events", []):
            ev = TimelineEvent(
                **{
                    **raw,
                    "type": PlayType(raw["type"]),
                    "observed_at": datetime.fromisoformat(raw["observed_at"]),
                }
            )
            tl.events[ev.key] = ev
        for raw in data.get("scores", []):
            when = datetime.fromisoformat(raw["observed_at"])
            tl.scores.append(Change(**{**raw, "observed_at": when, "value": tuple(raw["value"])}))
        for raw in data.get("statuses", []):
            when = datetime.fromisoformat(raw["observed_at"])
            status = MatchStatus(raw["value"])
            tl.statuses.append(Change(**{**raw, "observed_at": when, "value": status}))
        return tl
