"""Contract tests of the ESPN parsers against real (truncated) responses in fixtures/."""

from __future__ import annotations

import json
from pathlib import Path

from custom_components.rugby_live.api import (
    names_match,
    parse_lnr_config,
    parse_lnr_players,
    parse_plays,
    parse_scoreboard,
    parse_status,
    player_photo,
    team_logo,
)
from custom_components.rugby_live.models import MatchStatus, PlayType

FIXTURES = Path(__file__).parents[1] / "fixtures"


def load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_parse_scoreboard_live_and_scheduled() -> None:
    live, pre = parse_scoreboard(load("top14_scoreboard_2026-10-10.json"), "270559")
    assert (live.id, live.home.name, live.away.name) == (
        "604399",
        "Stade Francais Paris",
        "Montpellier Herault",
    )
    assert (live.home_score, live.away_score) == (23, 15)
    assert live.status is MatchStatus.SECOND_HALF and live.state == "in"
    assert live.play_by_play and live.venue == "Stade Jean Bouin"
    assert live.athletes["117466"] == "Paul Alo-Emile"
    assert live.side_of("25918") == "away"
    assert pre.status is MatchStatus.SCHEDULED and not pre.play_by_play
    assert pre.kickoff.isoformat() == "2026-10-10T14:35:00+00:00"


def test_parse_plays_order_types_and_refs() -> None:
    plays = parse_plays(load("top14_604399_plays.json"))
    assert [p.type for p in plays[:3]] == [PlayType.SUB_OFF, PlayType.TRY, PlayType.PENALTY_GOAL]
    first_try = plays[1]
    assert (first_try.team_id, first_try.athlete_id, first_try.period) == ("25921", "117466", 1)
    assert (plays[-1].home_score, plays[-1].away_score) == (23, 15)
    # Sorted by (period, clock), not by id.
    assert plays == sorted(plays, key=lambda p: (p.period, p.clock))


def test_parsers_tolerate_garbage() -> None:
    assert parse_scoreboard({"events": [{"id": "1"}, {}]}, "1") == []
    assert parse_plays({"items": [{"id": "1", "type": {"id": "99"}}, {"type": {"id": "1"}}]}) == []
    assert parse_status({})[0] is MatchStatus.SCHEDULED
    assert parse_status({"type": {"name": "STATUS_HALFTIME", "state": "in"}})[0] is (
        MatchStatus.HALF_TIME
    )
    assert parse_status({"type": {"name": "STATUS_NEW", "state": "post"}})[0] is (
        MatchStatus.FINISHED
    )


def test_names_match_calendar_titles() -> None:
    """Real allrugby titles vs ESPN team names (TV channel lookup)."""
    assert names_match("Top 14 - Toulouse vs Bayonne", "Stade Toulousain", "Bayonne")
    assert names_match("Champions Cup - Toulouse vs Exeter", "Stade Toulousain", "Exeter Chiefs")
    assert names_match("Top 14 - Paris vs Lyon", "Stade Francais Paris", "Lyon")
    assert not names_match("Top 14 - Toulouse vs Bayonne", "Clermont Auvergne", "Bordeaux Begles")
    assert not names_match("Top 14 - Toulouse vs Bayonne", "Stade Francais Paris", "Racing 92")


def test_team_logo_prefers_official_and_drops_country_flags() -> None:
    assert "cdn.lnr.fr/club/bayonne" in team_logo("25912", None)
    assert team_logo("999", "https://a.espncdn.com/i/teamlogos/countries/500/usa.png") is None
    assert team_logo("999", "https://x/500/999.png") == "https://x/500/999.png"


def test_parse_lnr_config_from_players_page() -> None:
    html = """<players-filters
        :index-name='"rugbymen_top14"' :index-key='"rugbymen"'
        :host-url='"https:\\/\\/search.lnr.fr\\/"' :api-key='"abc123"' :has-search-bar="true"
    />"""
    assert parse_lnr_config(html) == (
        "https://search.lnr.fr/indexes/rugbymen_top14/search",
        "abc123",
    )
    assert parse_lnr_config("<html></html>") is None


def test_player_photo_matches_espn_names() -> None:
    players = parse_lnr_players(load("lnr_players.json"))
    assert len(players) == 8  # the one without image is dropped

    def who(team_id: str | None, name: str | None) -> str | None:
        url = player_photo(players, team_id, name)
        return url.split("/")[-2] if url else None

    # Scorers of the real match 604399 under their ESPN names; LNR adds middle names.
    match = parse_scoreboard(load("top14_scoreboard_2026-10-10.json"), "270559")[0]
    expected = {
        "292739": ("25921", "carbonel"),
        "292583": ("25921", "tanga"),
        "295124": ("25921", "duguivalu"),
        "117466": ("25921", "alo-emile"),
        "270445": ("25918", "miotti"),
        "134149": ("25918", "hogg"),
    }
    for athlete_id, (team_id, slug) in expected.items():
        assert who(team_id, match.athletes[athlete_id]) == slug
    assert who("25922", "Tom Ramos") == "ramos"  # nickname: surname within the club
    assert who("999", "Thomas Ramos") == "ramos"  # foreign team id: full name, league-wide
    assert who("999", "Ramos") is None  # ambiguous league-wide
    assert who("25921", "Unknown Player") is None
    assert who("25921", None) is None


def _event(home: tuple[str, str], away: tuple[str, str]) -> dict:
    def side(where: str, team: tuple[str, str]) -> dict:
        return {"homeAway": where, "score": "0", "team": {"id": team[0], "color": team[1]}}

    return {
        "events": [
            {
                "id": "1",
                "date": "2026-10-24T14:35Z",
                "competitions": [
                    {
                        "competitors": [side("home", home), side("away", away)],
                        "status": {
                            "type": {"name": "STATUS_SCHEDULED", "state": "pre"},
                            "period": 0,
                        },
                    }
                ],
            }
        ]
    }


def test_club_colours_replace_espn_ones() -> None:
    """Toulouse in red and Bordeaux-Bègles in bordeaux, not ESPN's black and navy."""
    (match,) = parse_scoreboard(_event(("25922", "000000"), ("143737", "000099")), "270559")
    assert (match.home.color, match.away.color) == ("C8102E", "7A1E3D")


def test_away_team_switches_colour_on_clash() -> None:
    """Toulouse - Toulon: both red, Toulon plays in black; other leagues keep ESPN's."""
    (match,) = parse_scoreboard(_event(("25922", "000000"), ("25986", "CC0000")), "270559")
    assert (match.home.color, match.away.color) == ("C8102E", "111111")
    (match,) = parse_scoreboard(_event(("1", "CC0000"), ("2", "CC0000")), "270557")
    assert match.away.color == "CC0000"
