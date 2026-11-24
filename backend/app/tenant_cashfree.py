"""Per-tenant Cashfree credentials.

Follows provider_keys.py exactly: keys saved from the admin panel are
stored Fernet-encrypted in ``tenant_cashfree_credentials`` (one row per
tenant) and take precedence over the global CASHFREE_APP_ID /
CASHFREE_SECRET_KEY environment variables. The raw keys are never stored
in plaintext, never logged, never returned — only a masked app-id
preview is ever exposed (see tenant_cashfree_status).
"""
from sqlalchemy.orm import Session

from . import config as cfg
from .models import TenantCashfreeCredential
from .provider_keys import decrypt_value, mask_key


def resolve_tenant_cashfree(db: Session, tenant_id: int) -> tuple[str, str, str]:
    """(app_id, secret, env) for a tenant: DB row first, env fallback.

    env is "sandbox" or "prod" (lowercase). Returns ("", "", env) when
    nothing is configured anywhere.
    """
    row = (
        db.query(TenantCashfreeCredential)
        .filter(TenantCashfreeCredential.tenant_id == tenant_id)
        .first()
    )
    if row is not None:
        app_id = decrypt_value(row.encrypted_app_id or "")
        secret = decrypt_value(row.encrypted_secret or "")
        if app_id and secret:
            return app_id, secret, (row.environment or "sandbox").lower()
    env_app_id = cfg.cashfree_app_id()
    env_secret = cfg.cashfree_secret_key()
    if env_app_id and env_secret:
        return env_app_id, env_secret, cfg.cashfree_env().lower()
    return "", "", cfg.cashfree_env().lower()


def tenant_cashfree_configured(db: Session, tenant_id: int) -> bool:
    app_id, secret, _env = resolve_tenant_cashfree(db, tenant_id)
    return bool(app_id and secret)


def tenant_cashfree_status(db: Session, tenant_id: int) -> dict:
    """Status for a tenant: configured, source (db|env|none), environment,
    masked app-id preview. Never contains a full key."""
    row = (
        db.query(TenantCashfreeCredential)
        .filter(TenantCashfreeCredential.tenant_id == tenant_id)
        .first()
    )
    if row is not None:
        app_id = decrypt_value(row.encrypted_app_id or "")
        secret = decrypt_value(row.encrypted_secret or "")
        if app_id and secret:
            return {
                "configured": True,
                "source": "db",
                "environment": (row.environment or "sandbox").lower(),
                "masked_app_id": mask_key(app_id),
            }
    env_app_id = cfg.cashfree_app_id()
    env_secret = cfg.cashfree_secret_key()
    if env_app_id and env_secret:
        return {
            "configured": True,
            "source": "env",
            "environment": cfg.cashfree_env().lower(),
            "masked_app_id": mask_key(env_app_id),
        }
    return {
        "configured": False,
        "source": "none",
        "environment": cfg.cashfree_env().lower(),
        "masked_app_id": "",
    }
