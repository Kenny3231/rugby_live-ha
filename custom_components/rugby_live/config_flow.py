"""Config flow for Rugby Live."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers import selector

from .const import COMPETITIONS, CONF_COMPETITIONS, DOMAIN


class RugbyLiveConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the initial setup: pick the competitions to follow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Ask which competitions to follow (at least one)."""
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_COMPETITIONS]:
                return self.async_create_entry(title="Rugby Live", data=user_input)
            errors[CONF_COMPETITIONS] = "no_competition"

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_COMPETITIONS, default=list(COMPETITIONS)
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=list(COMPETITIONS),
                        multiple=True,
                        mode=selector.SelectSelectorMode.LIST,
                        translation_key=CONF_COMPETITIONS,
                    )
                )
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)
