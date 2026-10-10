"""Calendar of upcoming and recent matches, one per competition."""

from __future__ import annotations

from datetime import datetime, timedelta

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import RugbyLiveEntity, competition_device
from .models import Match

MATCH_LENGTH = timedelta(hours=2)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(MatchCalendar(coordinator, key) for key in coordinator.competitions)


class MatchCalendar(RugbyLiveEntity, CalendarEntity):
    def __init__(self, coordinator: RugbyLiveCoordinator, key: str) -> None:
        super().__init__(coordinator, competition_device(key), "calendar")
        self.league = coordinator.competitions[key]

    def _matches(self) -> list[Match]:
        pool = {**self.coordinator.fixtures, **self.coordinator.matches}.values()
        return sorted((m for m in pool if m.league_id == self.league), key=lambda m: m.kickoff)

    def _event(self, match: Match) -> CalendarEvent:
        summary = f"{match.home.name} – {match.away.name}"
        if match.state != "pre":
            vis = self.coordinator.view(match).visible
            summary += f" ({vis.home_score}-{vis.away_score})"
        return CalendarEvent(
            start=match.kickoff,
            end=match.kickoff + MATCH_LENGTH,
            summary=summary,
            location=match.venue,
            uid=match.id,
        )

    @property
    def event(self) -> CalendarEvent | None:
        now = dt_util.utcnow()
        match = next((m for m in self._matches() if m.kickoff + MATCH_LENGTH > now), None)
        return self._event(match) if match else None

    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> list[CalendarEvent]:
        return [
            self._event(m)
            for m in self._matches()
            if m.kickoff < end_date and m.kickoff + MATCH_LENGTH > start_date
        ]
