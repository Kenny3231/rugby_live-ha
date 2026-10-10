"""Calibrate button: "I just saw the last event on TV" -> delay = now - observed_at."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.components.button import ButtonEntity
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import GLOBAL_DEVICE, RugbyLiveEntity

RECENT = timedelta(minutes=5)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([CalibrateButton(entry.runtime_data)])


class CalibrateButton(RugbyLiveEntity, ButtonEntity):
    def __init__(self, coordinator: RugbyLiveCoordinator) -> None:
        super().__init__(coordinator, GLOBAL_DEVICE, "calibrate")

    @property
    def available(self) -> bool:
        return True

    async def async_press(self) -> None:
        now = dt_util.utcnow()
        favorites = set(self.coordinator.favorites) or None
        ev = self.coordinator.last_released(favorites)
        limit = RECENT + timedelta(seconds=self.coordinator.delay)
        if ev is None or now - ev.observed_at > limit:
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key="calibrate_no_recent_event"
            )
        self.coordinator.async_set_delay((now - ev.observed_at).total_seconds())
