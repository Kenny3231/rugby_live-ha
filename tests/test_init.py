"""Setup test with a mocked ESPN client (runs on Linux / CI only)."""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import timedelta
from pathlib import Path
from unittest.mock import AsyncMock, patch

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.rugby_live.api import parse_plays, parse_scoreboard
from custom_components.rugby_live.const import CONF_COMPETITIONS, CONF_FAVORITES, DOMAIN

FIXTURES = Path(__file__).parents[1] / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


async def test_setup_creates_stable_entities(hass: HomeAssistant) -> None:
    matches = parse_scoreboard(_load("top14_scoreboard_2026-10-10.json"), "270559")
    plays = parse_plays(_load("top14_604399_plays.json"))
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_COMPETITIONS: ["top14"], CONF_FAVORITES: {"25921": "Stade Francais Paris"}},
    )
    entry.add_to_hass(hass)
    with (
        patch("custom_components.rugby_live.EspnClient") as client_cls,
        patch("custom_components.rugby_live.coordinator.lnr_players", AsyncMock(return_value=[])),
    ):
        client = client_cls.return_value
        client.scoreboard = AsyncMock(return_value=matches)
        client.plays = AsyncMock(return_value=plays)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done(wait_background_tasks=True)

    # The live match seen at startup is a catch-up: visible at once, no event emitted.
    live = hass.states.get("sensor.top_14_live_matches")
    assert live is not None and live.state == "1"
    assert len(live.attributes["matches"]) == 2
    score = hass.states.get("sensor.stade_francais_paris_score")
    assert score.state == "23 - 15"
    assert hass.states.get("sensor.stade_francais_paris_match_status").state == "second_half"
    assert hass.states.get("binary_sensor.stade_francais_paris_playing").state == "on"
    last = hass.states.get("sensor.stade_francais_paris_last_event")
    assert last.state.startswith("Conversion")
    assert hass.states.get("number.rugby_live_delay").state == "0.0"

    await hass.services.async_call(
        DOMAIN, "set_delay", {"seconds": 30, "relative": True}, blocking=True
    )
    assert hass.states.get("number.rugby_live_delay").state == "30.0"

    # The undated scoreboard can lag a match day: a fixture due now is fetched by date.
    coordinator = entry.runtime_data
    now = dt_util.utcnow()
    soon = replace(matches[1], id="tonight", kickoff=now + timedelta(minutes=10))
    later = replace(matches[1], id="later", kickoff=now + timedelta(hours=5))
    coordinator.fixtures = {m.id: m for m in (soon, later)}
    assert coordinator._lagging_days("270559", set(), now) == [soon.kickoff.date()]
    assert coordinator._lagging_days("270559", {"tonight"}, now) == []
    assert coordinator._lagging_days("271937", set(), now) == []

    assert await hass.config_entries.async_unload(entry.entry_id)
