"""Constants for the Rugby Live integration."""

from __future__ import annotations

DOMAIN = "rugby_live"

CONF_COMPETITIONS = "competitions"

# Competition key -> ESPN league id (verified in docs/01-API-FINDINGS.md).
COMPETITIONS: dict[str, str] = {
    "top14": "270559",
    "champions_cup": "271937",
    "challenge_cup": "272073",
}
