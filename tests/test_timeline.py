"""Timeline engine tests. Correction scenarios use the real ESPN ids seen on 2026-10-10."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from custom_components.rugby_live.models import MatchStatus, Play, PlayType
from custom_components.rugby_live.timeline import REVOKE_GRACE, MatchTimeline

T0 = datetime(2026, 10, 10, 14, 50, tzinfo=UTC)
KICKOFF = datetime(2026, 10, 10, 14, 36, 36, tzinfo=UTC)
HOME, AWAY = "270567", "25916"  # Pau - Castres


def at(seconds: float) -> datetime:
    return T0 + timedelta(seconds=seconds)


def play(pid, ptype, team, clock, h, a, period=1, athlete=None) -> Play:
    return Play(pid, ptype, team, period, clock, h, a, athlete)


def emitted(tl: MatchTimeline, now: datetime, delay: float = 0) -> list[str]:
    return [i.key for i in tl.due(now, delay) if hasattr(i, "key")]


def test_recreated_play_keeps_identity_and_is_emitted_once() -> None:
    """Pau-Castres 15': try 1895716 deleted and recreated as 1895727 (clock 884 -> 858)."""
    tl = MatchTimeline("604400", HOME, AWAY)
    base = [play("1895681", PlayType.PENALTY_GOAL, AWAY, 380, 0, 3)]
    new, _ = tl.ingest_plays([*base, play("1895716", PlayType.TRY, AWAY, 884, 3, 8)], at(0))
    assert len(new) == 2 and len(emitted(tl, at(0))) == 2

    new, revoked = tl.ingest_plays([*base, play("1895727", PlayType.TRY, AWAY, 858, 3, 8)], at(21))
    assert new == [] and revoked == []
    assert emitted(tl, at(21)) == []
    (try_ev,) = [ev for ev in tl.events.values() if ev.type == PlayType.TRY]
    assert try_ev.play_id == "1895727" and try_ev.observed_at == at(0)


def test_cancelled_try_is_revoked_and_score_goes_back() -> None:
    """Toulon-Racing 40': try 1895810 (14-12) removed by ESPN; scoreboard back to 14-7."""
    tl = MatchTimeline("604401", "25986", "99855")
    before = [play("1895754", PlayType.CONVERSION, "99855", 1797, 14, 7)]
    tl.ingest_plays(before, at(0), catch_up=True)
    tl.ingest_score(14, 7, at(0), catch_up=True)
    tl.ingest_plays([*before, play("1895810", PlayType.TRY, "99855", 2360, 14, 12)], at(10))
    tl.ingest_score(14, 12, at(10))
    assert emitted(tl, at(10)) and tl.visible(at(10), 0, KICKOFF).away_score == 12

    tl.ingest_score(14, 7, at(20))
    assert tl.visible(at(20), 0, KICKOFF).away_score == 7  # score follows the scoreboard
    revoked = []
    for t in range(20, 20 + int(REVOKE_GRACE.total_seconds()) + 10, 10):
        revoked += tl.ingest_plays(before, at(t))[1]
    assert [ev.play_id for ev in revoked] == ["1895810"]
    assert all(ev.type != PlayType.TRY for ev in tl.visible(at(300), 0, KICKOFF).events)


def test_late_recreation_of_yellow_card() -> None:
    """Toulon-Racing 7': yellow 1895680 recreated as 1895917 (clock 390 -> 385) much later."""
    tl = MatchTimeline("604401", "25986", "99855")
    tl.ingest_plays([play("1895680", PlayType.YELLOW_CARD, "25986", 390, 0, 0)], at(0))
    new, revoked = tl.ingest_plays(
        [play("1895917", PlayType.YELLOW_CARD, "25986", 385, 0, 0)], at(3000)
    )
    assert new == [] and revoked == [] and len(tl.events) == 1


def test_reentered_half_follows_the_athlete() -> None:
    """Perpignan-Vannes 2nd half: yellow card of athlete 306786 entered 4 times
    (clock 3791 -> 3978 -> 4142 -> 4023), with a 98 s gap between two versions."""
    tl = MatchTimeline("604396", "25920", "289337")
    versions = [
        ("1896188", 3791, 0),
        ("1896192", 3978, 16),
        ("1896202", 4142, 114),
        ("1896228", 4023, 210),
    ]
    news = []
    for pid, clock, t in versions:
        card = play(pid, PlayType.YELLOW_CARD, "289337", clock, 14, 12, period=2, athlete="306786")
        news += tl.ingest_plays([card], at(t))[0]
        tl.ingest_plays([], at(t + 50))  # absent between versions
    assert len(news) == 1 and len(tl.events) == 1
    assert next(iter(tl.events.values())).play_id == "1896228"


def test_revoked_event_restored_from_graveyard() -> None:
    tl = MatchTimeline("604398", "143736", "119318")
    tl.ingest_plays([play("1896035", PlayType.PENALTY_GOAL, "143736", 2903, 16, 21, 2)], at(0))
    revoked = tl.ingest_plays([], at(1))[1] + tl.ingest_plays([], at(200))[1]
    assert len(revoked) == 1 and tl.events == {}
    new, _ = tl.ingest_plays(
        [play("1896154", PlayType.PENALTY_GOAL, "143736", 2941, 16, 21, 2)], at(260)
    )
    assert new == [] and len(tl.events) == 1


def test_delay_holds_back_events_score_and_status() -> None:
    tl = MatchTimeline("604400", HOME, AWAY)
    tl.ingest_status(MatchStatus.FIRST_HALF, at(0))
    tl.ingest_plays([play("1", PlayType.TRY, HOME, 600, 5, 0)], at(100))
    tl.ingest_score(5, 0, at(100))

    hidden = tl.visible(at(120), 60, KICKOFF)
    assert (hidden.home_score, hidden.events) == (0, [])
    assert tl.next_release(60) == at(60)
    assert len(tl.due(at(120), 60)) == 1  # the status change only

    shown = tl.visible(at(160), 60, KICKOFF)
    assert shown.home_score == 5 and [e.play_id for e in shown.events] == ["1"]
    assert emitted(tl, at(160), 60) == ["604400-1"]
    assert emitted(tl, at(500), 60) == []  # once only

    # Increasing the delay hides it again but never re-emits.
    assert tl.visible(at(160), 120, KICKOFF).home_score == 0
    assert emitted(tl, at(400), 120) == []


def test_catch_up_is_visible_but_never_emitted() -> None:
    tl = MatchTimeline("604400", HOME, AWAY)
    tl.ingest_status(MatchStatus.SECOND_HALF, at(0), catch_up=True)
    tl.ingest_score(5, 0, at(0), catch_up=True)
    tl.ingest_plays([play("1", PlayType.TRY, HOME, 3000, 5, 0, period=2)], at(0), catch_up=True)
    assert tl.due(at(0), 300) == []
    vis = tl.visible(at(0), 300, KICKOFF)
    assert vis.home_score == 5 and vis.status is MatchStatus.SECOND_HALF


def test_minute_and_stoppage() -> None:
    tl = MatchTimeline("604400", HOME, AWAY)
    tl.ingest_status(MatchStatus.FIRST_HALF, at(0))
    tl.ingest_plays([play("1", PlayType.YELLOW_CARD, AWAY, 1200, 0, 0)], at(0))
    vis = tl.visible(at(60), 0, KICKOFF)
    assert vis.minute == 22 and vis.minute_source == "play_clock"
    late = tl.visible(at(2000), 0, KICKOFF)
    assert late.minute == 40 and late.stoppage


def test_round_trip_persistence() -> None:
    tl = MatchTimeline("604400", HOME, AWAY)
    tl.ingest_status(MatchStatus.FIRST_HALF, at(0))
    tl.ingest_plays([play("1", PlayType.TRY, HOME, 600, 5, 0)], at(5))
    tl.ingest_score(5, 0, at(5))
    tl.due(at(5), 0)
    clone = MatchTimeline.from_dict(tl.to_dict())
    assert clone.to_dict() == tl.to_dict()
    assert clone.visible(at(9), 0, KICKOFF) == tl.visible(at(9), 0, KICKOFF)
    clone.ingest_plays([play("2", PlayType.CONVERSION, HOME, 640, 7, 0)], at(9))
    assert next(reversed(clone.events)) == "604400-2"


def test_minute_follows_play_clock_not_scheduled_kickoff() -> None:
    """Clermont-UBB 10/10: scheduled 19:00, real kickoff 19:02:23. A penalty at clock 120 s
    seen 15 s later must give minute 4 a minute later, not the scheduled-time minute 6."""
    scheduled = datetime(2026, 10, 10, 19, 0, tzinfo=UTC)
    seen = datetime(2026, 10, 10, 19, 4, 38, tzinfo=UTC)
    tl = MatchTimeline("604397", "25917", "143737")
    tl.ingest_status(MatchStatus.FIRST_HALF, datetime(2026, 10, 10, 19, 1, 39, tzinfo=UTC))
    tl.ingest_plays([play("1", PlayType.PENALTY_GOAL, "143737", 120, 0, 3)], seen)
    vis = tl.visible(seen + timedelta(seconds=60), 0, scheduled)
    assert (vis.minute, vis.minute_source) == (4, "play_clock")


def test_score_is_pre_shot_then_confirmed() -> None:
    tl = MatchTimeline("604400", HOME, AWAY)
    tl.ingest_score(3, 3, at(0))
    tl.ingest_plays([play("1", PlayType.TRY, AWAY, 884, 3, 8)], at(10))
    vis = tl.visible(at(10), 0, KICKOFF)
    assert (vis.home_score, vis.away_score, vis.provisional) == (3, 8, True)
    tl.ingest_score(3, 8, at(20))
    vis = tl.visible(at(20), 0, KICKOFF)
    assert (vis.home_score, vis.away_score, vis.provisional) == (3, 8, False)
