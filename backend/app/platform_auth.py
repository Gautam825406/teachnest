"""Platform (super) admin credentials.

The platform admin is a single env-configured account, separate from
tenant admins: PLATFORM_ADMIN_USERNAME / PLATFORM_ADMIN_PASSWORD. The
password is never logged, never returned, and only ever compared with
hmac.compare_digest against the env value. If the env vars are unset the
platform login endpoint answers 503 ("Platform admin not configured").
"""
import hmac
import os


def platform_admin_username() -> str:
    return os.environ.get("PLATFORM_ADMIN_USERNAME", "")


def platform_admin_configured() -> bool:
    return bool(
        os.environ.get("PLATFORM_ADMIN_USERNAME", "")
        and os.environ.get("PLATFORM_ADMIN_PASSWORD", "")
    )


def check_platform_credentials(username: str, password: str) -> bool:
    """Constant-time check of the env-configured platform admin login."""
    expected_user = os.environ.get("PLATFORM_ADMIN_USERNAME", "")
    expected_pass = os.environ.get("PLATFORM_ADMIN_PASSWORD", "")
    if not expected_user or not expected_pass:
        return False
    return hmac.compare_digest(username or "", expected_user) and hmac.compare_digest(
        password or "", expected_pass
    )
