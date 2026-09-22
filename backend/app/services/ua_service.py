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


def parse_user_agent(ua_string: str | None) -> ParsedUA:
    """Parse User-Agent string into normalized device, browser, and OS."""
    raw = (ua_string or "").strip()
    if not raw:
        return {
            "ua_raw": "",
            "ua_device": "unknown",
            "ua_browser": "unknown",
            "ua_os": "unknown",
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
        browser_family = ua.browser.family or "Unknown"
        browser_version = ua.browser.version_string
        browser_str = (
            f"{browser_family} {browser_version}".strip() if browser_version else browser_family
        )

        # Format OS name and version
        os_family = ua.os.family or "Unknown"
        os_version = ua.os.version_string
        os_str = f"{os_family} {os_version}".strip() if os_version else os_family

        return {
            "ua_raw": raw[:1024],
            "ua_device": device,
            "ua_browser": browser_str[:128],
            "ua_os": os_str[:128],
            "is_bot": is_bot,
        }
    except Exception:
        # Fallback if parser fails
        device = "bot" if is_bot else "unknown"
        return {
            "ua_raw": raw[:1024],
            "ua_device": device,
            "ua_browser": "unknown",
            "ua_os": "unknown",
            "is_bot": is_bot,
        }
