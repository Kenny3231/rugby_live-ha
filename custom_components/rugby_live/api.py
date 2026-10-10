"""ESPN rugby client: pure parsers + a throttled aiohttp client (no Home Assistant import).

ESPN's API is unofficial and undocumented (see docs/01-API-FINDINGS.md): parsers are
tolerant, every field is optional, unknown play types are skipped.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import date, datetime
from typing import Any

import aiohttp

from .models import Match, MatchStatus, Play, PlayType, Team

_LOGGER = logging.getLogger(__name__)

SITE_BASE = "https://site.api.espn.com"
CORE_BASE = "https://sports.core.api.espn.com"
USER_AGENT = "rugby_live/0.1 (Home Assistant custom integration; personal use)"
MIN_REQUEST_INTERVAL = 1.0  # seconds, global across leagues
TIMEOUT = aiohttp.ClientTimeout(total=10)

# ESPN play type id -> our type (verified ids, docs/01).
PLAY_TYPES = {
    "1": PlayType.TRY,
    "2": PlayType.CONVERSION,
    "3": PlayType.PENALTY_GOAL,
    "4": PlayType.DROP_GOAL,
    "5": PlayType.YELLOW_CARD,
    "6": PlayType.RED_CARD,
    "7": PlayType.SUB_OFF,
    "8": PlayType.SUB_ON,
}

STATUS_NAMES = {
    "STATUS_SCHEDULED": MatchStatus.SCHEDULED,
    "STATUS_FIRST_HALF": MatchStatus.FIRST_HALF,
    "STATUS_HALFTIME": MatchStatus.HALF_TIME,
    "STATUS_SECOND_HALF": MatchStatus.SECOND_HALF,
    "STATUS_FINAL": MatchStatus.FINISHED,
    "STATUS_FULL_TIME": MatchStatus.FINISHED,
    "STATUS_POSTPONED": MatchStatus.POSTPONED,
    "STATUS_CANCELED": MatchStatus.CANCELLED,
    "STATUS_ABANDONED": MatchStatus.CANCELLED,
}

# Official LNR logos for Top 14 clubs (ESPN has none for Bayonne, Perpignan, Vannes).
# ponytail: static ESPN team id -> LNR slug map, update on promotion/relegation;
# the LNR source (v0.2) will make it dynamic.
LNR_LOGO = "https://cdn.lnr.fr/club/{slug}/photo/logo.006973c3fdaf23345d4c26b914dcca87e8ef842a"
LNR_SLUGS = {
    "25912": "bayonne",
    "143737": "bordeaux-begles",
    "25916": "castres",
    "25917": "clermont",
    "119318": "la-rochelle",
    "143736": "lyon",
    "25918": "montpellier",
    "270567": "pau",
    "25920": "perpignan",
    "99855": "racing-92",
    "25921": "paris",
    "25922": "toulouse",
    "25986": "toulon",
    "289337": "vannes",
}


class EspnError(Exception):
    """Network or HTTP error talking to ESPN."""


def team_logo(team_id: str, espn_logo: str | None) -> str | None:
    """Best logo URL: official LNR, else ESPN unless it is a wrong country flag."""
    if slug := LNR_SLUGS.get(team_id):
        return LNR_LOGO.format(slug=slug)
    if espn_logo and "/countries/" not in espn_logo:
        return espn_logo
    return None


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except TypeError, ValueError:
        return default


def _parse_team(raw: dict[str, Any]) -> Team:
    tid = str(raw.get("id", ""))
    return Team(
        id=tid,
        name=raw.get("displayName") or raw.get("name") or tid,
        abbreviation=raw.get("abbreviation"),
        color=raw.get("color"),
        logo=team_logo(tid, raw.get("logo")),
    )


def parse_status(status: dict[str, Any]) -> tuple[MatchStatus, str, int]:
    """(normalised status, ESPN state, period) from a competition status block."""
    stype = status.get("type") or {}
    state = stype.get("state") or "pre"
    name = stype.get("name") or ""
    if name in STATUS_NAMES:
        normalised = STATUS_NAMES[name]
    elif "OVERTIME" in name or "EXTRA" in name:
        normalised = MatchStatus.EXTRA_TIME
    elif state == "pre":
        normalised = MatchStatus.SCHEDULED
    elif state == "post":
        normalised = MatchStatus.FINISHED
    else:
        _LOGGER.debug("Unknown ESPN status %s", name)
        normalised = MatchStatus.UNKNOWN
    return normalised, state, _int(status.get("period"))


def parse_scoreboard(data: dict[str, Any], league_id: str) -> list[Match]:
    """Matches of a site-API scoreboard response. Malformed events are skipped."""
    matches = []
    for event in data.get("events") or []:
        try:
            comp = event["competitions"][0]
            sides = {c.get("homeAway"): c for c in comp.get("competitors") or []}
            home, away = sides["home"], sides["away"]
            status, state, period = parse_status(comp.get("status") or event.get("status") or {})
            athletes = {
                str(a["id"]): a.get("fullName") or a.get("displayName") or ""
                for d in comp.get("details") or []
                for a in d.get("athletesInvolved") or []
                if a.get("id")
            }
            matches.append(
                Match(
                    id=str(event["id"]),
                    league_id=league_id,
                    kickoff=datetime.fromisoformat(
                        (comp.get("date") or event["date"]).replace("Z", "+00:00")
                    ),
                    home=_parse_team(home.get("team") or {}),
                    away=_parse_team(away.get("team") or {}),
                    home_score=_int(home.get("score")),
                    away_score=_int(away.get("score")),
                    status=status,
                    state=state,
                    period=period,
                    venue=(comp.get("venue") or {}).get("fullName"),
                    play_by_play=bool(comp.get("playByPlayAvailable")),
                    athletes=athletes,
                )
            )
        except (KeyError, IndexError, TypeError, ValueError) as err:
            _LOGGER.debug("Skipping malformed event %s: %r", event.get("id"), err)
    return matches


def _ref_id(ref: dict[str, Any] | None) -> str | None:
    """Last path segment of a {"$ref": ".../teams/25921?lang=en"} object."""
    if not ref or not ref.get("$ref"):
        return None
    return ref["$ref"].split("?", 1)[0].rstrip("/").rsplit("/", 1)[-1]


def parse_plays(data: dict[str, Any]) -> list[Play]:
    """Tracked plays of a core-API plays response, in match order (not id order)."""
    plays = []
    for item in data.get("items") or []:
        ptype = PLAY_TYPES.get(str((item.get("type") or {}).get("id")))
        if ptype is None or item.get("id") is None:
            continue
        participants = item.get("participants") or [{}]
        plays.append(
            Play(
                id=str(item["id"]),
                type=ptype,
                team_id=_ref_id(item.get("team")),
                period=_int((item.get("period") or {}).get("number"), 1),
                clock=float((item.get("clock") or {}).get("value") or 0),
                home_score=_int(item.get("homeScore")),
                away_score=_int(item.get("awayScore")),
                athlete_id=_ref_id(participants[0].get("athlete")),
            )
        )
    plays.sort(key=lambda p: (p.period, p.clock))
    return plays


class EspnClient:
    """Throttled ESPN client: at most one request per MIN_REQUEST_INTERVAL, globally.

    `base_url` (dev only) replaces both ESPN hosts, e.g. tools/replay_server.py.
    """

    def __init__(self, session: aiohttp.ClientSession, base_url: str | None = None) -> None:
        self._session = session
        self._site = base_url or SITE_BASE
        self._core = base_url or CORE_BASE
        self._lock = asyncio.Lock()
        self._last = 0.0

    async def _get(self, url: str) -> dict[str, Any]:
        async with self._lock:
            wait = self._last + MIN_REQUEST_INTERVAL - time.monotonic()
            if wait > 0:
                await asyncio.sleep(wait)
            self._last = time.monotonic()
        try:
            async with self._session.get(
                url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT
            ) as resp:
                if resp.status >= 400:
                    raise EspnError(f"HTTP {resp.status} for {url}")
                return await resp.json(content_type=None)
        except (aiohttp.ClientError, TimeoutError, ValueError) as err:
            raise EspnError(f"{type(err).__name__} for {url}") from err

    async def scoreboard(self, league_id: str, day: date | None = None) -> list[Match]:
        url = f"{self._site}/apis/site/v2/sports/rugby/{league_id}/scoreboard"
        if day:
            url += f"?dates={day:%Y%m%d}"
        return parse_scoreboard(await self._get(url), league_id)

    async def plays(self, league_id: str, event_id: str) -> list[Play]:
        url = (
            f"{self._core}/v2/sports/rugby/leagues/{league_id}/events/{event_id}"
            f"/competitions/{event_id}/plays?limit=400"
        )
        return parse_plays(await self._get(url))

    async def teams(self, league_id: str) -> list[Team]:
        """League teams (ESPN's list can be a season behind: Vannes missing in 2026)."""
        url = f"{self._site}/apis/site/v2/sports/rugby/{league_id}/teams"
        data = await self._get(url)
        teams = []
        for league in (data.get("sports") or [{}])[0].get("leagues") or []:
            for entry in league.get("teams") or []:
                raw = entry.get("team") or {}
                logos = raw.get("logos") or [{}]
                teams.append(_parse_team({**raw, "logo": logos[0].get("href")}))
        return teams
