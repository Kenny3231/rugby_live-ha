"""Sensors: API status, per-competition scoreboards, per-favourite-team match state."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import MatchView, RugbyLiveConfigEntry, RugbyLiveCoordinator
from .entity import (
    GLOBAL_DEVICE,
    RugbyLiveEntity,
    TeamEntity,
    competition_device,
    counters,
    events_attr,
    match_summary,
    minute_display,
    team_attrs,
)
from .models import MatchStatus
from .timeline import TimelineEvent

STATUS_OPTIONS = ["no_match", *[s.value for s in MatchStatus]]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: RugbyLiveConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    entities: list[SensorEntity] = [ApiStatusSensor(coordinator)]
    for key in coordinator.competitions:
        entities += [
            LiveMatchesSensor(coordinator, key),
            CompetitionNextMatchSensor(coordinator, key),
        ]
    for team_id, name in coordinator.favorites.items():
        entities += [
            cls(coordinator, team_id, name)
            for cls in (
                TeamStatusSensor,
                TeamScoreSensor,
                TeamMinuteSensor,
                TeamLastEventSensor,
                TeamNextMatchSensor,
            )
        ]
    # "Match suivi" device: same entities, following the match chosen in the select.
    entities += [
        cls(coordinator, None, "")
        for cls in (TeamStatusSensor, TeamScoreSensor, TeamMinuteSensor, TeamLastEventSensor)
    ]
    async_add_entities(entities)


class ApiStatusSensor(RugbyLiveEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["ok", "degraded", "error"]
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator: RugbyLiveCoordinator) -> None:
        super().__init__(coordinator, GLOBAL_DEVICE, "api_status")

    @property
    def available(self) -> bool:
        return True

    @property
    def native_value(self) -> str:
        errors = self.coordinator.errors
        return "ok" if errors == 0 else "degraded" if errors < 3 else "error"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        c = self.coordinator
        return {
            "consecutive_errors": c.errors,
            "last_error": c.last_error,
            "last_success": c.last_success.isoformat() if c.last_success else None,
            "update_interval": c.update_interval.total_seconds() if c.update_interval else None,
            "delay": c.delay,
        }


class LiveMatchesSensor(RugbyLiveEntity, SensorEntity):
    """All matches of the competition today (or next match day), with live scores."""

    _unrecorded_attributes = frozenset({"matches"})

    def __init__(self, coordinator: RugbyLiveCoordinator, key: str) -> None:
        super().__init__(coordinator, competition_device(key), "live_matches")
        self.league = coordinator.competitions[key]

    def _views(self) -> list[MatchView]:
        matches = [m for m in self.coordinator.matches.values() if m.league_id == self.league]
        return [self.coordinator.view(m) for m in sorted(matches, key=lambda m: m.kickoff)]

    @property
    def native_value(self) -> int:
        return sum(1 for v in self._views() if v.live)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"matches": [match_summary(self, v) for v in self._views()]}


class CompetitionNextMatchSensor(RugbyLiveEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator: RugbyLiveCoordinator, key: str) -> None:
        super().__init__(coordinator, competition_device(key), "next_match")
        self.league = coordinator.competitions[key]

    @property
    def native_value(self) -> datetime | None:
        match = self.coordinator.next_match(league=self.league)
        return match.kickoff if match else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        match = self.coordinator.next_match(league=self.league)
        if match is None:
            return {}
        return {
            "match_id": match.id,
            "venue": match.venue,
            "channel": self.coordinator.channels.get(match.id),
            **team_attrs(match.home, "home"),
            **team_attrs(match.away, "away"),
        }


class TeamStatusSensor(TeamEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = STATUS_OPTIONS

    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str) -> None:
        super().__init__(coordinator, team_id, name, "match_status")

    @property
    def native_value(self) -> str:
        view = self.view
        return view.status.value if view else "no_match"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        view = self.view
        if view is None:
            return {}
        match = view.match
        home = self.is_home(match)
        team, opponent = (match.home, match.away) if home else (match.away, match.home)
        return {
            "match_id": match.id,
            "competition": view.competition,
            "kickoff": match.kickoff.isoformat(),
            "venue": match.venue,
            "channel": self.coordinator.channels.get(match.id),
            "home_away": "home" if home else "away",
            **team_attrs(team, "team"),
            **team_attrs(opponent, "opponent"),
        }


class TeamScoreSensor(TeamEntity, SensorEntity):
    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str) -> None:
        super().__init__(coordinator, team_id, name, "score")

    @property
    def native_value(self) -> str | None:
        view = self.view
        if view is None or view.status == MatchStatus.SCHEDULED:
            return None
        return f"{view.visible.home_score} - {view.visible.away_score}"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        view = self.view
        if view is None:
            return {}
        vis, match = view.visible, view.match
        home = self.is_home(match)
        return {
            "home_score": vis.home_score,
            "away_score": vis.away_score,
            "team_score": vis.home_score if home else vis.away_score,
            "opponent_score": vis.away_score if home else vis.home_score,
            "counters": counters(view),
            **team_attrs(match.home, "home"),
            **team_attrs(match.away, "away"),
        }


class TeamMinuteSensor(TeamEntity, SensorEntity):
    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str) -> None:
        super().__init__(coordinator, team_id, name, "minute")

    @property
    def native_value(self) -> int | None:
        view = self.view
        return view.visible.minute if view and view.live else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        view = self.view
        if view is None:
            return {}
        return {"display": minute_display(view), "source": view.visible.minute_source}


class TeamLastEventSensor(TeamEntity, SensorEntity):
    _unrecorded_attributes = frozenset({"events"})

    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str) -> None:
        super().__init__(coordinator, team_id, name, "last_event")

    def _last(self) -> tuple[MatchView | None, TimelineEvent | None]:
        view = self.view
        if view is None:
            return None, None
        evs = [e for e in view.visible.events if e.type.value not in ("sub_on", "sub_off")]
        return view, (evs[-1] if evs else None)

    @property
    def native_value(self) -> str | None:
        view, ev = self._last()
        return self.describe(view.match, ev)[:255] if view and ev else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        view, ev = self._last()
        if view is None:
            return {}
        attrs: dict[str, Any] = {"events": events_attr(self, view)}
        if ev is not None:
            attrs |= {
                "type": ev.type.value,
                "side": self.side(ev.team_id),
                "player": view.match.athletes.get(ev.athlete_id or ""),
                "minute": ev.minute,
            }
        return attrs


class TeamNextMatchSensor(TeamEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator: RugbyLiveCoordinator, team_id: str | None, name: str) -> None:
        super().__init__(coordinator, team_id, name, "next_match")

    @property
    def native_value(self) -> datetime | None:
        match = self.coordinator.next_match(team_id=self.team_id)
        return match.kickoff if match else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        match = self.coordinator.next_match(team_id=self.team_id)
        if match is None:
            return {}
        home = match.home.id == self.team_id
        team, opponent = (match.home, match.away) if home else (match.away, match.home)
        return {
            "match_id": match.id,
            "competition": self.coordinator.competition_of(match),
            "venue": match.venue,
            "channel": self.coordinator.channels.get(match.id),
            "home_away": "home" if home else "away",
            **team_attrs(team, "team"),
            **team_attrs(opponent, "opponent"),
        }
