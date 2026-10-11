"""Rugby Live: near real-time rugby scores and match events for Home Assistant."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

import voluptuous as vol
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
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
    Platform.SELECT,
    Platform.SENSOR,
]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
CARDS_URL = f"/{DOMAIN}/rugby-live-cards.js"
CARDS_FILE = Path(__file__).parent / "frontend" / "rugby-live-cards.js"  # built from frontend/
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
    await _async_register_cards(hass)
    return True


async def _async_register_cards(hass: HomeAssistant) -> None:
    """Serve the Lovelace cards and load them in every dashboard (no resource to add).
    Skipped without the frontend (tests); the URL changes with the file to bust caches."""
    if hass.http is None or "frontend" not in hass.config.components:
        return
    digest = await hass.async_add_executor_job(
        lambda: hashlib.sha256(CARDS_FILE.read_bytes()).hexdigest()[:8]
    )
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARDS_URL, str(CARDS_FILE), cache_headers=True)]
    )
    add_extra_js_url(hass, f"{CARDS_URL}?v={digest}")


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
