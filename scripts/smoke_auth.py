#!/usr/bin/env python3
"""Smoke: login → nodes revision → stale 409 → clear → subscription.

Usage:
  BASE_URL=https://sublink-worker.xxx.workers.dev AUTH_PASSWORD=secret python3 scripts/smoke_auth.py

Reads AUTH_PASSWORD / SUBLINK_PASSWORD from env or repo-root .env (gitignored).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE = "https://sublink-worker.1960784419.workers.dev"
UA = os.environ.get(
    "SMOKE_UA",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36",
)


def load_dotenv() -> None:
    path = ROOT / ".env"
    if not path.is_file():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key not in ("AUTH_PASSWORD", "SUBLINK_PASSWORD"):
            continue
        if key not in os.environ or not os.environ[key]:
            os.environ[key] = value.strip().strip('"').strip("'")


def request(base: str, method: str, path: str, data=None, token: str | None = None):
    headers = {
        "Accept": "application/json",
        "User-Agent": UA,
        "Origin": base,
        "Referer": base.rstrip("/") + "/",
    }
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base.rstrip("/") + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode()
            payload = json.loads(raw) if raw else {}
            return resp.status, payload, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw[:400]}
        return exc.code, payload, raw


def main() -> int:
    load_dotenv()
    base = os.environ.get("BASE_URL", DEFAULT_BASE).rstrip("/")
    password = os.environ.get("AUTH_PASSWORD") or os.environ.get("SUBLINK_PASSWORD") or ""
    if not password:
        print("AUTH_PASSWORD (or SUBLINK_PASSWORD) is required", file=sys.stderr)
        return 2

    print(f"== smoke against {base} ==")

    code, status, _ = request(base, "GET", "/api/auth/status")
    print(f"auth/status HTTP {code} {status}")
    if code != 200:
        return 1

    code, login, _ = request(base, "POST", "/api/auth/login", {"password": password})
    print(f"login HTTP {code}")
    token = login.get("token") if isinstance(login, dict) else None
    if code != 200 or not token:
        print(f"FAIL login: {login}", file=sys.stderr)
        return 1

    code, snap, _ = request(base, "GET", "/api/nodes", token=token)
    print(f"GET /api/nodes HTTP {code} keys={sorted(snap.keys()) if isinstance(snap, dict) else None}")
    if code != 200 or "revision" not in snap or "nodes" not in snap:
        print(f"FAIL get: {snap}", file=sys.stderr)
        return 1
    rev = snap["revision"]
    print(f"  nodes={len(snap.get('nodes') or [])} revision={rev}")

    code, put, _ = request(
        base,
        "PUT",
        "/api/nodes",
        {
            "revision": rev,
            "nodes": [
                {
                    "id": "n_smoke",
                    "raw": "ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@smoke.example:443#smoke",
                    "name": "smoke",
                    "protocol": "ss",
                    "enabled": True,
                }
            ],
        },
        token=token,
    )
    print(f"PUT /api/nodes HTTP {code} revision={put.get('revision')} err={put.get('error')}")
    if code != 200:
        return 1
    rev2 = put["revision"]

    code, stale, _ = request(base, "PUT", "/api/nodes", {"revision": rev, "nodes": []}, token=token)
    print(f"stale PUT HTTP {code} (expect 409) err={stale.get('error')}")
    if code != 409:
        print("FAIL expected 409", file=sys.stderr)
        return 1

    code, cleared, _ = request(base, "DELETE", "/api/nodes", {"revision": rev2}, token=token)
    print(f"DELETE /api/nodes HTTP {code} revision={cleared.get('revision')} err={cleared.get('error')}")
    if code != 200 or len(cleared.get("nodes") or []) != 0:
        return 1

    code, sub, _ = request(base, "POST", "/api/subscriptions", {"name": "smoke-sub", "nodeIds": []}, token=token)
    print(f"POST /api/subscriptions HTTP {code} err={sub.get('error')}")
    item = sub.get("item") if isinstance(sub, dict) else None
    if code not in (200, 201) or not isinstance(item, dict):
        return 1
    slug = str(item.get("slug") or "")
    sid = str(item.get("id") or "")
    if not slug or not sid:
        return 1

    sub_req = urllib.request.Request(
        base + f"/subscribe/{slug}",
        headers={"User-Agent": UA, "Accept": "*/*"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(sub_req, timeout=45) as resp:
            body = resp.read()
            print(f"GET /subscribe/{slug} HTTP {resp.status} bytes={len(body)}")
            if resp.status != 200 or not body:
                return 1
    except urllib.error.HTTPError as exc:
        print(f"FAIL subscribe HTTP {exc.code}", file=sys.stderr)
        return 1

    code, _, _ = request(base, "DELETE", f"/api/subscriptions/{sid}", token=token)
    print(f"DELETE subscription HTTP {code}")

    code, snapf, _ = request(base, "GET", "/api/nodes", token=token)
    if code == 200 and isinstance(snapf, dict) and "revision" in snapf:
        request(base, "DELETE", "/api/nodes", {"revision": snapf.get("revision")}, token=token)

    print("SMOKE_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
