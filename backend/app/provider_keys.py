"""Per-tenant AI provider keys (Groq, Gemini) for the admin panel.

Keys saved from the admin panel are stored Fernet-encrypted in the
``provider_credentials`` table — never in plaintext, never logged, never
returned to the frontend (only a masked preview like ``gsk_...abcd``).
Environment variables remain a fallback: a DB key wins, otherwise
``GROQ_API_KEY`` / ``GEMINI_API_KEY`` from the environment is used, so
existing Render setups keep working.

Encryption key: ``CREDENTIALS_ENCRYPTION_KEY`` (a urlsafe-base64 32-byte
Fernet key) when set; otherwise derived from ``SECRET_KEY``. Changing
``SECRET_KEY`` / ``CREDENTIALS_ENCRYPTION_KEY`` makes previously saved keys
undecryptable — they are then treated as not configured and must be
re-entered from the admin panel.
"""
import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from .models import ProviderCredential

AI_PROVIDERS = ("groq", "gemini")

_ENV_FALLBACK = {"groq": "GROQ_API_KEY", "gemini": "GEMINI_API_KEY"}


def _fernet() -> Fernet:
    raw = os.environ.get("CREDENTIALS_ENCRYPTION_KEY", "")
    if raw:
        try:
            return Fernet(raw.encode())
        except Exception:
            pass  # fall through to the SECRET_KEY-derived key
    secret = os.environ.get("SECRET_KEY", "teachnest-dev-secret-change-in-production")
    derived = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(derived)


def encrypt_value(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_value(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError, AttributeError):
        return ""


def mask_key(value: str) -> str:
    """Show only the first 4 and last 4 characters, e.g. ``gsk_...9f2c``."""
    if not value:
        return ""
    if len(value) <= 8:
        return "****"
    return f"{value[:4]}...{value[-4:]}"


def _env_key(provider: str) -> str:
    name = _ENV_FALLBACK.get(provider, "")
    return os.environ.get(name, "") if name else ""


def resolve_provider_key(db: Session, tenant_id: int, provider: str) -> str:
    """DB key first, env fallback. Returns "" when nothing is configured."""
    row = (
        db.query(ProviderCredential)
        .filter(ProviderCredential.tenant_id == tenant_id, ProviderCredential.provider == provider)
        .first()
    )
    if row is not None:
        value = decrypt_value(row.encrypted_value or "")
        if value:
            return value
    return _env_key(provider)


def provider_key_status(db: Session, tenant_id: int, provider: str) -> dict:
    """Status for one provider: configured, source (db|env|none), masked key."""
    row = (
        db.query(ProviderCredential)
        .filter(ProviderCredential.tenant_id == tenant_id, ProviderCredential.provider == provider)
        .first()
    )
    if row is not None:
        value = decrypt_value(row.encrypted_value or "")
        if value:
            return {
                "provider": provider,
                "configured": True,
                "source": "admin_panel",
                "masked": mask_key(value),
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
    env_value = _env_key(provider)
    if env_value:
        return {
            "provider": provider,
            "configured": True,
            "source": "env",
            "masked": mask_key(env_value),
            "updated_at": None,
        }
    return {"provider": provider, "configured": False, "source": "none", "masked": "", "updated_at": None}
