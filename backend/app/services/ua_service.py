"""User-Agent parsing and Bot detection service.

Specs: PRD 15 §7.3 & §7.4
- Uses user_agents library (MIT) to parse device, browser, and OS.
- Categorizes devices as 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'.
- Bot filter flags automated scrapers, crawlers, and headless testing traffic.
"""

from __future__ import annotations

import re
from typing import TypedDict

BOT_PATTERN = re.compile(
    r"(?:bot|crawl|spider|headless|curl|python-requests|lighthouse|wget|slurp|mediapartners)",
    re.IGNORECASE,
)


class ParsedUA(TypedDict):
    """Normalized device, browser, OS, and bot detection fields."""

    ua_raw: str
    ua_device: str
    ua_browser: str
    ua_os: str
    is_bot: bool


def is_bot_user_agent(ua_string: str | None) -> bool:
    """Return True if user agent represents a bot or crawler."""
    return parse_user_agent(ua_string)["is_bot"]


def _heuristic_parse(raw: str, is_bot: bool) -> ParsedUA:
    raw_lower = raw.lower()
    if is_bot or any(w in raw_lower for w in ("bot", "crawler", "spider", "headless", "lighthouse")):
        return {
            "ua_raw": raw[:1024],
            "ua_device": "bot",
            "ua_browser": "Bot",
            "ua_os": "Bot",
            "is_bot": True,
        }

    # Device detection
    if any(m in raw_lower for m in ("ipad", "tablet", "playbook", "silk")):
        device = "tablet"
    elif any(m in raw_lower for m in ("iphone", "ipod", "android", "mobile", "blackberry", "webos")):
        device = "mobile"
    else:
        device = "desktop"

    # Browser detection
    if "edg/" in raw_lower or "edge/" in raw_lower:
        match = re.search(r"edg[e]?/(\d+)", raw_lower)
        browser = f"Edge {match.group(1)}" if match else "Edge"
    elif "chrome/" in raw_lower or "crios/" in raw_lower:
        match = re.search(r"(?:chrome|crios)/(\d+)", raw_lower)
        browser = f"Chrome {match.group(1)}" if match else "Chrome"
    elif "firefox/" in raw_lower or "fxios/" in raw_lower:
        match = re.search(r"(?:firefox|fxios)/(\d+)", raw_lower)
        browser = f"Firefox {match.group(1)}" if match else "Firefox"
    elif "safari/" in raw_lower and "chrome" not in raw_lower:
        match = re.search(r"version/(\d+)", raw_lower)
        browser = f"Safari {match.group(1)}" if match else "Safari"
    elif "opera" in raw_lower or "opr/" in raw_lower:
        browser = "Opera"
    else:
        browser = "Browser"

    # OS detection
    if "windows nt 10" in raw_lower:
        os_str = "Windows 10/11"
    elif "windows" in raw_lower:
        os_str = "Windows"
    elif "macintosh" in raw_lower or "mac os x" in raw_lower:
        os_str = "macOS"
    elif "android" in raw_lower:
        os_str = "Android"
    elif "iphone" in raw_lower or "ipad" in raw_lower or "ios" in raw_lower:
        os_str = "iOS"
    elif "linux" in raw_lower or "x11" in raw_lower:
        os_str = "Linux"
    else:
        os_str = "Windows" if device == "desktop" else "Mobile OS"

    return {
        "ua_raw": raw[:1024],
        "ua_device": device,
        "ua_browser": browser,
        "ua_os": os_str,
        "is_bot": False,
    }


def parse_user_agent(ua_string: str | None) -> ParsedUA:
    """Parse User-Agent string into normalized device, browser, and OS."""
    raw = (ua_string or "").strip()
    if not raw:
        return {
            "ua_raw": "",
            "ua_device": "desktop",
            "ua_browser": "Browser",
            "ua_os": "Windows",
            "is_bot": False,
        }

    # Detect bot via regex pattern or known automated signatures
    is_bot = bool(BOT_PATTERN.search(raw))

    try:
        from user_agents import parse as ua_parse

        ua = ua_parse(raw)
        if ua.is_bot:
            is_bot = True

        if is_bot or ua.is_bot:
            device = "bot"
        elif ua.is_mobile:
            device = "mobile"
        elif ua.is_tablet:
            device = "tablet"
        elif ua.is_pc:
            device = "desktop"
        else:
            device = "unknown"

        # Format browser name and version
        browser_family = ua.browser.family or ""
        browser_version = ua.browser.version_string
        browser_str = (
            f"{browser_family} {browser_version}".strip() if browser_version else browser_family
        )

        # Format OS name and version
        os_family = ua.os.family or ""
        os_version = ua.os.version_string
        os_str = f"{os_family} {os_version}".strip() if os_version else os_family

        if device == "unknown" or not browser_str or not os_str:
            fallback = _heuristic_parse(raw, is_bot)
            if device == "unknown":
                device = fallback["ua_device"]
            if not browser_str:
                browser_str = fallback["ua_browser"]
            if not os_str:
                os_str = fallback["ua_os"]

        return {
            "ua_raw": raw[:1024],
            "ua_device": device,
            "ua_browser": browser_str[:128],
            "ua_os": os_str[:128],
            "is_bot": is_bot,
        }
    except Exception:
        return _heuristic_parse(raw, is_bot)
