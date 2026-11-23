import os

SECRET_KEY = os.environ.get("SECRET_KEY", "teachnest-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
# sqlite:///./app.db resolves relative to the process CWD; main.py normalises
# it to the backend/ directory so `uvicorn app.main:app` from backend/ works.

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")

# ---------- Phase 4: integrations (all optional, no real values here) ----------
# Keys are read live from the environment at request time (see the helpers
# below) so tests / process restarts can change them without re-importing.
# NEVER hardcode a key here and never commit one.
CASHFREE_APP_ID = os.environ.get("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.environ.get("CASHFREE_SECRET_KEY", "")
CASHFREE_ENV = os.environ.get("CASHFREE_ENV", "SANDBOX").upper()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
WHATSAPP_TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
HMS_API_KEY = os.environ.get("HMS_API_KEY", "")
HMS_API_SECRET = os.environ.get("HMS_API_SECRET", "")
AGORA_APP_ID = os.environ.get("AGORA_APP_ID", "")
AGORA_APP_CERTIFICATE = os.environ.get("AGORA_APP_CERTIFICATE", "")
FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
MSG91_API_KEY = os.environ.get("MSG91_API_KEY", "")
EXOTEL_SID = os.environ.get("EXOTEL_SID", "")
EXOTEL_API_KEY = os.environ.get("EXOTEL_API_KEY", "")
EXOTEL_TOKEN = os.environ.get("EXOTEL_TOKEN", "")


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default) or default


# Live readers (used by the routers so env monkeypatching / Render env
# changes take effect without a re-import).
def cashfree_app_id() -> str:
    return _env("CASHFREE_APP_ID")


def cashfree_secret_key() -> str:
    return _env("CASHFREE_SECRET_KEY")


def cashfree_env() -> str:
    return _env("CASHFREE_ENV", "SANDBOX").upper()


def groq_api_key() -> str:
    return _env("GROQ_API_KEY")


def gemini_api_key() -> str:
    return _env("GEMINI_API_KEY")


def whatsapp_token() -> str:
    return _env("WHATSAPP_TOKEN")


def whatsapp_phone_number_id() -> str:
    return _env("WHATSAPP_PHONE_NUMBER_ID")


def firebase_service_account_json() -> str:
    return _env("FIREBASE_SERVICE_ACCOUNT_JSON")


def msg91_api_key() -> str:
    return _env("MSG91_API_KEY")


def exotel_sid() -> str:
    return _env("EXOTEL_SID")


def exotel_api_key() -> str:
    return _env("EXOTEL_API_KEY")


def exotel_token() -> str:
    return _env("EXOTEL_TOKEN")


def cashfree_configured() -> bool:
    return bool(_env("CASHFREE_APP_ID") and _env("CASHFREE_SECRET_KEY"))


def live_provider() -> str | None:
    """'100ms' if 100ms creds are set, else 'agora' if Agora creds are set."""
    if _env("HMS_API_KEY") and _env("HMS_API_SECRET"):
        return "100ms"
    if _env("AGORA_APP_ID") and _env("AGORA_APP_CERTIFICATE"):
        return "agora"
    return None


def sms_provider() -> str | None:
    if _env("MSG91_API_KEY"):
        return "msg91"
    if _env("EXOTEL_SID") and (_env("EXOTEL_API_KEY") or _env("EXOTEL_TOKEN")):
        return "exotel"
    return None

