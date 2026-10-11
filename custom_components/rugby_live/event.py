"""Event entity of a favourite team: fires on each released (delayed) match event."""

from __future__ import annotations

from typing import Any

from homeassistant.components.event import EventEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import SIGNAL_EVENT
from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import TeamEntity

EVENT_TYPES = [
    "kickoff",
    "try",
    "conversion",
    "penalty_goal",
    "drop_goal",
    "yellow_card",
    "red_card",
    "substitution",
    "half_time",
    "second_half",
    "extra_time",
    "full_time",
    "revoked",
]
KEPT = (
    "competition",
    "team_id",
    "match_id",
    "team_name",
    "player",
    "player_photo",
    "minute",
    "score_home",
    "score_away",
    "home_name",
    "away_name",
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    teams: list[tuple[str | None, str]] = [*coordinator.favorites.items(), (None, "")]
    async_add_entities(
        MatchEventEntity(coordinator, team_id, name)
        for team_id, name in teams  # None: the "Match suivi" device
    )


class MatchEventEntity(TeamEntity, EventEntity):
    _attr_event_types = EVENT_TYPES

    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str) -> None:
        super().__init__(coordinator, team_id, name, "match_event")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_EVENT, self._on_event))

    @callback
    def _on_event(self, payload: dict[str, Any]) -> None:
        if self.team_id is None:
            match = self.current_match()
            if match is None or payload.get("match_id") != match.id:
                return
        elif self.team_id not in (payload.get("home_id"), payload.get("away_id")):
            return
        if payload["type"] not in EVENT_TYPES:
            return
        attrs = {k: payload.get(k) for k in KEPT}
        attrs["side"] = self.side(payload.get("team_id"))
        self._trigger_event(payload["type"], attrs)
        self.async_write_ha_state()
