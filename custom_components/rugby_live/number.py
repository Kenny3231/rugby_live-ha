"""Delay (seconds) between the data and what the user sees: the source of truth."""

from __future__ import annotations

from homeassistant.components.number import NumberMode, RestoreNumber
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import MAX_DELAY
from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import GLOBAL_DEVICE, RugbyLiveEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([DelayNumber(entry.runtime_data)])


class DelayNumber(RugbyLiveEntity, RestoreNumber):
    _attr_native_min_value = 0
    _attr_native_max_value = MAX_DELAY
    _attr_native_step = 1
    _attr_mode = NumberMode.BOX
    _attr_native_unit_of_measurement = UnitOfTime.SECONDS

    def __init__(self, coordinator: RugbyLiveCoordinator) -> None:
        super().__init__(coordinator, GLOBAL_DEVICE, "delay")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_number_data()
        if last is not None and last.native_value is not None:
            self.coordinator.async_set_delay(last.native_value)

    @property
    def available(self) -> bool:
        return True

    @property
    def native_value(self) -> float:
        return self.coordinator.delay

    async def async_set_native_value(self, value: float) -> None:
        self.coordinator.async_set_delay(value)
