"""Binary sensors of a favourite team: playing now, player in the sin bin."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import TeamEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        cls(coordinator, team_id, name)
        for team_id, name in coordinator.favorites.items()
        for cls in (PlayingSensor, SinBinSensor)
    )


class PlayingSensor(TeamEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.RUNNING

    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str, name: str) -> None:
        super().__init__(coordinator, team_id, name, "playing")

    @property
    def is_on(self) -> bool:
        view = self.view
        return bool(view and view.live)


class SinBinSensor(TeamEntity, BinarySensorEntity):
    """On while a player of the team serves a yellow card (sin bin)."""

    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str, name: str) -> None:
        super().__init__(coordinator, team_id, name, "sin_bin")

    def _cards(self) -> dict[str, list[dict[str, Any]]]:
        view = self.view
        out: dict[str, list[dict[str, Any]]] = {"team": [], "opponent": []}
        if view is None:
            return out
        sinbin = self.coordinator.options["sinbin_minutes"]
        for cards in view.visible.sin_bin.values():
            for ev in cards:
                out[self.side(ev.team_id) or "opponent"].append(
                    {
                        "name": view.match.athletes.get(ev.athlete_id or ""),
                        "since_minute": ev.minute,
                        "until_minute": ev.minute + sinbin,
                    }
                )
        return out

    @property
    def is_on(self) -> bool:
        return bool(self._cards()["team"])

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        cards = self._cards()
        return {"players": cards["team"], "opponent_players": cards["opponent"]}
