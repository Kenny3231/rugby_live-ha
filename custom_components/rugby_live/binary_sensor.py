"""Binary sensor of a favourite team: playing now."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import TeamEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    # The sin bin sensor was removed in 0.3.0: drop it instead of leaving it unavailable.
    registry = er.async_get(hass)
    for ent in er.async_entries_for_config_entry(registry, entry.entry_id):
        if ent.domain == "binary_sensor" and ent.unique_id.endswith("_sin_bin"):
            registry.async_remove(ent.entity_id)
    coordinator = entry.runtime_data
    teams: list[tuple[str | None, str]] = [*coordinator.favorites.items(), (None, "")]
    async_add_entities(
        PlayingSensor(coordinator, team_id, name)
        for team_id, name in teams  # None: the "Match suivi" device
    )


class PlayingSensor(TeamEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.RUNNING

    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str) -> None:
        super().__init__(coordinator, team_id, name, "playing")

    @property
    def is_on(self) -> bool:
        view = self.view
        return bool(view and view.live)
