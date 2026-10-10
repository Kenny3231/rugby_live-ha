"""Rugby Live: near real-time rugby scores and match events for Home Assistant."""

from __future__ import annotations

import os

import voluptuous as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import EspnClient
from .const import DOMAIN, ENV_BASE_URL
from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator

PLATFORMS = [
    Platform.BINARY_SENSOR,
    Platform.BUTTON,
    Platform.CALENDAR,
    Platform.EVENT,
    Platform.NUMBER,
    Platform.SENSOR,
]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
SET_DELAY_SCHEMA = vol.Schema(
    {
        vol.Required("seconds"): vol.Coerce(float),
        vol.Optional("relative", default=False): cv.boolean,
    }
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the set_delay service."""

    async def set_delay(call: ServiceCall) -> None:
        for entry in hass.config_entries.async_entries(DOMAIN):
            if entry.state is not ConfigEntryState.LOADED:
                continue
            coordinator: RugbyLiveCoordinator = entry.runtime_data
            seconds = call.data["seconds"]
            if call.data["relative"]:
                seconds += coordinator.delay
            coordinator.async_set_delay(seconds)

    hass.services.async_register(DOMAIN, "set_delay", set_delay, schema=SET_DELAY_SCHEMA)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: RugbyLiveConfigEntry) -> bool:
    """Set up Rugby Live from a config entry."""
    # The base URL override is a dev hook for tools/replay_server.py, never set from the UI.
    client = EspnClient(async_get_clientsession(hass), os.environ.get(ENV_BASE_URL))
    coordinator = RugbyLiveCoordinator(hass, entry, client)
    await coordinator.async_load()
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator
    entry.async_on_unload(coordinator.async_shutdown_timers)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: RugbyLiveConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
