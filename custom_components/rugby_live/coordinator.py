"""Coordinator: polls ESPN, feeds the timelines, releases events after the delay.

One coordinator for the whole entry (all leagues share one throttled client and one
schedule); ponytail: a per-league coordinator is only worth it if leagues need
different clocks.
"""

from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_point_in_utc_time
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .api import EspnClient, EspnError, names_match
from .const import (
    ANIMATED_EVENTS,
    ANIMATION_QUEUE_MAX,
    COMPETITIONS,
    CONF_ANIMATION_SECONDS,
    CONF_BROADCAST_CALENDAR,
    CONF_COMPETITIONS,
    CONF_FAVORITES,
    CONF_POLL_IDLE,
    CONF_POLL_LIVE,
    CONF_POLL_PREMATCH,
    CONF_POSTMATCH_GRACE,
    CONF_PREMATCH_WINDOW,
    CONF_SHOW_SUBSTITUTIONS,
    CONF_SINBIN_MINUTES,
    DEFAULT_OPTIONS,
    DOMAIN,
    EVENT_DELAYED,
    EVENT_RAW,
    EVENT_REVOKED,
    FIXTURE_DAYS,
    FIXTURE_REFRESH,
    MAX_DELAY,
    SIGNAL_EVENT,
    STORE_KEY,
    STORE_VERSION,
)
from .models import LIVE_STATUSES, Match, MatchStatus, Play, PlayType
from .timeline import Change, MatchTimeline, TimelineEvent, Visible

_LOGGER = logging.getLogger(__name__)

STATUS_EVENTS = {
    MatchStatus.FIRST_HALF: "kickoff",
    MatchStatus.HALF_TIME: "half_time",
    MatchStatus.SECOND_HALF: "second_half",
    MatchStatus.EXTRA_TIME: "extra_time",
    MatchStatus.FINISHED: "full_time",
}
SUBS = (PlayType.SUB_ON, PlayType.SUB_OFF)

type RugbyLiveConfigEntry = ConfigEntry[RugbyLiveCoordinator]


@dataclass
class MatchView:
    """A match as the user may see it right now (after the delay)."""

    match: Match
    competition: str
    visible: Visible

    @property
    def status(self) -> MatchStatus:
        if self.visible.status is not None:
            return self.visible.status
        return MatchStatus.SCHEDULED if self.match.state == "pre" else MatchStatus.UNKNOWN

    @property
    def live(self) -> bool:
        return self.status in LIVE_STATUSES


class RugbyLiveCoordinator(DataUpdateCoordinator[None]):
    """Polls ESPN and owns the per-match timelines."""

    config_entry: RugbyLiveConfigEntry

    def __init__(
        self, hass: HomeAssistant, entry: RugbyLiveConfigEntry, client: EspnClient
    ) -> None:
        self.options = {**DEFAULT_OPTIONS, **entry.options}
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=DOMAIN,
            update_interval=timedelta(seconds=self.options[CONF_POLL_IDLE]),
        )
        self.client = client
        self.competitions: dict[str, str] = {
            key: COMPETITIONS[key]
            for key in entry.options.get(CONF_COMPETITIONS, entry.data[CONF_COMPETITIONS])
            if key in COMPETITIONS
        }
        self.favorites: dict[str, str] = dict(
            entry.options.get(CONF_FAVORITES, entry.data.get(CONF_FAVORITES, {}))
        )
        self.delay: float = 0.0
        self.followed_id: str | None = None  # None: automatic
        self.animation: dict[str, Any] | None = None  # playing now on the followed match
        self._anim_queue: list[dict[str, Any]] = []
        self._anim_unsub: CALLBACK_TYPE | None = None
        self.matches: dict[str, Match] = {}  # current scoreboards (today / next match day)
        self.fixtures: dict[str, Match] = {}  # FIXTURE_DAYS ahead
        self.channels: dict[str, str] = {}  # match id -> TV channel (broadcast calendar)
        self.timelines: dict[str, MatchTimeline] = {}
        self._seen_this_run: set[str] = set()
        self._finished_at: dict[str, datetime] = {}
        self._fixtures_at: datetime | None = None
        self._release_unsub: CALLBACK_TYPE | None = None
        self._store: Store[dict[str, Any]] = Store(hass, STORE_VERSION, STORE_KEY)
        self.errors = 0
        self.last_error: str | None = None
        self.last_success: datetime | None = None

    # ------------------------------------------------------------------ setup

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        for raw in data.get("timelines", {}).values():
            try:
                tl = MatchTimeline.from_dict(raw)
            except KeyError, TypeError, ValueError:
                continue
            self.timelines[tl.match_id] = tl

    @callback
    def async_shutdown_timers(self) -> None:
        if self._release_unsub:
            self._release_unsub()
            self._release_unsub = None
        if self._anim_unsub:
            self._anim_unsub()
            self._anim_unsub = None

    def competition_of(self, match: Match) -> str:
        return next((k for k, lid in self.competitions.items() if lid == match.league_id), "")

    # ----------------------------------------------------------------- polling

    async def _async_update_data(self) -> None:
        now = dt_util.utcnow()
        if self._fixtures_at is None or now - self._fixtures_at >= FIXTURE_REFRESH:
            self._fixtures_at = now
            self.config_entry.async_create_background_task(
                self.hass, self._async_scan_fixtures(), f"{DOMAIN}_fixtures"
            )
        try:
            fresh: dict[str, Match] = {}
            for league in self.competitions.values():
                for match in await self.client.scoreboard(league):
                    fresh[match.id] = match
                    self._ingest_match(match, now)
            self.matches = fresh
            for match in fresh.values():
                if self._wants_plays(match, now):
                    plays = await self.client.plays(match.league_id, match.id)
                    self._ingest_plays(match, plays, dt_util.utcnow())
        except EspnError as err:
            self.errors += 1
            self.last_error = str(err)
            self.update_interval = self._backoff()
            raise UpdateFailed(str(err)) from err

        self.errors, self.last_error, self.last_success = 0, None, now
        self._prune()
        self._release(dt_util.utcnow())
        self.update_interval = self._interval(now)
        self._store.async_delay_save(self._store_data, 10)

    def _ingest_match(self, match: Match, now: datetime) -> None:
        tl = self.timelines.get(match.id)
        if tl is None:
            tl = self.timelines[match.id] = MatchTimeline(match.id, match.home.id, match.away.id)
        catch_up = match.id not in self._seen_this_run and match.state != "pre"
        if match.state == "pre":
            self._seen_this_run.add(match.id)  # later changes are live news
        tl.ingest_status(match.status, now, catch_up)
        tl.ingest_score(match.home_score, match.away_score, now, catch_up)
        if match.status == MatchStatus.FINISHED and match.id in self._seen_this_run:
            self._finished_at.setdefault(match.id, now)  # follow late corrections

    def _wants_plays(self, match: Match, now: datetime) -> bool:
        if not match.play_by_play:
            return False  # score only, no guessed events (docs/02)
        if match.state == "in":
            return True
        grace = timedelta(minutes=self.options[CONF_POSTMATCH_GRACE])
        finished = self._finished_at.get(match.id)
        return match.state == "post" and finished is not None and now - finished < grace

    def _ingest_plays(self, match: Match, plays: list[Play], now: datetime) -> None:
        tl = self.timelines[match.id]
        catch_up = match.id not in self._seen_this_run
        self._seen_this_run.add(match.id)
        new, revoked = tl.ingest_plays(plays, now, catch_up)
        for ev in new:
            if not ev.catch_up and self._publishable(ev):
                self.hass.bus.async_fire(EVENT_RAW, self._payload(match, ev, now))
        for ev in revoked:
            if ev.released and self._publishable(ev):
                payload = {**self._payload(match, ev, now), "revoked_type": ev.type.value}
                self.hass.bus.async_fire(EVENT_REVOKED, payload)
                async_dispatcher_send(self.hass, SIGNAL_EVENT, {**payload, "type": "revoked"})
                self._animate({**payload, "type": "revoked"})

    async def _async_scan_fixtures(self) -> None:
        """Upcoming matches, day by day (ESPN refuses date ranges: docs/01)."""
        today = dt_util.utcnow().date()
        found: dict[str, Match] = {}
        try:
            for league in self.competitions.values():
                for offset in range(-3, FIXTURE_DAYS):  # recent results for the matchday
                    day = today + timedelta(days=offset)
                    for match in await self.client.scoreboard(league, day):
                        found[match.id] = match
        except EspnError as err:
            _LOGGER.debug("Fixture scan failed: %s", err)
            self._fixtures_at = None  # retry at next poll
            return
        self.fixtures = found
        await self._async_load_channels()
        self.async_update_listeners()

    async def _async_load_channels(self) -> None:
        """TV channels from the optional broadcast calendar: the event location of the
        calendar entry starting within 15 min of kickoff and naming one of the teams."""
        calendar = self.options.get(CONF_BROADCAST_CALENDAR)
        if not calendar:
            return
        try:
            response = await self.hass.services.async_call(
                "calendar",
                "get_events",
                {"entity_id": calendar, "duration": {"days": FIXTURE_DAYS}},
                blocking=True,
                return_response=True,
            )
        except HomeAssistantError as err:
            _LOGGER.debug("Broadcast calendar unavailable: %s", err)
            return
        events = (response or {}).get(calendar, {}).get("events", [])
        for match in {**self.fixtures, **self.matches}.values():
            for event in events:
                start = dt_util.parse_datetime(str(event.get("start", "")))
                if (
                    event.get("location")
                    and start is not None
                    and abs(start - match.kickoff) <= timedelta(minutes=15)
                    and names_match(event.get("summary", ""), match.home.name, match.away.name)
                ):
                    self.channels[match.id] = event["location"]

    def _prune(self) -> None:
        self.timelines = {k: v for k, v in self.timelines.items() if k in self.matches}

    def _interval(self, now: datetime) -> timedelta:
        opts = self.options
        if any(m.state == "in" for m in self.matches.values()):
            return timedelta(seconds=opts[CONF_POLL_LIVE])
        if any(self._wants_plays(m, now) for m in self.matches.values()):
            return timedelta(seconds=60)
        window = timedelta(minutes=opts[CONF_PREMATCH_WINDOW])
        upcoming = [
            m.kickoff
            for m in (*self.matches.values(), *self.fixtures.values())
            if m.state == "pre" and m.kickoff > now - timedelta(hours=3)
        ]
        if any(k - window <= now for k in upcoming):
            return timedelta(seconds=opts[CONF_POLL_PREMATCH])
        idle = timedelta(seconds=opts[CONF_POLL_IDLE])
        if upcoming:  # wake up in time for the pre-match window
            idle = min(idle, max(min(upcoming) - window - now, timedelta(seconds=30)))
        return idle

    def _backoff(self) -> timedelta:
        base = self.update_interval.total_seconds() if self.update_interval else 60
        seconds = min(base * 2, 600) * random.uniform(0.8, 1.2)
        return timedelta(seconds=max(seconds, self.options[CONF_POLL_LIVE]))

    # ----------------------------------------------------------------- release

    def _release(self, now: datetime) -> None:
        for match_id, tl in self.timelines.items():
            match = self.matches.get(match_id)
            if match is None:
                continue
            for item in tl.due(now, self.delay):
                payload = self._item_payload(match, item, now)
                if payload is not None:
                    self.hass.bus.async_fire(EVENT_DELAYED, payload)
                    async_dispatcher_send(self.hass, SIGNAL_EVENT, payload)
                    self._animate(payload)
        self._schedule_release()

    def _schedule_release(self) -> None:
        self.async_shutdown_timers()
        times = [t for tl in self.timelines.values() if (t := tl.next_release(self.delay))]
        if times:
            self._release_unsub = async_track_point_in_utc_time(
                self.hass, self._on_release_timer, min(times)
            )

    @callback
    def _on_release_timer(self, _now: datetime) -> None:
        self._release_unsub = None
        self._release(dt_util.utcnow())
        self.async_update_listeners()

    def _animate(self, payload: dict[str, Any]) -> None:
        """Queue an animation for the followed match: each one plays its full duration."""
        followed = self.followed_match()
        if followed is None or payload.get("match_id") != followed.id:
            return
        if payload["type"] not in ANIMATED_EVENTS or len(self._anim_queue) >= ANIMATION_QUEUE_MAX:
            return
        self._anim_queue.append(payload)
        if self.animation is None:
            self._next_animation()

    @callback
    def _next_animation(self, _now: datetime | None = None) -> None:
        self._anim_unsub = None
        if not self._anim_queue:
            self.animation = None
        else:
            now = dt_util.utcnow()
            seconds = self.options[CONF_ANIMATION_SECONDS]
            self.animation = {
                **self._anim_queue.pop(0),
                "started_at": now.isoformat(),
                "ends_at": (now + timedelta(seconds=seconds)).isoformat(),
                "duration": seconds,
                "queued": len(self._anim_queue),
            }
            self._anim_unsub = async_call_later(self.hass, seconds, self._next_animation)
        self.async_update_listeners()

    @callback
    def async_set_delay(self, seconds: float) -> None:
        self.delay = float(max(0, min(MAX_DELAY, seconds)))
        self._release(dt_util.utcnow())  # a shorter delay releases due items at once
        self.async_update_listeners()

    def _publishable(self, ev: TimelineEvent) -> bool:
        if ev.type in SUBS:
            return self.options[CONF_SHOW_SUBSTITUTIONS] and ev.type == PlayType.SUB_ON
        return True

    def _item_payload(
        self, match: Match, item: TimelineEvent | Change, now: datetime
    ) -> dict[str, Any] | None:
        if isinstance(item, TimelineEvent):
            return self._payload(match, item, now) if self._publishable(item) else None
        etype = STATUS_EVENTS.get(item.value)
        if etype is None:
            return None
        return {**self._base_payload(match, now, item.observed_at), "type": etype}

    def _base_payload(self, match: Match, now: datetime, observed: datetime) -> dict[str, Any]:
        tl = self.timelines.get(match.id)
        score = tl.scores[-1].value if tl and tl.scores else (match.home_score, match.away_score)
        return {
            "competition": self.competition_of(match),
            "match_id": match.id,
            "home_id": match.home.id,
            "away_id": match.away.id,
            "home_name": match.home.name,
            "away_name": match.away.name,
            "score_home": score[0],
            "score_away": score[1],
            "favorite": bool({match.home.id, match.away.id} & set(self.favorites)),
            "delay_seconds": self.delay,
            "observed_at": observed.isoformat(),
            "released_at": now.isoformat(),
            "source": "espn",
        }

    def _payload(self, match: Match, ev: TimelineEvent, now: datetime) -> dict[str, Any]:
        names = {match.home.id: match.home.name, match.away.id: match.away.name}
        return {
            **self._base_payload(match, now, ev.observed_at),
            "event_key": ev.key,
            "type": "substitution" if ev.type in SUBS else ev.type.value,
            "team_id": ev.team_id,
            "team_name": names.get(ev.team_id or ""),
            "side": match.side_of(ev.team_id),
            "player": match.athletes.get(ev.athlete_id or ""),
            "minute": ev.minute,
            "period": ev.period,
        }

    # -------------------------------------------------------------------- views

    def view(self, match: Match, now: datetime | None = None) -> MatchView:
        now = now or dt_util.utcnow()
        tl = self.timelines.get(match.id)
        if tl is None:
            # Fixtures only (past or future match days): the scoreboard is all we have.
            status = None if match.state == "pre" else match.status
            visible = Visible(
                status,
                match.home_score,
                match.away_score,
                [],
                None,
                None,
                False,
                {"home": [], "away": []},
            )
        else:
            sinbin = self.options[CONF_SINBIN_MINUTES] * 60
            visible = tl.visible(now, self.delay, match.kickoff, sinbin)
        return MatchView(match, self.competition_of(match), visible)

    def team_match(self, team_id: str) -> Match | None:
        """The team's current match: live first, then upcoming, then finished."""
        mine = [m for m in self.matches.values() if team_id in (m.home.id, m.away.id)]
        order = {"in": 0, "pre": 1, "post": 2}
        return min(mine, key=lambda m: (order.get(m.state, 3), m.kickoff), default=None)

    def matchday(self, match: Match) -> list[Match]:
        """Matches of the same competition round as `match`. ESPN has no round number:
        a round is a run of the league's matches with less than 36 h between kickoffs."""
        pool = {**self.fixtures, **self.matches}
        league = sorted(
            (m for m in pool.values() if m.league_id == match.league_id), key=lambda m: m.kickoff
        )
        rounds: list[list[Match]] = []
        for m in league:
            if rounds and m.kickoff - rounds[-1][-1].kickoff < timedelta(hours=36):
                rounds[-1].append(m)
            else:
                rounds.append([m])
        return next((r for r in rounds if any(m.id == match.id for m in r)), [match])

    def followed_match(self) -> Match | None:
        """Match picked with the select entity. Automatic: a favourite's live or upcoming
        match, else the first live match, else the next one, else the latest finished."""
        if self.followed_id and self.followed_id in self.matches:
            return self.matches[self.followed_id]
        for team_id in self.favorites:
            match = self.team_match(team_id)
            if match is not None and match.state != "post":
                return match
        order = {"in": 0, "pre": 1, "post": 2}

        def rank(m: Match) -> tuple[int, float]:
            stamp = m.kickoff.timestamp()
            return order.get(m.state, 3), -stamp if m.state == "post" else stamp

        return min(self.matches.values(), key=rank, default=None)

    @callback
    def async_follow(self, match_id: str | None) -> None:
        self.followed_id = match_id
        self.async_update_listeners()

    def next_match(self, team_id: str | None = None, league: str | None = None) -> Match | None:
        now = dt_util.utcnow()
        upcoming = [
            m
            for m in {**self.fixtures, **self.matches}.values()
            if m.state == "pre"
            and m.kickoff > now
            and (team_id is None or team_id in (m.home.id, m.away.id))
            and (league is None or m.league_id == league)
        ]
        return min(upcoming, key=lambda m: m.kickoff, default=None)

    def last_released(self, team_ids: set[str] | None = None) -> TimelineEvent | None:
        """Most recent visible, non catch-up event (for the calibrate button)."""
        best = None
        for match_id, tl in self.timelines.items():
            match = self.matches.get(match_id)
            if match is None or (team_ids and not team_ids & {match.home.id, match.away.id}):
                continue
            for ev in tl.events.values():
                if not ev.released or ev.catch_up:
                    continue
                if best is None or ev.observed_at > best.observed_at:
                    best = ev
        return best

    def _store_data(self) -> dict[str, Any]:
        return {"timelines": {k: tl.to_dict() for k, tl in self.timelines.items()}}
