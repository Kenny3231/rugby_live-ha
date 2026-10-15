"""ESPN rugby client: pure parsers + a throttled aiohttp client (no Home Assistant import).

ESPN's API is unofficial and undocumented (see docs/01-API-FINDINGS.md): parsers are
tolerant, every field is optional, unknown play types are skipped.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
import unicodedata
from dataclasses import replace
from datetime import date, datetime
from typing import Any

import aiohttp

from .models import Match, MatchStatus, Play, PlayerPhoto, PlayType, Team

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

# Club colours of Top 14 clubs (primary, alternate): ESPN's are often wrong (Toulouse
# black, Bordeaux-Bègles navy). Hex without '#', like ESPN's.
# ponytail: static map like LNR_SLUGS, update on promotion/relegation.
CLUB_COLORS = {
    "25912": ("2B8FD0", "FFFFFF"),  # Bayonne: sky blue / white
    "143737": ("7A1E3D", "1A1A1A"),  # Bordeaux-Bègles: bordeaux / black
    "25916": ("0047AB", "FFFFFF"),  # Castres: blue / white
    "25917": ("FFC20E", "0B2A6B"),  # Clermont: yellow / navy
    "119318": ("FFD100", "111111"),  # La Rochelle: yellow / black
    "143736": ("D50032", "111111"),  # Lyon: red / black
    "25918": ("0A2A66", "FFFFFF"),  # Montpellier: navy / white
    "270567": ("007A3D", "FFFFFF"),  # Pau: green / white
    "25920": ("D52B1E", "F7C600"),  # Perpignan: blood red / gold
    "99855": ("75B2DD", "0B1F3A"),  # Racing 92: sky blue / navy
    "25921": ("E4007C", "0A1F44"),  # Stade Français: pink / navy
    "25922": ("C8102E", "111111"),  # Stade Toulousain: red / black
    "25986": ("E2001A", "111111"),  # Toulon: red / black
    "289337": ("00539F", "FFFFFF"),  # Vannes: blue / white
}


def colors_clash(a: str | None, b: str | None) -> bool:
    """True when two hex colours look alike on screen ('redmean' distance < 100)."""
    try:
        r1, g1, b1 = (int(a[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[index]
        r2, g2, b2 = (int(b[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[index]
    except TypeError, ValueError:
        return False
    rm = (r1 + r2) / 2
    red, green, blue = (r1 - r2) ** 2, (g1 - g2) ** 2, (b1 - b2) ** 2
    dist = (2 + rm / 256) * red + 4 * green + (2 + (255 - rm) / 256) * blue
    return dist**0.5 < 100


def match_colors(home: Team, away: Team) -> Team:
    """Away team, in its alternate colour when it would look like the home team."""
    alternate = CLUB_COLORS.get(away.id, (None, None))[1]
    if alternate and colors_clash(home.color, away.color):
        return replace(away, color=alternate)
    return away


class EspnError(Exception):
    """Network or HTTP error talking to ESPN."""


def team_logo(team_id: str, espn_logo: str | None) -> str | None:
    """Best logo URL: official LNR, else ESPN unless it is a wrong country flag."""
    if slug := LNR_SLUGS.get(team_id):
        return LNR_LOGO.format(slug=slug)
    if espn_logo and "/countries/" not in espn_logo:
        return espn_logo
    return None


def _words(text: str) -> list[str]:
    """Lower-case ASCII words: 'Alo-Émile' -> ['alo', 'emile']."""
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.findall(r"[a-z0-9]+", plain)


def _stems(text: str) -> set[str]:
    """5-letter stems of the words of a name: 'Stade Toulousain' and 'Toulouse' share 'toulo'."""
    return {w[:5] for w in _words(text) if len(w) >= 3}


def names_match(summary: str, *team_names: str) -> bool:
    """True when a calendar event title mentions one of the teams (TV channel lookup)."""
    title = _stems(summary)
    generic = {"stade", "rugby", "union", "club", "olymp", "sport"}
    return any((_stems(name) - generic) & title for name in team_names)


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
        color=CLUB_COLORS[tid][0] if tid in CLUB_COLORS else raw.get("color"),
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
                    home=(home_team := _parse_team(home.get("team") or {})),
                    away=match_colors(home_team, _parse_team(away.get("team") or {})),
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


# ------------------------------------------------------------------ LNR photos
# The LNR players page loads its list from a public Meilisearch index; the page itself
# carries the index name, host and search-only key, read again on each refresh so a
# rotated key keeps working. Photos are cut-outs (transparent WebP), hot-linked only.

LNR_PLAYERS_PAGE = "https://top14.lnr.fr/joueurs"
_LNR_CONFIG = re.compile(
    r":index-name='\"([^\"]+)\"'.*?:host-url='\"([^\"]+)\"'.*?:api-key='\"([^\"]+)\"'", re.S
)


def parse_lnr_config(html: str) -> tuple[str, str] | None:
    """(search URL, search key) from the players page, None if the page changed."""
    found = _LNR_CONFIG.search(html)
    if not found:
        return None
    index, host, key = found.groups()
    host = host.replace("\\/", "/").rstrip("/")  # JSON-escaped in the page
    return f"{host}/indexes/{index}/search", key


def parse_lnr_players(data: dict[str, Any]) -> list[PlayerPhoto]:
    """Players with a photo from a Meilisearch response."""
    players = []
    for hit in data.get("hits") or []:
        image = hit.get("image") or {}
        photo = image.get("m-2x") or image.get("original")
        club = ((hit.get("club") or {}).get("url") or "").rsplit("/", 1)[-1]
        if photo and club:
            players.append(
                PlayerPhoto(
                    club=club,
                    first=frozenset(_words(hit.get("first_name") or "")),
                    last=frozenset(_words(hit.get("last_name") or "")),
                    photo=photo,
                )
            )
    return players


def player_photo(
    players: list[PlayerPhoto], team_id: str | None, full_name: str | None
) -> str | None:
    """Photo of an ESPN player. LNR adds middle names ('Hugo Domingo MIOTTI' for ESPN's
    'Domingo Miotti'): every ESPN word must appear in the LNR name, within the club when
    ESPN's team is a known Top 14 club, else league-wide. Ambiguous -> None (logo shown)."""
    slug = LNR_SLUGS.get(team_id or "")
    pool = [p for p in players if p.club == slug] if slug else players
    return _photo(pool, full_name, bool(slug))


def _photo(pool: list[PlayerPhoto], full_name: str | None, one_club: bool) -> str | None:
    words = _words(full_name or "")
    if not words:
        return None
    hits = [p for p in pool if set(words) <= p.first | p.last]
    if not hits and one_club:  # nickname vs full first name ('Ollie' / 'Oliver'): surname only
        hits = [p for p in pool if words[-1] in p.last]
    return hits[0].photo if len(hits) == 1 else None


async def lnr_players(session: aiohttp.ClientSession) -> list[PlayerPhoto]:
    """All Top 14 players with a photo; empty on any failure (photos are a bonus)."""
    headers = {"User-Agent": USER_AGENT}
    try:
        async with session.get(LNR_PLAYERS_PAGE, headers=headers, timeout=TIMEOUT) as resp:
            config = parse_lnr_config(await resp.text())
        if config is None:
            _LOGGER.debug("LNR players page changed: no search config found")
            return []
        url, key = config
        body = {
            "q": "",
            "limit": 2000,
            "attributesToRetrieve": ["first_name", "last_name", "club.url", "image"],
        }
        async with session.post(
            url, json=body, headers={**headers, "Authorization": f"Bearer {key}"}, timeout=TIMEOUT
        ) as resp:
            if resp.status >= 400:
                _LOGGER.debug("LNR search HTTP %s", resp.status)
                return []
            return parse_lnr_players(await resp.json(content_type=None))
    except (aiohttp.ClientError, TimeoutError, ValueError) as err:
        _LOGGER.debug("LNR players unavailable: %r", err)
        return []


# ------------------------------------------------------------------ EPCR lineups
# The EPCR site (Champions Cup, Challenge Cup) reads the InCrowd feed (docs/01): each
# match carries both lineups (the 23 of the day) with cut-out photos, published about
# two days before kickoff. Photos are hot-linked only, like the LNR ones.

EPCR_MATCHES = "https://rugby-union-feeds.incrowdsports.com/v1/matches"
EPCR_PARAMS = {"clientId": "EPCR", "provider": "rugbyviz"}
EPCR_COMPS = {"271937": 1008, "272073": 1026}  # ESPN league id -> InCrowd compId


def epcr_season(kickoff: datetime) -> int:
    """InCrowd season id: 202601 for 2026-27 (verified for 2025-26 and 2026-27)."""
    return (kickoff.year if kickoff.month >= 7 else kickoff.year - 1) * 100 + 1


def find_epcr_match(data: dict[str, Any], match: Match) -> int | None:
    """InCrowd id of an ESPN match: same kickoff (15 min) and one team name in common
    ('Stade Toulousain' / 'Toulouse'); None when absent or ambiguous."""
    hits = []
    for raw in data.get("data") or []:
        try:
            kickoff = datetime.fromisoformat(str(raw["date"]).replace("Z", "+00:00"))
        except KeyError, ValueError:
            continue
        home = (raw.get("homeTeam") or {}).get("name") or ""
        away = (raw.get("awayTeam") or {}).get("name") or ""
        if abs((kickoff - match.kickoff).total_seconds()) <= 900 and (
            names_match(home, match.home.name) or names_match(away, match.away.name)
        ):
            hits.append(raw.get("id"))
    return hits[0] if len(hits) == 1 and hits[0] else None


def parse_epcr_lineup(data: dict[str, Any]) -> list[PlayerPhoto]:
    """Players with a photo from an InCrowd match, club = "home" / "away"."""
    match = data.get("data") or {}
    players = []
    for side in ("home", "away"):
        for raw in (match.get(f"{side}Team") or {}).get("players") or []:
            if photo := raw.get("imageUrl"):
                players.append(
                    PlayerPhoto(
                        club=side,
                        first=frozenset(_words(raw.get("firstName") or "")),
                        last=frozenset(_words(raw.get("lastName") or "")),
                        photo=photo,
                    )
                )
    return players


def lineup_photo(lineup: list[PlayerPhoto], side: str | None, full_name: str | None) -> str | None:
    """Photo of an ESPN player from the EPCR lineup of his match (side: home / away)."""
    return _photo([p for p in lineup if p.club == side], full_name, True) if side else None


async def epcr_lineup(session: aiohttp.ClientSession, match: Match) -> list[PlayerPhoto]:
    """Lineup photos of a cup match; empty when unknown or on any failure (a bonus)."""
    comp = EPCR_COMPS.get(match.league_id)
    if comp is None:
        return []
    headers = {"User-Agent": USER_AGENT}
    params = {**EPCR_PARAMS, "compId": comp, "season": epcr_season(match.kickoff)}
    try:
        async with session.get(
            EPCR_MATCHES, params=params, headers=headers, timeout=TIMEOUT
        ) as resp:
            if resp.status >= 400:
                _LOGGER.debug("EPCR matches HTTP %s", resp.status)
                return []
            epcr_id = find_epcr_match(await resp.json(content_type=None), match)
        if epcr_id is None:
            return []
        async with session.get(
            f"{EPCR_MATCHES}/{epcr_id}",
            params={**EPCR_PARAMS, "images": "true"},
            headers=headers,
            timeout=TIMEOUT,
        ) as resp:
            if resp.status >= 400:
                _LOGGER.debug("EPCR match HTTP %s", resp.status)
                return []
            return parse_epcr_lineup(await resp.json(content_type=None))
    except (aiohttp.ClientError, TimeoutError, ValueError) as err:
        _LOGGER.debug("EPCR lineup unavailable: %r", err)
        return []
