"""Select the match followed by the "Match suivi" device (automatic or any current match)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.select import SelectEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.util import dt as dt_util

from .const import COMPETITION_NAMES
from .coordinator import RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import GLOBAL_DEVICE, RugbyLiveEntity
from .models import Match

AUTO = {"fr": "Automatique", "en": "Automatic"}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([FollowedMatchSelect(entry.runtime_data)])


class FollowedMatchSelect(RugbyLiveEntity, SelectEntity, RestoreEntity):
    def __init__(self, coordinator: RugbyLiveCoordinator) -> None:
        super().__init__(coordinator, GLOBAL_DEVICE, "followed_match")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is not None and last.attributes.get("match_id"):
            self.coordinator.async_follow(last.attributes["match_id"])

    @property
    def available(self) -> bool:
        return True

    @property
    def _auto(self) -> str:
        return AUTO["fr" if self.hass.config.language.startswith("fr") else "en"]

    def _label(self, match: Match) -> str:
        competition = COMPETITION_NAMES.get(self.coordinator.competition_of(match), "")
        kickoff = dt_util.as_local(match.kickoff).strftime("%H:%M")
        return f"{competition} · {match.home.name} – {match.away.name} ({kickoff})"

    def _choices(self) -> dict[str, str]:
        matches = sorted(self.coordinator.matches.values(), key=lambda m: m.kickoff)
        return {self._label(m): m.id for m in matches}

    @property
    def options(self) -> list[str]:
        return [self._auto, *self._choices()]

    @property
    def current_option(self) -> str:
        followed = self.coordinator.followed_id
        if followed and followed in self.coordinator.matches:
            return self._label(self.coordinator.matches[followed])
        return self._auto

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        match = self.coordinator.followed_match()
        return {
            "match_id": self.coordinator.followed_id,
            "followed_match_id": match.id if match else None,
        }

    async def async_select_option(self, option: str) -> None:
        self.coordinator.async_follow(self._choices().get(option))
