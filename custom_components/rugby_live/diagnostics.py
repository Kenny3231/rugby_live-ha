"""Diagnostics: integration state only, no personal data."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .coordinator import RugbyLiveConfigEntry


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: RugbyLiveConfigEntry
) -> dict[str, Any]:
    c = entry.runtime_data
    return {
        "data": dict(entry.data),
        "options": dict(entry.options),
        "delay": c.delay,
        "errors": c.errors,
        "last_error": c.last_error,
        "last_success": c.last_success.isoformat() if c.last_success else None,
        "update_interval": c.update_interval.total_seconds() if c.update_interval else None,
        "fixtures": len(c.fixtures),
        "matches": {
            m.id: {
                "league": m.league_id,
                "state": m.state,
                "status": m.status.value,
                "score": f"{m.home_score}-{m.away_score}",
                "play_by_play": m.play_by_play,
                "timeline_events": len(c.timelines[m.id].events) if m.id in c.timelines else 0,
            }
            for m in c.matches.values()
        },
    }
