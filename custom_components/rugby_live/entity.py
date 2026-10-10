"""Base entities: one device for the integration, one per competition, one per favourite team."""

from __future__ import annotations

from typing import Any

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import COMPETITION_NAMES, DOMAIN, EVENTS_ATTRIBUTE_CAP
from .coordinator import MatchView, RugbyLiveCoordinator
from .models import Match, Team
from .timeline import TimelineEvent

EVENT_LABELS = {
    "fr": {
        "try": "Essai",
        "conversion": "Transformation",
        "penalty_goal": "Pénalité",
        "drop_goal": "Drop",
        "yellow_card": "Carton jaune",
        "red_card": "Carton rouge",
        "sub_on": "Entrée",
        "sub_off": "Sortie",
    },
    "en": {
        "try": "Try",
        "conversion": "Conversion",
        "penalty_goal": "Penalty goal",
        "drop_goal": "Drop goal",
        "yellow_card": "Yellow card",
        "red_card": "Red card",
        "sub_on": "Substitute on",
        "sub_off": "Substitute off",
    },
}

GLOBAL_DEVICE = ("global", "Rugby Live")


def competition_device(key: str) -> tuple[str, str]:
    return f"competition_{key}", COMPETITION_NAMES[key]


def team_device(team_id: str, name: str) -> tuple[str, str]:
    return f"team_{team_id}", name


FOLLOWED_DEVICE = ("followed", "Match suivi")


class RugbyLiveEntity(CoordinatorEntity[RugbyLiveCoordinator]):
    """Entity attached to one of the integration devices."""

    _attr_has_entity_name = True

    def __init__(
        self, coordinator: RugbyLiveCoordinator, device: tuple[str, str], key: str
    ) -> None:
        super().__init__(coordinator)
        entry_id = coordinator.config_entry.entry_id
        device_id, device_name = device
        self._attr_unique_id = f"{entry_id}_{device_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{entry_id}_{device_id}")},
            name=device_name,
            manufacturer="Rugby Live",
            model="ESPN",
            entry_type=DeviceEntryType.SERVICE,
        )

    def label(self, event_type: str) -> str:
        lang = "fr" if self.hass.config.language.startswith("fr") else "en"
        return EVENT_LABELS[lang].get(event_type, event_type)

    def describe(self, match: Match, ev: TimelineEvent) -> str:
        who = match.athletes.get(ev.athlete_id or "") or team_name(match, ev.team_id)
        return f"{self.label(ev.type.value)} — {who} ({ev.minute}')"


class TeamEntity(RugbyLiveEntity):
    """Follows a favourite team's current match, or (team_id None) the followed match
    picked with the select entity: one set of stable entity ids for light animations."""

    def __init__(
        self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str, key: str
    ) -> None:
        device = team_device(team_id, name) if team_id else FOLLOWED_DEVICE
        super().__init__(coordinator, device, key)
        self.team_id = team_id

    def current_match(self) -> Match | None:
        if self.team_id is None:
            return self.coordinator.followed_match()
        return self.coordinator.team_match(self.team_id)

    @property
    def view(self) -> MatchView | None:
        match = self.current_match()
        return self.coordinator.view(match) if match else None

    def is_home(self, match: Match) -> bool:
        """Point of view: the favourite team, or the home side for the followed match."""
        return self.team_id is None or match.home.id == self.team_id

    def side(self, team_id: str | None) -> str | None:
        if team_id is None:
            return None
        if self.team_id is None:
            match = self.current_match()
            return match.side_of(team_id) if match else None
        return "team" if team_id == self.team_id else "opponent"


def team_name(match: Match, team_id: str | None) -> str:
    return {match.home.id: match.home.name, match.away.id: match.away.name}.get(team_id or "", "")


def team_attrs(team: Team, prefix: str) -> dict[str, Any]:
    return {
        f"{prefix}_id": team.id,
        f"{prefix}_name": team.name,
        f"{prefix}_logo": team.logo,
        f"{prefix}_color": f"#{team.color}" if team.color else None,
    }


def minute_display(view: MatchView) -> str | None:
    vis = view.visible
    if view.status.value == "half_time":
        return "MT"
    if vis.minute is None:
        return None
    return f"{vis.minute}'+" if vis.stoppage else f"{vis.minute}'"


def counters(view: MatchView) -> dict[str, dict[str, int]]:
    out: dict[str, dict[str, int]] = {"home": {}, "away": {}}
    for ev in view.visible.events:
        side = view.match.side_of(ev.team_id)
        if side:
            out[side][ev.type.value] = out[side].get(ev.type.value, 0) + 1
    return out


def events_attr(entity: RugbyLiveEntity, view: MatchView) -> list[dict[str, Any]]:
    match = view.match
    return [
        {
            "key": ev.key,
            "type": ev.type.value,
            "label": entity.label(ev.type.value),
            "side": match.side_of(ev.team_id),
            "team": team_name(match, ev.team_id),
            "player": match.athletes.get(ev.athlete_id or ""),
            "minute": ev.minute,
            "period": ev.period,
        }
        for ev in view.visible.events[-EVENTS_ATTRIBUTE_CAP:]
    ]


def match_summary(entity: RugbyLiveEntity, view: MatchView) -> dict[str, Any]:
    """Compact dict for list attributes (multiplex card)."""
    vis, match = view.visible, view.match
    last = next(
        (ev for ev in reversed(vis.events) if ev.type.value not in ("sub_on", "sub_off")), None
    )
    return {
        "match_id": match.id,
        "competition": view.competition,
        "kickoff": match.kickoff.isoformat(),
        "status": view.status.value,
        "minute": minute_display(view),
        "home_score": vis.home_score,
        "away_score": vis.away_score,
        **team_attrs(match.home, "home"),
        **team_attrs(match.away, "away"),
        "last_event": entity.describe(match, last) if last else None,
        "channel": entity.coordinator.channels.get(match.id),
    }
