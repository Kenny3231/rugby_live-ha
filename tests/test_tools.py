"""Tests for the dev tools: recorder dedup and replay selection."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "tools"))

from record_match import Recorder
from replay_server import Capture, route


def test_recorder_writes_only_changed_bodies_and_replay_follows_time(tmp_path: Path) -> None:
    rec = Recorder(tmp_path)
    rec.save("scoreboard", "", b'{"v":1}')
    rec.save("scoreboard", "", b'{"v":1}')  # unchanged -> skipped
    rec.save("plays", "42", b'{"items":[]}')
    rec.save("scoreboard", "", b'{"v":2}')
    rec.index.close()

    cap = Capture(tmp_path)
    assert len(cap.entries[("scoreboard", "")]) == 2
    first, second = (t for t, _ in cap.entries[("scoreboard", "")])
    key = ("scoreboard", "")
    assert cap.select(key, first - timedelta(seconds=1)) is None
    assert cap.select(key, first) == "00001_scoreboard_all.json"
    assert cap.select(key, second) == "00003_scoreboard_all.json"
    assert cap.select(("plays", "7"), datetime.max.replace(tzinfo=first.tzinfo)) is None


def test_route_maps_both_espn_hosts() -> None:
    assert route("/apis/site/v2/sports/rugby/270559/scoreboard?dates=20261010") == (
        "scoreboard",
        "",
    )
    plays = "/v2/sports/rugby/leagues/270559/events/604399/competitions/604399/plays?limit=400"
    assert route(plays) == ("plays", "604399")
    assert route("/v2/sports/rugby/athletes/1") is None
