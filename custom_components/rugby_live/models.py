"""Data models shared by the ESPN client and the timeline engine (no Home Assistant import)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class PlayType(StrEnum):
    """Match events we track. Values are the public event type names."""

    TRY = "try"
    CONVERSION = "conversion"
    PENALTY_GOAL = "penalty_goal"
    DROP_GOAL = "drop_goal"
    YELLOW_CARD = "yellow_card"
    RED_CARD = "red_card"
    SUB_OFF = "sub_off"
    SUB_ON = "sub_on"


class MatchStatus(StrEnum):
    """Normalised match status."""

    SCHEDULED = "scheduled"
    FIRST_HALF = "first_half"
    HALF_TIME = "half_time"
    SECOND_HALF = "second_half"
    EXTRA_TIME = "extra_time"
    FINISHED = "finished"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"
    UNKNOWN = "unknown"


LIVE_STATUSES = frozenset(
    {MatchStatus.FIRST_HALF, MatchStatus.HALF_TIME, MatchStatus.SECOND_HALF, MatchStatus.EXTRA_TIME}
)


@dataclass(frozen=True, slots=True)
class Team:
    id: str
    name: str
    abbreviation: str | None = None
    color: str | None = None
    logo: str | None = None


@dataclass(frozen=True, slots=True)
class Match:
    id: str
    league_id: str
    kickoff: datetime
    home: Team
    away: Team
    home_score: int
    away_score: int
    status: MatchStatus
    state: str  # ESPN state: "pre" | "in" | "post"
    period: int
    venue: str | None = None
    play_by_play: bool = False
    # athlete id -> full name, harvested from the scoreboard "details" list
    athletes: dict[str, str] = field(default_factory=dict)

    def side_of(self, team_id: str | None) -> str | None:
        """'home' / 'away' for a team id, None if unknown."""
        if team_id == self.home.id:
            return "home"
        if team_id == self.away.id:
            return "away"
        return None


@dataclass(frozen=True, slots=True)
class Play:
    id: str
    type: PlayType
    team_id: str | None
    period: int
    clock: float  # seconds of play since kickoff
    home_score: int
    away_score: int
    athlete_id: str | None = None


@dataclass(frozen=True, slots=True)
class PlayerPhoto:
    """A player's cut-out photo: LNR site (Top 14) or EPCR match lineup (cups)."""

    club: str  # LNR club slug (api.LNR_SLUGS), or "home" / "away" in an EPCR lineup
    first: frozenset[str]  # normalised name words
    last: frozenset[str]
    photo: str
