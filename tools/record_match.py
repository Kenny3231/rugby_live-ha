"""Record raw ESPN responses for a league during live matches (dev tool, stdlib only).

Writes one JSON body per *changed* response plus an index.jsonl:
    {"t": "<UTC ISO observed_at>", "kind": "scoreboard"|"plays", "event": "<id>", "file": "<name>"}

The output belongs in TRACKING_DIR/captures/, never in the repository.
Replay it with tools/replay_server.py.

Usage:
    python tools/record_match.py --league 270559 --out <dir> [--interval 10] [--minutes 180]

If TLS fails with CERTIFICATE_VERIFY_FAILED, point SSL_CERT_FILE to a CA bundle.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

USER_AGENT = "rugby_live-recorder/0.1 (Home Assistant integration dev tool)"
SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/rugby/{league}/scoreboard"
PLAYS = (
    "https://sports.core.api.espn.com/v2/sports/rugby/leagues/{league}"
    "/events/{event}/competitions/{event}/plays?limit=400"
)


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read()


class Recorder:
    def __init__(self, out: Path) -> None:
        self.out = out
        self.out.mkdir(parents=True, exist_ok=True)
        self.index = (out / "index.jsonl").open("a", encoding="utf-8")
        self.last_hash: dict[str, str] = {}
        self.count = 0

    def save(self, kind: str, event: str, body: bytes) -> None:
        key = f"{kind}:{event}"
        digest = hashlib.sha1(body).hexdigest()
        if self.last_hash.get(key) == digest:
            return
        self.last_hash[key] = digest
        self.count += 1
        name = f"{self.count:05d}_{kind}_{event or 'all'}.json"
        (self.out / name).write_bytes(body)
        now = datetime.now(UTC).isoformat(timespec="milliseconds")
        line = {"t": now, "kind": kind, "event": event, "file": name}
        self.index.write(json.dumps(line) + "\n")
        self.index.flush()


def _state(event: dict) -> str:
    return event["competitions"][0]["status"]["type"]["state"]


def run(league: str, out: Path, interval: float, minutes: float) -> None:
    rec = Recorder(out)
    deadline = time.monotonic() + minutes * 60
    finished: set[str] = set()
    while time.monotonic() < deadline:
        try:
            body = fetch(SCOREBOARD.format(league=league))
            rec.save("scoreboard", "", body)
            events = json.loads(body).get("events", [])
            for ev in events:
                state = _state(ev)
                if state == "in" or (state == "post" and ev["id"] not in finished):
                    rec.save("plays", ev["id"], fetch(PLAYS.format(league=league, event=ev["id"])))
                    if state == "post":
                        finished.add(ev["id"])
                    time.sleep(1)  # stay well under ~1 request/s
            if events and all(_state(e) == "post" and e["id"] in finished for e in events):
                print("all matches finished")
                return
        except Exception as err:
            print(f"{datetime.now(UTC).isoformat()} error: {err!r}", flush=True)
        time.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--league", default="270559")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--interval", type=float, default=10)
    parser.add_argument("--minutes", type=float, default=180)
    args = parser.parse_args()
    run(args.league, args.out, args.interval, args.minutes)


if __name__ == "__main__":
    main()
