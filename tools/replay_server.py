"""Replay a capture recorded by tools/record_match.py as a fake ESPN API (dev tool, stdlib only).

Capture time advances with wall time multiplied by --speed, starting at the first
recorded response (+ --offset minutes). Each request gets the latest response of
its kind recorded at or before the current capture time.

Usage:
    python tools/replay_server.py <capture_dir> [--speed 10] [--offset 0] [--port 8765]

Point the integration at it with RUGBY_LIVE_ESPN_BASE_URL=http://127.0.0.1:8765
(both ESPN hosts are served from the same root).
"""

from __future__ import annotations

import argparse
import json
import re
import time
from bisect import bisect_right
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCOREBOARD_RE = re.compile(r"^/apis/site/v2/sports/rugby/\d+/scoreboard$")
PLAYS_RE = re.compile(r"^/v2/sports/rugby/leagues/\d+/events/(\d+)/competitions/\d+/plays$")


def route(path: str) -> tuple[str, str] | None:
    """Map a request path (query ignored) to a (kind, event) capture key."""
    path = path.split("?", 1)[0]
    if SCOREBOARD_RE.match(path):
        return ("scoreboard", "")
    if m := PLAYS_RE.match(path):
        return ("plays", m.group(1))
    return None


class Capture:
    """Index of a capture directory: (kind, event) -> sorted [(time, file)]."""

    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.entries: dict[tuple[str, str], list[tuple[datetime, str]]] = {}
        for line in (directory / "index.jsonl").read_text(encoding="utf-8").splitlines():
            if line.strip():
                rec = json.loads(line)
                key = (rec["kind"], rec["event"])
                when = datetime.fromisoformat(rec["t"])
                self.entries.setdefault(key, []).append((when, rec["file"]))
        for items in self.entries.values():
            items.sort()
        self.start = min(items[0][0] for items in self.entries.values())

    def select(self, key: tuple[str, str], at: datetime) -> str | None:
        """File of the latest response for key recorded at or before `at`."""
        items = self.entries.get(key, [])
        i = bisect_right([t for t, _ in items], at)
        return items[i - 1][1] if i else None


def serve(capture: Capture, speed: float, offset_min: float, port: int) -> None:
    wall0 = time.monotonic()
    origin = capture.start + timedelta(minutes=offset_min)

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            key = route(self.path)
            now = origin + timedelta(seconds=(time.monotonic() - wall0) * speed)
            name = capture.select(key, now) if key else None
            if name is None:
                self.send_error(404)
                return
            body = (capture.directory / name).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-Replay-Time", now.isoformat())
            self.end_headers()
            self.wfile.write(body)

    print(f"replaying {capture.directory} from {origin.isoformat()} at x{speed} on :{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("capture", type=Path)
    parser.add_argument("--speed", type=float, default=1)
    parser.add_argument("--offset", type=float, default=0, help="start N minutes into the capture")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    serve(Capture(args.capture), args.speed, args.offset, args.port)


if __name__ == "__main__":
    main()
