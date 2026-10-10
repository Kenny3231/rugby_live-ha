"""Config flow (competitions, favourite teams) and options flow for Rugby Live."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlowWithReload,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import EspnClient, EspnError
from .const import (
    COMPETITIONS,
    CONF_COMPETITIONS,
    CONF_FAVORITES,
    CONF_POLL_IDLE,
    CONF_POLL_LIVE,
    CONF_POLL_PREMATCH,
    CONF_POSTMATCH_GRACE,
    CONF_PREMATCH_WINDOW,
    CONF_SHOW_SUBSTITUTIONS,
    CONF_SINBIN_MINUTES,
    DEFAULT_OPTIONS,
    DOMAIN,
)

NUMBER_OPTIONS = {
    CONF_POLL_LIVE: (10, 120, "s"),
    CONF_POLL_PREMATCH: (30, 600, "s"),
    CONF_PREMATCH_WINDOW: (5, 180, "min"),
    CONF_POLL_IDLE: (300, 3600, "s"),
    CONF_POSTMATCH_GRACE: (0, 120, "min"),
    CONF_SINBIN_MINUTES: (5, 20, "min"),
}


def _competitions_selector() -> selector.SelectSelector:
    return selector.SelectSelector(
        selector.SelectSelectorConfig(
            options=list(COMPETITIONS),
            multiple=True,
            mode=selector.SelectSelectorMode.LIST,
            translation_key=CONF_COMPETITIONS,
        )
    )


def _teams_selector(teams: dict[str, str]) -> selector.SelectSelector:
    options = [
        selector.SelectOptionDict(value=tid, label=name)
        for tid, name in sorted(teams.items(), key=lambda t: t[1])
    ]
    return selector.SelectSelector(
        selector.SelectSelectorConfig(options=options, multiple=True, sort=False)
    )


async def _async_load_teams(hass: HomeAssistant, competitions: list[str]) -> dict[str, str]:
    """Teams of the leagues: ESPN team list plus teams seen on the current scoreboards
    (the list can be a season behind: Vannes was missing in 2026)."""
    client = EspnClient(async_get_clientsession(hass))
    teams: dict[str, str] = {}
    for key in competitions:
        league = COMPETITIONS[key]
        try:
            teams |= {t.id: t.name for t in await client.teams(league)}
            for match in await client.scoreboard(league):
                teams |= {match.home.id: match.home.name, match.away.id: match.away.name}
        except EspnError:
            continue
    return teams


class RugbyLiveConfigFlow(ConfigFlow, domain=DOMAIN):
    """Initial setup: competitions, then favourite teams."""

    VERSION = 1

    def __init__(self) -> None:
        self._competitions: list[str] = []
        self._teams: dict[str, str] = {}

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_COMPETITIONS]:
                self._competitions = user_input[CONF_COMPETITIONS]
                return await self.async_step_favorites()
            errors[CONF_COMPETITIONS] = "no_competition"
        schema = vol.Schema(
            {vol.Required(CONF_COMPETITIONS, default=list(COMPETITIONS)): _competitions_selector()}
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    async def async_step_favorites(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            chosen = user_input.get(CONF_FAVORITES, [])
            favorites = {tid: self._teams.get(tid, tid) for tid in chosen}
            return self.async_create_entry(
                title="Rugby Live",
                data={CONF_COMPETITIONS: self._competitions, CONF_FAVORITES: favorites},
            )
        self._teams = await _async_load_teams(self.hass, self._competitions)
        schema = vol.Schema(
            {vol.Optional(CONF_FAVORITES, default=[]): _teams_selector(self._teams)}
        )
        return self.async_show_form(step_id="favorites", data_schema=schema)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> RugbyLiveOptionsFlow:
        return RugbyLiveOptionsFlow()


class RugbyLiveOptionsFlow(OptionsFlowWithReload):
    """Competitions, favourites and polling settings (reloads the entry)."""

    def __init__(self) -> None:
        self._teams: dict[str, str] = {}

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        entry = self.config_entry
        current = {**DEFAULT_OPTIONS, **entry.data, **entry.options}
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_COMPETITIONS]:
                favorites = {
                    tid: self._teams.get(tid) or current[CONF_FAVORITES].get(tid, tid)
                    for tid in user_input.get(CONF_FAVORITES, [])
                }
                return self.async_create_entry(data={**user_input, CONF_FAVORITES: favorites})
            errors[CONF_COMPETITIONS] = "no_competition"

        self._teams = {
            **current.get(CONF_FAVORITES, {}),
            **await _async_load_teams(self.hass, current[CONF_COMPETITIONS]),
        }
        fields: dict[Any, Any] = {
            vol.Required(CONF_COMPETITIONS, default=current[CONF_COMPETITIONS]): (
                _competitions_selector()
            ),
            vol.Optional(CONF_FAVORITES, default=list(current.get(CONF_FAVORITES, {}))): (
                _teams_selector(self._teams)
            ),
        }
        for key, (low, high, unit) in NUMBER_OPTIONS.items():
            fields[vol.Required(key, default=current[key])] = vol.All(
                selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=low,
                        max=high,
                        step=1,
                        unit_of_measurement=unit,
                        mode=selector.NumberSelectorMode.BOX,
                    )
                ),
                vol.Coerce(int),
            )
        fields[vol.Required(CONF_SHOW_SUBSTITUTIONS, default=current[CONF_SHOW_SUBSTITUTIONS])] = (
            selector.BooleanSelector()
        )
        return self.async_show_form(step_id="init", data_schema=vol.Schema(fields), errors=errors)
