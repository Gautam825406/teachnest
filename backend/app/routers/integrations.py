"""Phase 4: Integrations & AI.

Cashfree (NOT Razorpay) for payments, Groq / Gemini for AI question
generation, Meta WhatsApp Cloud API, Firebase Cloud Messaging push,
100ms/Agora live config (status only — no fake join URLs).

AI provider keys (Groq, Gemini) can be saved from the admin panel
(Integrations → AI API Keys): they are stored Fernet-encrypted per tenant
(see provider_keys.py) and take precedence over the GROQ_API_KEY /
GEMINI_API_KEY environment variables. No secret value is ever returned,
logged, or stored in plaintext. Status endpoints report only
`configured` booleans and masked previews.
"""
import base64
import hashlib
import hmac
import io
import json
import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import config as cfg
from ..database import get_db
from ..deps import get_current_user
from ..models import (
    AIGeneration,
    Bundle,
    Course,
    IntegrationLog,
    Order,
    PaymentTransaction,
    ProviderCredential,
    Question,
    Student,
    TenantCashfreeCredential,
    TestSeries,
    User,
)
from ..provider_keys import (
    AI_PROVIDERS,
    encrypt_value,
    provider_key_status,
    resolve_provider_key,
)
from ..tenant_cashfree import resolve_tenant_cashfree, tenant_cashfree_status
from ..schemas import AIGenerationOut, IntegrationLogOut, PaymentTransactionOut

router = APIRouter(tags=["phase4-integrations"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-120b"  # llama-3.3-70b-versatile was shut down by Groq on 16 Aug 2026
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models"
WHATSAPP_TEMPLATES = {"teachnest_enrolment", "teachnest_payment_receipt", "teachnest_test_reminder"}
WHATSAPP_API_VERSION = "v21.0"
MAX_AI_QUESTIONS = 20


# ---------- Shared helpers ----------
def txn_out(txn: PaymentTransaction) -> dict:
    return {
        "id": txn.id,
        "order_id": txn.order_id,
        "cashfree_order_id": txn.cashfree_order_id,
        "item_type": txn.item_type,
        "item_id": txn.item_id,
        "student_id": txn.student_id,
        "amount": txn.amount,
        "amount_rupees": (txn.amount or 0) / 100.0,
        "currency": txn.currency,
        "status": txn.status,
        "payment_session_id": txn.payment_session_id or "",
        "created_at": txn.created_at.isoformat() if txn.created_at else None,
        "updated_at": txn.updated_at.isoformat() if txn.updated_at else None,
    }


def cashfree_base_url(env: str | None = None) -> str:
    """Cashfree PG base URL for an environment ("SANDBOX"/"PROD", either
    case). Defaults to the global CASHFREE_ENV."""
    return (
        "https://api.cashfree.com/pg"
        if (env or cfg.cashfree_env()).upper() == "PROD"
        else "https://sandbox.cashfree.com/pg"
    )


def cashfree_headers(app_id: str | None = None, secret: str | None = None) -> dict:
    """Auth headers for explicit credentials; falls back to the global
    env keys when none are given (backwards compatible)."""
    return {
        "x-api-version": "2023-08-01",
        "x-client-id": app_id if app_id is not None else cfg.cashfree_app_id(),
        "x-client-secret": secret if secret is not None else cfg.cashfree_secret_key(),
        "Content-Type": "application/json",
    }


def cashfree_configured(app_id: str | None = None, secret: str | None = None) -> bool:
    """True when the given credentials (or, when omitted, the global env
    keys) are both present."""
    if app_id is not None or secret is not None:
        return bool(app_id and secret)
    return bool(cfg.cashfree_app_id() and cfg.cashfree_secret_key())


def create_cashfree_order(
    order_id: str,
    amount_rupees: float,
    customer_id: str,
    customer_phone: str = "",
    *,
    app_id: str | None = None,
    secret: str | None = None,
    env: str | None = None,
) -> dict:
    """Create an order at Cashfree. Returns the parsed Cashfree response.

    Credentials are explicit (per-tenant) when given, otherwise the
    global env keys are used.
    """
    payload: dict = {
        "order_id": order_id,
        "order_amount": round(float(amount_rupees), 2),
        "order_currency": "INR",
        "customer_details": {"customer_id": customer_id or order_id},
    }
    if customer_phone:
        payload["customer_details"]["customer_phone"] = customer_phone
    try:
        resp = httpx.post(
            f"{cashfree_base_url(env)}/orders",
            headers=cashfree_headers(app_id, secret),
            json=payload,
            timeout=30,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Cashfree request failed: {exc}")
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Cashfree order creation failed ({resp.status_code})")
    return resp.json()


def fetch_cashfree_payments(
    cashfree_order_id: str,
    *,
    app_id: str | None = None,
    secret: str | None = None,
    env: str | None = None,
) -> list:
    """GET /pg/orders/{cf_order_id}/payments — list of payment attempts."""
    try:
        resp = httpx.get(
            f"{cashfree_base_url(env)}/orders/{cashfree_order_id}/payments",
            headers=cashfree_headers(app_id, secret),
            timeout=30,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Cashfree request failed: {exc}")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Cashfree payment lookup failed ({resp.status_code})")
    data = resp.json()
    if isinstance(data, list):
        return data
    return data.get("payments", []) or []


def new_order_id(tenant_id: int) -> str:
    return f"TN-{tenant_id}-{uuid.uuid4().hex[:12].upper()}"


def _get_txn_or_404(db: Session, tenant_id: int, order_id: str) -> PaymentTransaction:
    txn = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.tenant_id == tenant_id, PaymentTransaction.order_id == order_id)
        .first()
    )
    if txn is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return txn


def grant_enrolment(db: Session, txn: PaymentTransaction) -> dict:
    """On a PAID transaction: create the SUCCESS Order row (once) and enrol
    the student for course/bundle items. Wallet/storage purchases only get
    the Order row (no course enrolment). Returns a summary dict."""
    if txn.status != "PAID":
        return {"granted": False, "reason": "not paid"}
    existing = (
        db.query(Order)
        .filter(Order.tenant_id == txn.tenant_id, Order.transaction_id == txn.order_id)
        .first()
    )
    student = None
    if txn.student_id:
        student = db.query(Student).filter(Student.id == txn.student_id, Student.tenant_id == txn.tenant_id).first()
    items: list[str] = []
    if txn.item_type == "course" and txn.item_id:
        course = db.query(Course).filter(Course.id == txn.item_id, Course.tenant_id == txn.tenant_id).first()
        if course:
            items = [course.title]
            if student and course.id not in (student.course_ids or []):
                student.course_ids = list(student.course_ids or []) + [course.id]
    elif txn.item_type == "bundle" and txn.item_id:
        bundle = db.query(Bundle).filter(Bundle.id == txn.item_id, Bundle.tenant_id == txn.tenant_id).first()
        if bundle:
            courses = (
                db.query(Course)
                .filter(Course.tenant_id == txn.tenant_id, Course.id.in_(bundle.course_ids or []))
                .all()
            )
            items = [c.title for c in courses]
            if student:
                ids = list(student.course_ids or [])
                for c in courses:
                    if c.id not in ids:
                        ids.append(c.id)
                student.course_ids = ids
    else:  # wallet | storage (or unknown item): record the purchase only
        items = [f"{txn.item_type}:{txn.item_id}"] if txn.item_id else [txn.item_type]
    if existing is None:
        db.add(Order(
            tenant_id=txn.tenant_id,
            student_id=student.id if student else None,
            student_name=student.name if student else "",
            contact=student.phone if student else "",
            status="SUCCESS",
            transaction_id=txn.order_id,
            amount=(txn.amount or 0) / 100.0,
            items=items,
        ))
    db.commit()
    return {"granted": True, "items": items, "student_id": student.id if student else None}


def mark_paid_and_grant(db: Session, txn: PaymentTransaction) -> dict:
    if txn.status != "PAID":
        txn.status = "PAID"
        txn.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(txn)
    return grant_enrolment(db, txn)


def verify_cashfree_signature(secret: str, timestamp: str, raw_body: bytes, signature: str) -> bool:
    """Cashfree PG webhook: signature = base64(HMAC-SHA256(secret,
    timestamp + raw_body))."""
    if not secret or not timestamp or not signature:
        return False
    expected = base64.b64encode(
        hmac.new(secret.encode(), (timestamp + raw_body.decode("utf-8", "replace")).encode(), hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(expected, signature.strip())


# ---------- 1. Status ----------
@router.get("/integrations/status")
def integrations_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    live = cfg.live_provider()
    sms = cfg.sms_provider()
    return {
        "cashfree": {"configured": cashfree_configured(), "env": cfg.cashfree_env()},
        "groq": {"configured": bool(resolve_provider_key(db, user.tenant_id, "groq"))},
        "gemini": {"configured": bool(resolve_provider_key(db, user.tenant_id, "gemini"))},
        "whatsapp": {"configured": bool(cfg.whatsapp_token() and cfg.whatsapp_phone_number_id())},
        "live": {"provider": live, "configured": live is not None},
        "fcm": {"configured": bool(cfg.firebase_service_account_json())},
        "sms": {"provider": sms, "configured": sms is not None},
    }


# ---------- 1b. AI provider keys (admin panel) ----------
def _require_admin(user: User) -> None:
    if (user.role or "") not in ("Super Admin", "Admin"):
        raise HTTPException(status_code=403, detail="Only an admin can manage API keys")


def _validate_provider(provider: str) -> str:
    provider = (provider or "").lower()
    if provider not in AI_PROVIDERS:
        raise HTTPException(status_code=400, detail="provider must be groq|gemini")
    return provider


class ApiKeyIn(BaseModel):
    api_key: str


@router.get("/integrations/api-keys")
def list_api_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    return {"keys": [provider_key_status(db, user.tenant_id, p) for p in AI_PROVIDERS]}


@router.put("/integrations/api-keys/{provider}")
def save_api_key(provider: str, payload: ApiKeyIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    provider = _validate_provider(provider)
    key = (payload.api_key or "").strip()
    if len(key) < 10:
        raise HTTPException(status_code=400, detail="API key looks too short — paste the full key")
    row = (
        db.query(ProviderCredential)
        .filter(ProviderCredential.tenant_id == user.tenant_id, ProviderCredential.provider == provider)
        .first()
    )
    if row is None:
        row = ProviderCredential(tenant_id=user.tenant_id, provider=provider, encrypted_value="")
        db.add(row)
    row.encrypted_value = encrypt_value(key)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return provider_key_status(db, user.tenant_id, provider)


@router.delete("/integrations/api-keys/{provider}")
def delete_api_key(provider: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    provider = _validate_provider(provider)
    row = (
        db.query(ProviderCredential)
        .filter(ProviderCredential.tenant_id == user.tenant_id, ProviderCredential.provider == provider)
        .first()
    )
    if row is not None:
        db.delete(row)
        db.commit()
    return provider_key_status(db, user.tenant_id, provider)


@router.post("/integrations/api-keys/{provider}/test")
def test_api_key(provider: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Live check: calls the provider with the saved (or env) key and
    reports ok/invalid without ever returning the key itself."""
    _require_admin(user)
    provider = _validate_provider(provider)
    key = resolve_provider_key(db, user.tenant_id, provider)
    if not key:
        raise HTTPException(status_code=503, detail=f"No {provider} API key configured")
    try:
        if provider == "groq":
            resp = httpx.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {key}"},
                timeout=30,
            )
        else:
            resp = httpx.get(f"{GEMINI_MODELS_URL}?key={key}", timeout=30)
    except Exception as exc:  # HTTPError + InvalidURL/proxy/DNS/SSL failures
        return {"provider": provider, "ok": False, "message": f"Could not reach {provider}: {exc}"}
    if resp.status_code == 200:
        return {"provider": provider, "ok": True, "message": f"{provider} key works."}
    if resp.status_code in (401, 403):
        return {"provider": provider, "ok": False, "message": f"{provider} rejected the key (invalid or expired). Paste a fresh key and save again."}
    return {"provider": provider, "ok": False, "message": f"{provider} returned HTTP {resp.status_code}."}


# ---------- 1c. Per-tenant Cashfree credentials (admin panel) ----------
# Saved keys are Fernet-encrypted per tenant (see tenant_cashfree.py)
# and take precedence over the global CASHFREE_APP_ID / CASHFREE_SECRET_KEY
# env vars. No full key is ever returned — only a masked app-id preview.
class CashfreeKeysIn(BaseModel):
    app_id: str
    secret: str
    environment: str = "sandbox"


@router.get("/integrations/cashfree")
def get_cashfree_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    return tenant_cashfree_status(db, user.tenant_id)


@router.put("/integrations/cashfree")
def save_cashfree_keys(payload: CashfreeKeysIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    app_id = (payload.app_id or "").strip()
    secret = (payload.secret or "").strip()
    environment = (payload.environment or "sandbox").lower()
    if len(app_id) < 5 or len(secret) < 5:
        raise HTTPException(status_code=400, detail="app_id and secret must each be at least 5 characters")
    if environment not in ("sandbox", "prod"):
        raise HTTPException(status_code=400, detail="environment must be sandbox|prod")
    row = (
        db.query(TenantCashfreeCredential)
        .filter(TenantCashfreeCredential.tenant_id == user.tenant_id)
        .first()
    )
    if row is None:
        row = TenantCashfreeCredential(tenant_id=user.tenant_id)
        db.add(row)
    row.encrypted_app_id = encrypt_value(app_id)
    row.encrypted_secret = encrypt_value(secret)
    row.environment = environment
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return tenant_cashfree_status(db, user.tenant_id)


@router.delete("/integrations/cashfree")
def delete_cashfree_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    row = (
        db.query(TenantCashfreeCredential)
        .filter(TenantCashfreeCredential.tenant_id == user.tenant_id)
        .first()
    )
    if row is not None:
        db.delete(row)
        db.commit()
    return tenant_cashfree_status(db, user.tenant_id)


@router.post("/integrations/cashfree/test")
def test_cashfree_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Validate the tenant's Cashfree keys WITHOUT creating a real order:
    GET /pg/orders/TEST-KEY-CHECK. Cashfree answers 404 for the unknown
    order when the keys are accepted, 401/403 when they are rejected.
    Never returns a key and never raises 500 for a transport failure."""
    _require_admin(user)
    app_id, secret, env = resolve_tenant_cashfree(db, user.tenant_id)
    if not (app_id and secret):
        raise HTTPException(status_code=503, detail="Cashfree not configured")
    base = "https://api.cashfree.com/pg" if env == "prod" else "https://sandbox.cashfree.com/pg"
    try:
        resp = httpx.get(
            f"{base}/orders/TEST-KEY-CHECK",
            headers={
                "x-api-version": "2023-08-01",
                "x-client-id": app_id,
                "x-client-secret": secret,
            },
            timeout=30,
        )
    except Exception as exc:  # HTTPError + InvalidURL/proxy/DNS/SSL failures
        return {"ok": False, "message": f"Could not reach Cashfree: {exc}"}
    if resp.status_code == 404:
        return {"ok": True, "message": "Cashfree keys valid"}
    if resp.status_code in (401, 403):
        return {"ok": False, "message": "Cashfree rejected the keys"}
    return {"ok": False, "message": f"Cashfree returned HTTP {resp.status_code}."}


# ---------- 2. Cashfree payments (admin) ----------
class CreateOrderIn(BaseModel):
    item_type: str  # course|bundle|wallet|storage
    item_id: int | None = None
    amount: float | None = None  # rupees; required for wallet/storage, optional otherwise
    student_id: int | None = None


@router.post("/payments/create-order", status_code=201)
def admin_create_order(payload: CreateOrderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Per-tenant Cashfree keys (DB first, env fallback); honest 503 when
    # the tenant has neither.
    cf_app_id, cf_secret, cf_env = resolve_tenant_cashfree(db, user.tenant_id)
    if not (cf_app_id and cf_secret):
        raise HTTPException(status_code=503, detail="Cashfree not configured")
    item_type = payload.item_type.lower()
    if item_type not in ("course", "bundle", "wallet", "storage"):
        raise HTTPException(status_code=400, detail="item_type must be course|bundle|wallet|storage")
    amount_rupees: float | None = payload.amount
    if item_type == "course":
        if payload.item_id is None:
            raise HTTPException(status_code=400, detail="item_id is required for course")
        course = db.query(Course).filter(Course.id == payload.item_id, Course.tenant_id == user.tenant_id).first()
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        amount_rupees = course.price
    elif item_type == "bundle":
        if payload.item_id is None:
            raise HTTPException(status_code=400, detail="item_id is required for bundle")
        bundle = db.query(Bundle).filter(Bundle.id == payload.item_id, Bundle.tenant_id == user.tenant_id).first()
        if bundle is None:
            raise HTTPException(status_code=404, detail="Bundle not found")
        amount_rupees = bundle.price
    if amount_rupees is None or amount_rupees <= 0:
        raise HTTPException(status_code=400, detail="amount must be a positive number of rupees")
    student = None
    if payload.student_id:
        student = db.query(Student).filter(Student.id == payload.student_id, Student.tenant_id == user.tenant_id).first()
        if student is None:
            raise HTTPException(status_code=404, detail="Student not found")
    order_id = new_order_id(user.tenant_id)
    txn = PaymentTransaction(
        tenant_id=user.tenant_id,
        order_id=order_id,
        item_type=item_type,
        item_id=payload.item_id,
        student_id=student.id if student else None,
        amount=int(round(amount_rupees * 100)),
        currency="INR",
        status="PENDING",
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    cf = create_cashfree_order(
        order_id,
        amount_rupees,
        customer_id=f"tenant-{user.tenant_id}-{'student-' + str(student.id) if student else 'admin'}",
        customer_phone=student.phone if student else "",
        app_id=cf_app_id,
        secret=cf_secret,
        env=cf_env,
    )
    txn.cashfree_order_id = cf.get("cf_order_id") or cf.get("order_id") or ""
    txn.payment_session_id = cf.get("payment_session_id") or ""
    db.commit()
    db.refresh(txn)
    payment_link = cf.get("payment_link")
    if not payment_link and isinstance(cf.get("payments"), dict):
        payment_link = cf["payments"].get("url")
    return {
        "order_id": txn.order_id,
        "cashfree_order_id": txn.cashfree_order_id,
        "payment_session_id": txn.payment_session_id,
        "payment_link": payment_link,
        "amount": txn.amount,
        "amount_rupees": amount_rupees,
        "status": txn.status,
    }


@router.get("/payments/{order_id}", response_model=PaymentTransactionOut)
def get_payment(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    txn = _get_txn_or_404(db, user.tenant_id, order_id)
    return txn_out(txn)


@router.post("/payments/cashfree/webhook")
async def cashfree_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    signature = request.headers.get("x-webhook-signature", "")
    timestamp = request.headers.get("x-webhook-timestamp", "")
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")
    data = payload.get("data") or {}
    order_data = data.get("order") or {}
    payment_data = data.get("payment") or {}
    order_id = order_data.get("order_id") or payload.get("order_id") or ""
    # Resolve the tenant from the stored order BEFORE verifying the
    # signature, so the tenant's own Cashfree secret is used (DB first,
    # env fallback). For an unknown order there is no tenant to resolve,
    # so the global env secret is used, as before.
    txn = db.query(PaymentTransaction).filter(PaymentTransaction.order_id == order_id).first() if order_id else None
    if txn is not None:
        _app_id, secret, _env = resolve_tenant_cashfree(db, txn.tenant_id)
    else:
        secret = cfg.cashfree_secret_key()
    if not verify_cashfree_signature(secret, timestamp, raw, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    event_type = str(payload.get("type") or "")
    payment_status = str(payment_data.get("payment_status") or payment_data.get("paymentStatus") or "")
    is_success = "PAYMENT_SUCCESS" in event_type.upper() or payment_status.upper() == "SUCCESS"
    if not order_id:
        return {"status": "ignored", "reason": "no order_id"}
    if txn is None:
        return {"status": "ignored", "reason": "unknown order_id"}
    if is_success:
        mark_paid_and_grant(db, txn)
    else:
        txn.status = "FAILED"
        txn.updated_at = datetime.utcnow()
        db.commit()
    return {"status": "ok", "order_id": order_id, "transaction_status": txn.status}


@router.get("/payments/cashfree/return")
def cashfree_return(order_id: str = Query(...), db: Session = Depends(get_db)):
    txn = db.query(PaymentTransaction).filter(PaymentTransaction.order_id == order_id).first()
    if txn is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    cf_app_id, cf_secret, cf_env = resolve_tenant_cashfree(db, txn.tenant_id)
    if not (cf_app_id and cf_secret):
        raise HTTPException(status_code=503, detail="Cashfree not configured")
    if not txn.cashfree_order_id:
        return {"order_id": order_id, "status": txn.status}
    payments = fetch_cashfree_payments(
        txn.cashfree_order_id, app_id=cf_app_id, secret=cf_secret, env=cf_env
    )
    paid = any(
        str(p.get("payment_status") or p.get("paymentStatus") or "").upper() == "SUCCESS"
        for p in payments
        if isinstance(p, dict)
    )
    if paid:
        mark_paid_and_grant(db, txn)
    return {"order_id": order_id, "status": txn.status, "payments_checked": len(payments)}


# ---------- 3. AI question generation ----------
def _extract_text(filename: str, data: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("txt", "csv", "md"):
        return data.decode("utf-8", "replace")
    if ext == "pdf":
        try:
            from pypdf import PdfReader
        except ImportError:
            from PyPDF2 import PdfReader  # type: ignore[no-redef]
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    if ext == "docx":
        from docx import Document

        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    if ext == "xlsx":
        from openpyxl import load_workbook

        wb = load_workbook(io.BytesIO(data), data_only=True, read_only=True)
        rows = []
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                rows.append(", ".join("" if c is None else str(c) for c in row))
        return "\n".join(rows)
    if ext in ("jpg", "jpeg", "png", "webp", "gif"):
        try:
            import pytesseract  # type: ignore
            from PIL import Image
        except ImportError:
            raise HTTPException(
                status_code=400,
                detail="Image text extraction is not available (pytesseract not installed). Upload a PDF, DOCX, XLSX, CSV or TXT file instead.",
            )
        return pytesseract.image_to_string(Image.open(io.BytesIO(data)))
    raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext or '?'} (pdf/txt/xlsx/csv/docx/image)")


def _normalise_questions(raw: object, count: int, question_types: str) -> list[dict]:
    items: list = []
    if isinstance(raw, dict):
        items = raw.get("questions") or raw.get("items") or []
    elif isinstance(raw, list):
        items = raw
    out: list[dict] = []
    for q in items[:count]:
        if not isinstance(q, dict):
            continue
        text = str(q.get("question") or q.get("question_text") or "").strip()
        if not text:
            continue
        if question_types == "short":
            answer = str(q.get("answer") or q.get("correct_answer") or "").strip()
            out.append({"question": text, "options": [], "correct_option": "", "answer": answer, "marks": 1.0})
            continue
        options = q.get("options") or []
        if isinstance(options, dict):
            options = [options.get(k, "") for k in ("A", "B", "C", "D")]
        options = [str(o).strip() for o in list(options)[:4]]
        while len(options) < 4:
            options.append("")
        correct = str(q.get("correct_option") or q.get("answer") or q.get("correct_answer") or "A").strip().upper()
        if correct not in ("A", "B", "C", "D"):
            # Accept a full answer string: match it against the options.
            correct = "A"
            for i, opt in enumerate(options):
                if opt and opt.lower() == str(q.get("answer") or q.get("correct_answer") or "").lower():
                    correct = "ABCD"[i]
                    break
        out.append({"question": text, "options": options, "correct_option": correct, "answer": "", "marks": 1.0})
    return out


def _call_groq(api_key: str, prompt: str) -> str:
    """Returns the raw JSON text from Groq chat completions."""
    try:
        resp = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "You generate exam questions. Always return valid JSON only, no markdown, no commentary."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "response_format": {"type": "json_object"},
            },
            timeout=120,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Groq request failed: {exc}")
    except Exception as exc:  # proxy/DNS/SSL failures (e.g. InvalidURL) → clean 502, not 500
        raise HTTPException(status_code=502, detail=f"Groq request failed: {exc}")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq request failed ({resp.status_code})")
    try:
        return resp.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Groq returned an unreadable response")


def _call_gemini(api_key: str, prompt: str) -> str:
    """Returns the raw JSON text from Gemini generateContent."""
    try:
        resp = httpx.post(
            f"{GEMINI_URL}?key={api_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt + "\nReturn valid JSON only, no markdown fences, no commentary."}]}],
                "generationConfig": {"temperature": 0.7, "responseMimeType": "application/json"},
            },
            timeout=120,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}")
    except Exception as exc:  # proxy/DNS/SSL failures (e.g. InvalidURL) → clean 502, not 500
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini request failed ({resp.status_code})")
    try:
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Gemini returned an unreadable response")
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return text


@router.post("/ai/generate-questions", status_code=201)
async def ai_generate_questions(
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
    topic: str = Form(""),
    class_name: str = Form(""),
    difficulty: str = Form("medium"),
    count: int = Form(5),
    question_types: str = Form("mcq"),
    provider: str = Form("groq"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    provider = _validate_provider(provider)
    api_key = resolve_provider_key(db, user.tenant_id, provider)
    if not api_key:
        raise HTTPException(status_code=503, detail=f"AI not configured — add a {provider} API key in Integrations")
    if count < 1 or count > MAX_AI_QUESTIONS:
        raise HTTPException(status_code=400, detail=f"count must be between 1 and {MAX_AI_QUESTIONS}")
    if question_types not in ("mcq", "short"):
        raise HTTPException(status_code=400, detail="question_types must be mcq|short")
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"
    source_text = (text or "").strip()
    source_filename = ""
    if file is not None and file.filename:
        data = await file.read()
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds the 10 MB limit")
        if not data:
            raise HTTPException(status_code=400, detail="Empty file")
        source_text = _extract_text(file.filename, data)
        source_filename = file.filename
    if not source_text.strip() and not topic.strip():
        raise HTTPException(status_code=400, detail="Provide a file, text, or a topic")
    source_text = source_text[:12000]
    if question_types == "mcq":
        fmt = 'Return ONLY a JSON object: {"questions": [{"question": "...", "options": ["...", "...", "...", "..."], "correct_option": "A|B|C|D"}]}'
    else:
        fmt = 'Return ONLY a JSON object: {"questions": [{"question": "...", "answer": "..."}]}'
    prompt = (
        f"Generate exactly {count} {question_types} questions for class '{class_name or 'general'}' "
        f"on the topic '{topic or 'the provided material'}' at {difficulty} difficulty. "
        f"Source material:\n{source_text}\n{fmt}"
    )
    content = _call_groq(api_key, prompt) if provider == "groq" else _call_gemini(api_key, prompt)
    try:
        parsed = json.loads(content)
    except (ValueError, TypeError):
        raise HTTPException(status_code=502, detail=f"{provider} returned an unreadable response")
    questions = _normalise_questions(parsed, count, question_types)
    if not questions:
        raise HTTPException(status_code=502, detail=f"{provider} returned no usable questions")
    gen = AIGeneration(
        tenant_id=user.tenant_id,
        source_filename=source_filename,
        topic=topic,
        class_name=class_name,
        difficulty=difficulty,
        count=len(questions),
        draft_json=questions,
        status="draft",
    )
    db.add(gen)
    db.commit()
    db.refresh(gen)
    return {"generation_id": gen.id, "questions": questions, "status": "draft", "provider": provider}


class SaveQuestionsIn(BaseModel):
    generation_id: int
    test_series_id: int
    questions: list[dict] = []


@router.post("/ai/questions/save", status_code=201)
def ai_save_questions(payload: SaveQuestionsIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    gen = db.query(AIGeneration).filter(AIGeneration.id == payload.generation_id, AIGeneration.tenant_id == user.tenant_id).first()
    if gen is None:
        raise HTTPException(status_code=404, detail="Generation not found")
    series = db.query(TestSeries).filter(TestSeries.id == payload.test_series_id, TestSeries.tenant_id == user.tenant_id).first()
    if series is None:
        raise HTTPException(status_code=404, detail="Test series not found")
    questions = payload.questions or gen.draft_json or []
    if not questions:
        raise HTTPException(status_code=400, detail="No questions to save")
    created: list[Question] = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        qtext = str(q.get("question") or q.get("question_text") or "").strip()
        if not qtext:
            continue
        options = q.get("options") or []
        if isinstance(options, dict):
            options = [options.get(k, "") for k in ("A", "B", "C", "D")]
        options = [str(o) for o in list(options)[:4]]
        while len(options) < 4:
            options.append(str(q.get("answer") or "") if len(options) == 0 else "")
        correct = str(q.get("correct_option") or "A").strip().upper()
        if correct not in ("A", "B", "C", "D"):
            correct = "A"
        obj = Question(
            tenant_id=user.tenant_id,
            test_series_id=series.id,
            question_text=qtext,
            option_a=options[0],
            option_b=options[1],
            option_c=options[2],
            option_d=options[3],
            correct_option=correct,
            marks=float(q.get("marks") or 1.0),
            negative_marks=float(q.get("negative_marks") or 0.0),
        )
        db.add(obj)
        created.append(obj)
    if not created:
        raise HTTPException(status_code=400, detail="No valid questions to save")
    gen.status = "saved"
    gen.test_series_id = series.id
    db.commit()
    for obj in created:
        db.refresh(obj)
    return {"generation_id": gen.id, "test_series_id": series.id, "saved": len(created),
            "question_ids": [o.id for o in created]}


@router.get("/ai/generations", response_model=list[AIGenerationOut])
def ai_list_generations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gens = (
        db.query(AIGeneration)
        .filter(AIGeneration.tenant_id == user.tenant_id)
        .order_by(AIGeneration.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return gens


# ---------- 4. WhatsApp ----------
class WhatsAppSendIn(BaseModel):
    to: str
    template: str
    params: list[str] = []
    message: str | None = None


@router.post("/integrations/whatsapp/send")
def whatsapp_send(payload: WhatsAppSendIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.template not in WHATSAPP_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"template must be one of: {', '.join(sorted(WHATSAPP_TEMPLATES))}")
    if not cfg.whatsapp_token() or not cfg.whatsapp_phone_number_id():
        db.add(IntegrationLog(tenant_id=user.tenant_id, channel="whatsapp", recipient=payload.to,
                              template_name=payload.template, status="not_configured",
                              detail="WhatsApp not configured"))
        db.commit()
        raise HTTPException(status_code=503, detail="WhatsApp not configured")
    body: dict = {
        "messaging_product": "whatsapp",
        "to": payload.to,
        "type": "template",
        "template": {
            "name": payload.template,
            "language": {"code": "en"},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": p} for p in payload.params]}]
            if payload.params else [],
        },
    }
    try:
        resp = httpx.post(
            f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{cfg.whatsapp_phone_number_id()}/messages",
            headers={"Authorization": f"Bearer {cfg.whatsapp_token()}", "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
    except httpx.HTTPError as exc:
        db.add(IntegrationLog(tenant_id=user.tenant_id, channel="whatsapp", recipient=payload.to,
                              template_name=payload.template, status="failed", detail=str(exc)))
        db.commit()
        raise HTTPException(status_code=502, detail=f"WhatsApp request failed: {exc}")
    if resp.status_code not in (200, 201):
        db.add(IntegrationLog(tenant_id=user.tenant_id, channel="whatsapp", recipient=payload.to,
                              template_name=payload.template, status="failed",
                              detail=f"Meta API returned {resp.status_code}"))
        db.commit()
        raise HTTPException(status_code=502, detail=f"WhatsApp send failed ({resp.status_code})")
    db.add(IntegrationLog(tenant_id=user.tenant_id, channel="whatsapp", recipient=payload.to,
                          template_name=payload.template, status="sent",
                          detail=json.dumps(resp.json())[:500]))
    db.commit()
    return {"status": "sent", "template": payload.template, "to": payload.to, "response": resp.json()}


@router.get("/integrations/logs", response_model=list[IntegrationLogOut])
def integration_logs(
    channel: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(IntegrationLog).filter(IntegrationLog.tenant_id == user.tenant_id)
    if channel:
        q = q.filter(IntegrationLog.channel == channel)
    return q.order_by(IntegrationLog.id.desc()).offset((page - 1) * per_page).limit(per_page).all()


# ---------- 5. Push (FCM) ----------
class PushSendIn(BaseModel):
    title: str
    body: str
    topic: str | None = None
    student_ids: list[int] | None = None


def _fcm_app():
    """Initialise firebase-admin from FIREBASE_SERVICE_ACCOUNT_JSON (a JSON
    string or a path to a service-account file). Raises RuntimeError if the
    library or the credential is unavailable."""
    try:
        import firebase_admin  # type: ignore
        from firebase_admin import credentials  # type: ignore
    except ImportError as exc:
        raise RuntimeError("firebase-admin is not installed") from exc
    raw = cfg.firebase_service_account_json()
    if not raw:
        raise RuntimeError("FCM not configured")
    if not firebase_admin._apps:
        if raw.strip().startswith("{"):
            cred = credentials.Certificate(json.loads(raw))
        else:
            cred = credentials.Certificate(raw)
        firebase_admin.initialize_app(cred)
    return firebase_admin


@router.post("/integrations/push/send")
def push_send(payload: PushSendIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not cfg.firebase_service_account_json():
        db.add(IntegrationLog(tenant_id=user.tenant_id, channel="push", recipient=payload.topic or "",
                              template_name="", status="not_configured", detail="FCM not configured"))
        db.commit()
        raise HTTPException(status_code=503, detail="Push not configured")
    if not payload.topic and not payload.student_ids:
        raise HTTPException(status_code=400, detail="Provide topic or student_ids")
    if payload.student_ids and not payload.topic:
        # No FCM device tokens are stored for students yet, so targeted
        # per-student push cannot be delivered. Use a topic instead.
        raise HTTPException(status_code=400, detail="Per-student push needs registered device tokens; send to a topic instead")
    try:
        fb = _fcm_app()
        from firebase_admin import messaging  # type: ignore

        message = messaging.Message(
            notification=messaging.Notification(title=payload.title, body=payload.body),
            topic=payload.topic,
        )
        message_id = messaging.send(message)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - surface provider errors as 502
        db.add(IntegrationLog(tenant_id=user.tenant_id, channel="push", recipient=payload.topic or "",
                              template_name="", status="failed", detail=str(exc)[:500]))
        db.commit()
        raise HTTPException(status_code=502, detail=f"Push send failed: {exc}")
    db.add(IntegrationLog(tenant_id=user.tenant_id, channel="push", recipient=payload.topic or "",
                          template_name="", status="sent", detail=f"message_id={message_id}"))
    db.commit()
    return {"status": "sent", "topic": payload.topic, "message_id": message_id}


# ---------- 6. Live classes ----------
@router.get("/live/config")
def live_config(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ = db
    provider = cfg.live_provider()
    return {"provider": provider, "configured": provider is not None, "join_url_template": None}
