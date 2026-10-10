"""Shared fixtures for Rugby Live tests.

Home Assistant only runs on Linux (it imports fcntl), so HA-dependent tests are
skipped on Windows; they run in CI. Pure tests (tools, api, timeline) run everywhere.
On Windows: `pytest -p no:homeassistant` (the plugin itself imports fcntl).
"""

from __future__ import annotations

import sys

import pytest

if sys.platform == "win32":
    collect_ignore = ["test_config_flow.py"]
else:
    pytest_plugins = "pytest_homeassistant_custom_component"

    @pytest.fixture(autouse=True)
    def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
        """Load custom_components/ in every test."""
