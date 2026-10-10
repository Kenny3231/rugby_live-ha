"""Tests for the config flow."""

from __future__ import annotations

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.rugby_live.const import CONF_COMPETITIONS, DOMAIN


async def test_user_flow_requires_a_competition(hass: HomeAssistant) -> None:
    """An empty selection is refused; a valid one creates the single entry."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_COMPETITIONS: []}
    )
    assert result["errors"] == {CONF_COMPETITIONS: "no_competition"}

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_COMPETITIONS: ["top14"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"] == {CONF_COMPETITIONS: ["top14"]}

    # single_config_entry: a second flow aborts.
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"
