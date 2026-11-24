"""Platform (Super Admin) panel: env-based platform admin login,
institute onboarding + suspension, subscription plans, per-tenant
Cashfree credentials, and per-tenant Cashfree resolution in the payment
flow. No real provider calls are made: Cashfree is mocked, and all
credentials used here are test-only values.
"""
import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta

import pytest

from app.database import SessionLocal
from app.models import (
    Role,
    Settings,
    Student,
    SubscriptionPlan,
    Tenant,
    TenantCashfreeCredential,
    TenantSubscription,
    User,
)

PLATFORM_USER = "platform"
PLATFORM_PASS = "test-only-platform-password"
TEST_CF_APP_ID = "test_cf_app_id_12345"
TEST_CF_SECRET = "test_cf_secret_1234567890"
TEST_ENV_APP_ID = "env_cf_app_id_12345"
TEST_ENV_SECRET = "env_cf_secret_1234567890"

SEED_ORG_CODES = ("DEMO0001", "SECN0002")


@pytest.fixture(autouse=True)
def _clean_platform_state():
    yield
    db = SessionLocal()
    try:
        db.query(TenantSubscription).delete()
        db.query(SubscriptionPlan).delete()
        db.query(TenantCashfreeCredential).delete()
        # Remove tenants created by these tests (and their tenant-scoped
        # rows); the seeded demo tenants stay. Settings/Role rows must go
        # too — SQLite reuses a freed tenant id on the next insert, and
        # Settings.tenant_id is unique.
        created = db.query(Tenant).filter(~Tenant.org_code.in_(SEED_ORG_CODES)).all()
        for tenant in created:
            db.query(User).filter(User.tenant_id == tenant.id).delete()
            db.query(Student).filter(Student.tenant_id == tenant.id).delete()
            db.query(Settings).filter(Settings.tenant_id == tenant.id).delete()
            db.query(Role).filter(Role.tenant_id == tenant.id).delete()
            db.delete(tenant)
        db.commit()
    finally:
        db.close()


def _platform_headers(client, monkeypatch, username=PLATFORM_USER, password=PLATFORM_PASS):
    monkeypatch.setenv("PLATFORM_ADMIN_USERNAME", PLATFORM_USER)
    monkeypatch.setenv("PLATFORM_ADMIN_PASSWORD", PLATFORM_PASS)
    r = client.post("/api/platform/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _create_institute(client, headers, name="Platform Test Institute", username="ptadmin"):
    r = client.post(
        "/api/platform/institutes",
        json={
            "institute_name": name,
            "admin_name": "Platform Tester",
            "admin_username": username,
            "email": f"{username}@example.test",
            "phone": "9876500001",
            "password": "PtAdmin@123",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


class _FakeResp:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


# ---------- Platform login ----------
def test_platform_login_503_when_env_unset(client, monkeypatch):
    monkeypatch.delenv("PLATFORM_ADMIN_USERNAME", raising=False)
    monkeypatch.delenv("PLATFORM_ADMIN_PASSWORD", raising=False)
    r = client.post("/api/platform/auth/login", json={"username": "x", "password": "y"})
    assert r.status_code == 503, r.text
    assert r.json()["detail"] == "Platform admin not configured"


def test_platform_login_401_wrong_credentials(client, monkeypatch):
    monkeypatch.setenv("PLATFORM_ADMIN_USERNAME", PLATFORM_USER)
    monkeypatch.setenv("PLATFORM_ADMIN_PASSWORD", PLATFORM_PASS)
    r = client.post("/api/platform/auth/login", json={"username": PLATFORM_USER, "password": "wrong"})
    assert r.status_code == 401, r.text
    r = client.post("/api/platform/auth/login", json={"username": "someone-else", "password": PLATFORM_PASS})
    assert r.status_code == 401, r.text


def test_platform_login_200_and_token_works(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    r = client.get("/api/platform/stats", headers=headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["institutes"] >= 2  # seeded demo tenants
    assert d["students"] >= 0
    assert isinstance(d["total_revenue"], float)


def test_tenant_token_rejected_on_platform_endpoints(client, admin_headers, monkeypatch):
    monkeypatch.setenv("PLATFORM_ADMIN_USERNAME", PLATFORM_USER)
    monkeypatch.setenv("PLATFORM_ADMIN_PASSWORD", PLATFORM_PASS)
    # A tenant admin token (numeric sub) must not open platform endpoints.
    assert client.get("/api/platform/stats", headers=admin_headers).status_code == 401
    assert client.get("/api/platform/institutes", headers=admin_headers).status_code == 401
    assert client.get("/api/platform/plans", headers=admin_headers).status_code == 401
    # No token at all: 401 as well.
    assert client.get("/api/platform/stats").status_code == 401


def test_student_token_rejected_on_platform_endpoints(client, monkeypatch):
    r = client.post(
        "/api/student/auth/verify",
        json={"org_code": "DEMO0001", "phone": "9876500991", "otp": "123456", "name": "Platform Check"},
    )
    assert r.status_code == 200, r.text
    student_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/platform/stats", headers=student_headers).status_code == 401


# ---------- Institutes ----------
def test_create_institute_returns_org_code_and_creates_tenant_and_admin(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    created = _create_institute(client, headers)
    assert len(created["org_code"]) == 8
    assert created["admin_username"] == "ptadmin"
    assert created["tenant_id"]

    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == created["tenant_id"]).first()
        assert tenant is not None
        assert tenant.org_code == created["org_code"]
        admin = db.query(User).filter(User.tenant_id == tenant.id, User.username == "ptadmin").first()
        assert admin is not None
        assert admin.role == "Super Admin"
    finally:
        db.close()

    # The new admin can log in with the returned org_code's tenant.
    r = client.post("/api/auth/login", json={"username": "ptadmin", "password": "PtAdmin@123"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["org_code"] == created["org_code"]


def test_create_institute_duplicate_username_rejected(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    _create_institute(client, headers)
    # Same admin username again (different institute name): the global
    # username lookup in tenant login would become ambiguous, so 400.
    r = client.post(
        "/api/platform/institutes",
        json={
            "institute_name": "Another Institute",
            "admin_name": "Second",
            "admin_username": "ptadmin",
            "email": "other@example.test",
            "phone": "9876500002",
            "password": "PtAdmin@123",
        },
        headers=headers,
    )
    assert r.status_code == 400, r.text


def test_create_institute_validation(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    base = {
        "institute_name": "Bad Institute",
        "admin_name": "Bad",
        "admin_username": "badadmin",
        "email": "bad@example.test",
        "phone": "9876500003",
        "password": "Bad@1234",
    }
    r = client.post("/api/platform/institutes", json={**base, "password": "short"}, headers=headers)
    assert r.status_code == 400, r.text
    r = client.post("/api/platform/institutes", json={**base, "email": "not-an-email"}, headers=headers)
    assert r.status_code in (400, 422), r.text
    r = client.post("/api/platform/institutes", json={**base, "admin_username": "ab"}, headers=headers)
    assert r.status_code == 400, r.text


def test_list_and_detail_institutes(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    created = _create_institute(client, headers)
    r = client.get("/api/platform/institutes", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["total"] >= 3
    mine = [i for i in r.json()["items"] if i["id"] == created["tenant_id"]]
    assert len(mine) == 1
    assert mine[0]["org_code"] == created["org_code"]
    assert mine[0]["counts"]["users"] == 1
    assert mine[0]["subscription"] is None
    assert mine[0]["cashfree"]["configured"] is False

    r = client.get(f"/api/platform/institutes/{created['tenant_id']}", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["admins"][0]["username"] == "ptadmin"

    # Search by org_code fragment.
    r = client.get(f"/api/platform/institutes?q={created['org_code'][:4]}", headers=headers)
    assert any(i["id"] == created["tenant_id"] for i in r.json()["items"])
    assert client.get("/api/platform/institutes/999999", headers=headers).status_code == 404


# ---------- Suspension ----------
def test_suspend_blocks_tenant_admin_and_student_login(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    created = _create_institute(client, headers)
    org_code = created["org_code"]

    # Student registered BEFORE suspension, so the login block is what
    # is being tested (not registration).
    r = client.post(
        "/api/student/auth/register",
        json={"org_code": org_code, "name": "Suspended Student", "phone": "9876500101", "password": "Stud@123"},
    )
    assert r.status_code == 201, r.text

    # Both logins work while active.
    assert client.post("/api/auth/login", json={"username": "ptadmin", "password": "PtAdmin@123"}).status_code == 200
    assert client.post(
        "/api/student/auth/login",
        json={"org_code": org_code, "phone": "9876500101", "password": "Stud@123"},
    ).status_code == 200
    assert client.post(
        "/api/student/auth/verify",
        json={"org_code": org_code, "phone": "9876500101", "otp": "123456"},
    ).status_code == 200

    r = client.patch(
        f"/api/platform/institutes/{created['tenant_id']}/status",
        json={"suspended": True},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["suspended"] is True

    r = client.post("/api/auth/login", json={"username": "ptadmin", "password": "PtAdmin@123"})
    assert r.status_code == 403, r.text
    assert r.json()["detail"] == "Institute suspended"
    r = client.post(
        "/api/student/auth/login",
        json={"org_code": org_code, "phone": "9876500101", "password": "Stud@123"},
    )
    assert r.status_code == 403, r.text
    r = client.post(
        "/api/student/auth/verify",
        json={"org_code": org_code, "phone": "9876500101", "otp": "123456"},
    )
    assert r.status_code == 403, r.text

    # Unsuspend restores logins.
    r = client.patch(
        f"/api/platform/institutes/{created['tenant_id']}/status",
        json={"suspended": False},
        headers=headers,
    )
    assert r.status_code == 200
    assert client.post("/api/auth/login", json={"username": "ptadmin", "password": "PtAdmin@123"}).status_code == 200


# ---------- Plans ----------
def test_plan_seed_and_crud(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    r = client.get("/api/platform/plans", headers=headers)
    assert r.status_code == 200, r.text
    plans = r.json()["plans"]
    assert len(plans) == 2
    by_name = {p["name"]: p for p in plans}
    assert by_name["Starter"]["monthly_price_inr"] == 0
    assert by_name["Starter"]["features"] == ["Up to 100 students", "Courses & test series"]
    assert by_name["Growth"]["monthly_price_inr"] == 999
    assert by_name["Growth"]["yearly_price_inr"] == 9999

    # Second read does not re-seed.
    assert len(client.get("/api/platform/plans", headers=headers).json()["plans"]) == 2

    r = client.post(
        "/api/platform/plans",
        json={"name": "Pro", "monthly_price_inr": 1999, "yearly_price_inr": 19999,
              "features": ["Everything in Growth", "Priority support"]},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    pro_id = r.json()["id"]
    assert r.json()["features"] == ["Everything in Growth", "Priority support"]

    r = client.patch(f"/api/platform/plans/{pro_id}", json={"monthly_price_inr": 2499}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["monthly_price_inr"] == 2499

    # Soft-delete: active=False, row stays.
    r = client.delete(f"/api/platform/plans/{pro_id}", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["active"] is False
    db = SessionLocal()
    try:
        assert db.query(SubscriptionPlan).filter(SubscriptionPlan.id == pro_id).first() is not None
    finally:
        db.close()

    assert client.patch("/api/platform/plans/999999", json={"name": "Nope"}, headers=headers).status_code == 404


def test_plan_with_subscriptions_cannot_be_deleted(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    created = _create_institute(client, headers)
    plans = client.get("/api/platform/plans", headers=headers).json()["plans"]
    growth = [p for p in plans if p["name"] == "Growth"][0]
    r = client.post(
        f"/api/platform/institutes/{created['tenant_id']}/subscription",
        json={"plan_id": growth["id"], "billing_cycle": "monthly", "status": "active"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    r = client.delete(f"/api/platform/plans/{growth['id']}", headers=headers)
    assert r.status_code == 400, r.text


# ---------- Subscriptions ----------
def test_subscription_assign_monthly_and_yearly_ends_at(client, monkeypatch):
    headers = _platform_headers(client, monkeypatch)
    created = _create_institute(client, headers)
    plans = client.get("/api/platform/plans", headers=headers).json()["plans"]
    growth = [p for p in plans if p["name"] == "Growth"][0]

    before = datetime.utcnow()
    r = client.post(
        f"/api/platform/institutes/{created['tenant_id']}/subscription",
        json={"plan_id": growth["id"], "billing_cycle": "monthly", "status": "active"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    sub = r.json()
    assert sub["plan_name"] == "Growth"
    assert sub["billing_cycle"] == "monthly"
    ends = datetime.fromisoformat(sub["ends_at"])
    assert timedelta(days=29) < ends - before < timedelta(days=31)

    # Re-assign yearly: upsert, same row, ends ~+365d.
    before = datetime.utcnow()
    r = client.post(
        f"/api/platform/institutes/{created['tenant_id']}/subscription",
        json={"plan_id": growth["id"], "billing_cycle": "yearly", "status": "trial"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["id"] == sub["id"]
    assert r.json()["status"] == "trial"
    ends = datetime.fromisoformat(r.json()["ends_at"])
    assert timedelta(days=364) < ends - before < timedelta(days=366)

    # Bad plan / bad cycle.
    r = client.post(
        f"/api/platform/institutes/{created['tenant_id']}/subscription",
        json={"plan_id": 999999, "billing_cycle": "monthly", "status": "active"},
        headers=headers,
    )
    assert r.status_code == 404, r.text
    r = client.post(
        f"/api/platform/institutes/{created['tenant_id']}/subscription",
        json={"plan_id": growth["id"], "billing_cycle": "weekly", "status": "active"},
        headers=headers,
    )
    assert r.status_code == 400, r.text


def test_stats_reflect_institute_and_revenue(client, monkeypatch, admin_headers):
    headers = _platform_headers(client, monkeypatch)
    before = client.get("/api/platform/stats", headers=headers).json()
    _create_institute(client, headers)
    after = client.get("/api/platform/stats", headers=headers).json()
    assert after["institutes"] == before["institutes"] + 1
    # Seeded demo orders are SUCCESS rows; revenue is their real sum.
    assert after["total_revenue"] >= before["total_revenue"]
    assert after["total_revenue"] > 0  # demo seed has SUCCESS orders


# ---------- Per-tenant Cashfree ----------
def test_cashfree_save_get_masked_only(client, admin_headers, monkeypatch):
    monkeypatch.delenv("CASHFREE_APP_ID", raising=False)
    monkeypatch.delenv("CASHFREE_SECRET_KEY", raising=False)
    r = client.get("/api/integrations/cashfree", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"configured": False, "source": "none", "environment": "sandbox", "masked_app_id": ""}

    r = client.put(
        "/api/integrations/cashfree",
        json={"app_id": TEST_CF_APP_ID, "secret": TEST_CF_SECRET, "environment": "sandbox"},
        headers=admin_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["configured"] is True
    assert body["source"] == "db"
    assert body["masked_app_id"] == "test...2345"
    assert TEST_CF_APP_ID not in r.text  # full app id never returned
    assert TEST_CF_SECRET not in r.text  # full secret never returned

    r = client.get("/api/integrations/cashfree", headers=admin_headers)
    assert r.json()["masked_app_id"] == "test...2345"
    assert TEST_CF_APP_ID not in r.text
    assert TEST_CF_SECRET not in r.text

    # Short values rejected; bad environment rejected.
    assert client.put("/api/integrations/cashfree", json={"app_id": "ab", "secret": TEST_CF_SECRET}, headers=admin_headers).status_code == 400
    assert client.put("/api/integrations/cashfree", json={"app_id": TEST_CF_APP_ID, "secret": TEST_CF_SECRET, "environment": "live"}, headers=admin_headers).status_code == 400

    r = client.delete("/api/integrations/cashfree", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["configured"] is False


def test_cashfree_test_endpoint_mocked(client, admin_headers, monkeypatch):
    import app.routers.integrations as integ

    monkeypatch.delenv("CASHFREE_APP_ID", raising=False)
    monkeypatch.delenv("CASHFREE_SECRET_KEY", raising=False)
    # No keys at all: honest 503.
    assert client.post("/api/integrations/cashfree/test", headers=admin_headers).status_code == 503

    client.put(
        "/api/integrations/cashfree",
        json={"app_id": TEST_CF_APP_ID, "secret": TEST_CF_SECRET, "environment": "sandbox"},
        headers=admin_headers,
    )
    monkeypatch.setattr(integ.httpx, "get", lambda *a, **k: _FakeResp(404, {"message": "Order not found"}))
    r = client.post("/api/integrations/cashfree/test", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "message": "Cashfree keys valid"}

    monkeypatch.setattr(integ.httpx, "get", lambda *a, **k: _FakeResp(401, {"message": "Unauthorized"}))
    r = client.post("/api/integrations/cashfree/test", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": False, "message": "Cashfree rejected the keys"}

    def _boom(*args, **kwargs):
        import httpx

        raise httpx.InvalidURL("Invalid port: ':1]'")

    monkeypatch.setattr(integ.httpx, "get", _boom)
    r = client.post("/api/integrations/cashfree/test", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is False
    assert "Could not reach Cashfree" in r.json()["message"]


def _student_headers(client, org_code, phone, name="Platform Buyer"):
    r = client.post("/api/student/auth/verify", json={"org_code": org_code, "phone": phone, "otp": "123456", "name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _fake_cashfree_post(url, headers=None, json=None, timeout=None):
    return _FakeResp(201, {
        "cf_order_id": "cf_test_123",
        "order_id": json["order_id"],
        "payment_session_id": "sess_test_abc",
        "payment_link": "https://example.test/pay/sess_test_abc",
    })


def test_student_create_order_falls_back_to_env_keys(client, monkeypatch):
    """No tenant keys saved: the student create-order uses the env keys."""
    import app.routers.integrations as integ

    monkeypatch.delenv("CASHFREE_APP_ID", raising=False)
    monkeypatch.delenv("CASHFREE_SECRET_KEY", raising=False)
    monkeypatch.setenv("CASHFREE_APP_ID", TEST_ENV_APP_ID)
    monkeypatch.setenv("CASHFREE_SECRET_KEY", TEST_ENV_SECRET)
    monkeypatch.setenv("CASHFREE_ENV", "SANDBOX")
    seen: dict = {}

    def _capture(url, headers=None, json=None, timeout=None):
        seen["headers"] = headers
        seen["url"] = url
        return _fake_cashfree_post(url, headers, json, timeout)

    monkeypatch.setattr(integ.httpx, "post", _capture)
    headers = _student_headers(client, "DEMO0001", "9876500201")
    r = client.post("/api/student/payments/create-order", json={"item_type": "course", "item_id": 1}, headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["cashfree_order_id"] == "cf_test_123"
    assert seen["headers"]["x-client-id"] == TEST_ENV_APP_ID
    assert seen["headers"]["x-client-secret"] == TEST_ENV_SECRET
    assert "sandbox.cashfree.com" in seen["url"]


def test_student_create_order_prefers_tenant_keys(client, admin_headers, monkeypatch):
    """Tenant DB keys beat the env keys for the same tenant."""
    import app.routers.integrations as integ

    monkeypatch.setenv("CASHFREE_APP_ID", TEST_ENV_APP_ID)
    monkeypatch.setenv("CASHFREE_SECRET_KEY", TEST_ENV_SECRET)
    monkeypatch.setenv("CASHFREE_ENV", "SANDBOX")
    client.put(
        "/api/integrations/cashfree",
        json={"app_id": TEST_CF_APP_ID, "secret": TEST_CF_SECRET, "environment": "sandbox"},
        headers=admin_headers,
    )
    seen: dict = {}

    def _capture(url, headers=None, json=None, timeout=None):
        seen["headers"] = headers
        return _fake_cashfree_post(url, headers, json, timeout)

    monkeypatch.setattr(integ.httpx, "post", _capture)
    headers = _student_headers(client, "DEMO0001", "9876500202")
    r = client.post("/api/student/payments/create-order", json={"item_type": "course", "item_id": 1}, headers=headers)
    assert r.status_code == 201, r.text
    assert seen["headers"]["x-client-id"] == TEST_CF_APP_ID
    assert seen["headers"]["x-client-secret"] == TEST_CF_SECRET


def test_webhook_uses_tenant_secret(client, admin_headers, monkeypatch):
    """Webhook signature is verified against the tenant's own secret once
    tenant keys are saved; the env secret then stops working."""
    import app.routers.integrations as integ

    monkeypatch.setenv("CASHFREE_APP_ID", TEST_ENV_APP_ID)
    monkeypatch.setenv("CASHFREE_SECRET_KEY", TEST_ENV_SECRET)
    monkeypatch.setenv("CASHFREE_ENV", "SANDBOX")
    monkeypatch.setattr(integ.httpx, "post", _fake_cashfree_post)
    r = client.post("/api/payments/create-order", json={"item_type": "course", "item_id": 1}, headers=admin_headers)
    assert r.status_code == 201, r.text
    order_id = r.json()["order_id"]

    def _sig(secret, timestamp, raw: bytes) -> str:
        return base64.b64encode(
            hmac.new(secret.encode(), (timestamp + raw.decode()).encode(), hashlib.sha256).digest()
        ).decode()

    def _post_webhook(secret):
        raw = json.dumps({"type": "PAYMENT_SUCCESS_WEBHOOK",
                          "data": {"order": {"order_id": order_id},
                                   "payment": {"payment_status": "SUCCESS"}}}).encode()
        ts = "1700000000"
        return client.post("/api/payments/cashfree/webhook", content=raw,
                           headers={"x-webhook-signature": _sig(secret, ts, raw),
                                    "x-webhook-timestamp": ts,
                                    "Content-Type": "application/json"})

    # Env secret works while no tenant keys exist.
    assert _post_webhook(TEST_ENV_SECRET).status_code == 200

    # Save tenant keys: env-signed webhook must now fail, tenant-signed pass.
    client.put(
        "/api/integrations/cashfree",
        json={"app_id": TEST_CF_APP_ID, "secret": TEST_CF_SECRET, "environment": "sandbox"},
        headers=admin_headers,
    )
    assert _post_webhook(TEST_ENV_SECRET).status_code == 401
    r = _post_webhook(TEST_CF_SECRET)
    assert r.status_code == 200, r.text
    assert r.json()["transaction_status"] == "PAID"
