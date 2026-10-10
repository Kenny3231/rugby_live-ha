"""Constants for the Rugby Live integration."""

from __future__ import annotations

from datetime import timedelta

DOMAIN = "rugby_live"

CONF_COMPETITIONS = "competitions"
CONF_FAVORITES = "favorites"  # {team_id: team_name}
CONF_POLL_LIVE = "poll_live"
CONF_POLL_PREMATCH = "poll_prematch"
CONF_PREMATCH_WINDOW = "prematch_window"
CONF_POLL_IDLE = "poll_idle"
CONF_POSTMATCH_GRACE = "postmatch_grace"
CONF_SINBIN_MINUTES = "sinbin_minutes"
CONF_SHOW_SUBSTITUTIONS = "show_substitutions"
CONF_BROADCAST_CALENDAR = "broadcast_calendar"  # optional calendar whose location is the TV channel

DEFAULT_OPTIONS = {
    CONF_POLL_LIVE: 10,
    CONF_POLL_PREMATCH: 60,
    CONF_PREMATCH_WINDOW: 30,
    CONF_POLL_IDLE: 900,
    CONF_POSTMATCH_GRACE: 15,
    CONF_SINBIN_MINUTES: 10,
    CONF_SHOW_SUBSTITUTIONS: False,
}

# Competition key -> ESPN league id (verified in docs/01-API-FINDINGS.md).
COMPETITIONS: dict[str, str] = {
    "top14": "270559",
    "champions_cup": "271937",
    "challenge_cup": "272073",
}
COMPETITION_NAMES = {
    "top14": "Top 14",
    "champions_cup": "Champions Cup",
    "challenge_cup": "Challenge Cup",
}

EVENT_DELAYED = f"{DOMAIN}_event"
EVENT_RAW = f"{DOMAIN}_event_raw"
EVENT_REVOKED = f"{DOMAIN}_event_revoked"
SIGNAL_EVENT = f"{DOMAIN}_released"

STORE_KEY = f"{DOMAIN}.timelines"
STORE_VERSION = 1
ENV_BASE_URL = "RUGBY_LIVE_ESPN_BASE_URL"  # dev only: tools/replay_server.py

FIXTURE_DAYS = 14
FIXTURE_REFRESH = timedelta(hours=6)
MAX_DELAY = 300
EVENTS_ATTRIBUTE_CAP = 60
