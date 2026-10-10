"""Tests for the config flow."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.rugby_live.const import CONF_COMPETITIONS, CONF_FAVORITES, DOMAIN

TEAMS = {"25922": "Stade Toulousain", "25912": "Bayonne"}


async def test_user_flow_competitions_then_favorites(hass: HomeAssistant) -> None:
    """An empty selection is refused; favourites are stored with their names."""
    with (
        patch(
            "custom_components.rugby_live.config_flow._async_load_teams",
            AsyncMock(return_value=TEAMS),
        ),
        patch("custom_components.rugby_live.async_setup_entry", AsyncMock(return_value=True)),
    ):
        result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
        assert result["step_id"] == "user"

        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_COMPETITIONS: []}
        )
        assert result["errors"] == {CONF_COMPETITIONS: "no_competition"}

        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_COMPETITIONS: ["top14"]}
        )
        assert result["step_id"] == "favorites"

        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_FAVORITES: ["25922"]}
        )
        assert result["type"] is FlowResultType.CREATE_ENTRY
        assert result["data"] == {
            CONF_COMPETITIONS: ["top14"],
            CONF_FAVORITES: {"25922": "Stade Toulousain"},
        }

        # single_config_entry: a second flow aborts.
        result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
        assert result["type"] is FlowResultType.ABORT
        assert result["reason"] == "single_instance_allowed"
