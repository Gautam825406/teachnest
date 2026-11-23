"""Phase 4 tests: Cashfree payments, AI, WhatsApp, push, live config, SMS OTP.

No real keys are used: Cashfree/Groq/WhatsApp calls are faked or asserted
to 503 when unconfigured. Webhook signature is computed with a test-only
secret set via env monkeypatching.
"""
import base64
import hashlib
import hmac
import json

DEMO_ORG = "DEMO0001"
TEST_SECRET = "test-cashfree-secret-only-for-tests"


def _student_headers(client, org_code, phone, name="Phase4 Student"):
    r = client.post("/api/student/auth/verify", json={"org_code": org_code, "phone": phone, "otp": "123456", "name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class _FakeResp:
    def __init__(self, status_code=201, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def _fake_cashfree_post(url, headers=None, json=None, timeout=None):
    assert "cashfree.com" in url
    return _FakeResp(201, {
        "cf_order_id": "cf_test_123",
        "order_id": json["order_id"],
        "payment_session_id": "sess_test_abc",
        "payment_link": "https://example.test/pay/sess_test_abc",
    })


def _create_txn(client, admin_headers, monkeypatch, student_id=None):
    """Create a PENDING PaymentTransaction via the admin endpoint with a
    faked Cashfree call. Returns the create-order response JSON."""
    monkeypatch.setenv("CASHFREE_APP_ID", "test_app_id")
    monkeypatch.setenv("CASHFREE_SECRET_KEY", TEST_SECRET)
    monkeypatch.setenv("CASHFREE_ENV", "SANDBOX")
    monkeypatch.setattr("app.routers.integrations.httpx.post", _fake_cashfree_post)
    body = {"item_type": "course", "item_id": 1}
    if student_id:
        body["student_id"] = student_id
    r = client.post("/api/payments/create-order", json=body, headers=admin_headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_integrations_status_no_secrets_leaked(client, admin_headers, monkeypatch):
    monkeypatch.delenv("CASHFREE_APP_ID", raising=False)
    monkeypatch.delenv("CASHFREE_SECRET_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("WHATSAPP_TOKEN", raising=False)
    monkeypatch.delenv("WHATSAPP_PHONE_NUMBER_ID", raising=False)
    monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT_JSON", raising=False)
    monkeypatch.delenv("MSG91_API_KEY", raising=False)
    monkeypatch.delenv("HMS_API_KEY", raising=False)
    monkeypatch.delenv("AGORA_APP_ID", raising=False)
    r = client.get("/api/integrations/status", headers=admin_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["cashfree"] == {"configured": False, "env": "SANDBOX"}
    assert d["groq"] == {"configured": False}
    assert d["whatsapp"] == {"configured": False}
    assert d["live"] == {"provider": None, "configured": False}
    assert d["fcm"] == {"configured": False}
    assert d["sms"] == {"provider": None, "configured": False}
    # No secret material anywhere in the payload.
    blob = json.dumps(d).lower()
    for banned in ("secret", "token", "key", "app_id", "password"):
        assert banned not in blob, banned
    # Auth required
    assert client.get("/api/integrations/status").status_code == 401


def test_create_order_without_cashfree_keys_503(client, admin_headers, monkeypatch):
    monkeypatch.delenv("CASHFREE_APP_ID", raising=False)
    monkeypatch.delenv("CASHFREE_SECRET_KEY", raising=False)
    r = client.post("/api/payments/create-order", json={"item_type": "course", "item_id": 1}, headers=admin_headers)
    assert r.status_code == 503, r.text
    assert r.json()["detail"] == "Cashfree not configured"


def test_create_order_with_cashfree_keys(client, admin_headers, monkeypatch):
    created = _create_txn(client, admin_headers, monkeypatch)
    assert created["order_id"].startswith("TN-")
    assert created["cashfree_order_id"] == "cf_test_123"
    assert created["payment_session_id"] == "sess_test_abc"
    assert created["payment_link"] == "https://example.test/pay/sess_test_abc"
    assert created["status"] == "PENDING"
    r = client.get(f"/api/payments/{created['order_id']}", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "PENDING"
    assert r.json()["amount"] == created["amount"]


def _webhook_sig(secret, timestamp, raw: bytes) -> str:
    return base64.b64encode(
        hmac.new(secret.encode(), (timestamp + raw.decode()).encode(), hashlib.sha256).digest()
    ).decode()


def test_webhook_bad_signature_401(client, admin_headers, monkeypatch):
    created = _create_txn(client, admin_headers, monkeypatch)
    raw = json.dumps({"type": "PAYMENT_SUCCESS_WEBHOOK",
                      "data": {"order": {"order_id": created["order_id"]},
                               "payment": {"payment_status": "SUCCESS"}}}).encode()
    r = client.post("/api/payments/cashfree/webhook", content=raw,
                    headers={"x-webhook-signature": "bogus", "x-webhook-timestamp": "1700000000",
                             "Content-Type": "application/json"})
    assert r.status_code == 401, r.text
    # Transaction must still be PENDING
    r = client.get(f"/api/payments/{created['order_id']}", headers=admin_headers)
    assert r.json()["status"] == "PENDING"


def test_webhook_valid_signature_marks_paid_and_enrols(client, admin_headers, monkeypatch):
    # Seeded demo student 1 (Aarav Sharma) buys course 1 via admin order.
    created = _create_txn(client, admin_headers, monkeypatch, student_id=1)
    order_id = created["order_id"]
    raw = json.dumps({"type": "PAYMENT_SUCCESS_WEBHOOK",
                      "data": {"order": {"order_id": order_id},
                               "payment": {"payment_status": "SUCCESS"}}}).encode()
    ts = "1700000000"
    sig = _webhook_sig(TEST_SECRET, ts, raw)
    r = client.post("/api/payments/cashfree/webhook", content=raw,
                    headers={"x-webhook-signature": sig, "x-webhook-timestamp": ts,
                             "Content-Type": "application/json"})
    assert r.status_code == 200, r.text
    assert r.json()["transaction_status"] == "PAID"
    r = client.get(f"/api/payments/{order_id}", headers=admin_headers)
    assert r.json()["status"] == "PAID"
    # Enrolment: a SUCCESS Order row exists for this transaction.
    r = client.get("/api/orders?search=", headers=admin_headers)
    assert r.status_code == 200
    assert any(o["transaction_id"] == order_id and o["status"] == "SUCCESS" for o in r.json()["items"])


def test_ai_generate_without_groq_key_503(client, admin_headers, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    r = client.post("/api/ai/generate-questions",
                    data={"topic": "Algebra", "class_name": "10", "difficulty": "easy", "count": 3,
                          "question_types": "mcq", "text": "Linear equations in one variable."},
                    headers=admin_headers)
    assert r.status_code == 503, r.text
    assert r.json()["detail"] == "AI not configured — add a groq API key in Integrations"


def test_ai_generations_list_empty_ok(client, admin_headers):
    r = client.get("/api/ai/generations", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_whatsapp_send_without_keys_503(client, admin_headers, monkeypatch):
    monkeypatch.delenv("WHATSAPP_TOKEN", raising=False)
    monkeypatch.delenv("WHATSAPP_PHONE_NUMBER_ID", raising=False)
    r = client.post("/api/integrations/whatsapp/send",
                    json={"to": "919876500001", "template": "teachnest_enrolment", "params": ["Aarav"]},
                    headers=admin_headers)
    assert r.status_code == 503, r.text
    assert r.json()["detail"] == "WhatsApp not configured"
    # Unknown template is rejected before the configured check.
    r = client.post("/api/integrations/whatsapp/send",
                    json={"to": "919876500001", "template": "nope", "params": []},
                    headers=admin_headers)
    assert r.status_code == 400


def test_push_send_without_fcm_503(client, admin_headers, monkeypatch):
    monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT_JSON", raising=False)
    r = client.post("/api/integrations/push/send",
                    json={"title": "Test", "body": "Hello", "topic": "all"},
                    headers=admin_headers)
    assert r.status_code == 503, r.text


def test_student_create_order_without_keys_503(client, monkeypatch):
    monkeypatch.delenv("CASHFREE_APP_ID", raising=False)
    monkeypatch.delenv("CASHFREE_SECRET_KEY", raising=False)
    headers = _student_headers(client, DEMO_ORG, "9876500941", "Phase4 Buyer")
    r = client.post("/api/student/payments/create-order",
                    json={"item_type": "course", "item_id": 1}, headers=headers)
    assert r.status_code == 503, r.text
    assert r.json()["detail"] == "Cashfree not configured"


def test_student_create_order_with_keys_and_verify(client, monkeypatch):
    headers = _student_headers(client, DEMO_ORG, "9876500942", "Phase4 Buyer2")
    monkeypatch.setenv("CASHFREE_APP_ID", "test_app_id")
    monkeypatch.setenv("CASHFREE_SECRET_KEY", TEST_SECRET)
    monkeypatch.setenv("CASHFREE_ENV", "SANDBOX")
    monkeypatch.setattr("app.routers.integrations.httpx.post", _fake_cashfree_post)
    r = client.post("/api/student/payments/create-order",
                    json={"item_type": "course", "item_id": 1}, headers=headers)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["payment_session_id"] == "sess_test_abc"
    # Verify with no successful Cashfree payment yet: stays PENDING.
    monkeypatch.setattr("app.routers.integrations.httpx.get",
                        lambda url, headers=None, timeout=None: _FakeResp(200, []))
    r = client.post("/api/student/payments/verify", json={"order_id": created["order_id"]}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "PENDING"
    # Now a SUCCESS payment: verify marks PAID and enrols.
    monkeypatch.setattr("app.routers.integrations.httpx.get",
                        lambda url, headers=None, timeout=None: _FakeResp(200, [{"payment_status": "SUCCESS"}]))
    r = client.post("/api/student/payments/verify", json={"order_id": created["order_id"]}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "PAID"
    r = client.get(f"/api/student/payments/{created['order_id']}", headers=headers)
    assert r.status_code == 200 and r.json()["status"] == "PAID"
    r = client.get("/api/student/my-courses", headers=headers)
    assert any(c["id"] == 1 for c in r.json()["items"])


def test_cross_tenant_payment_access_404(client, admin_headers, second_headers, monkeypatch):
    created = _create_txn(client, admin_headers, monkeypatch)
    r = client.get(f"/api/payments/{created['order_id']}", headers=second_headers)
    assert r.status_code == 404, r.text


def test_live_config_unconfigured(client, admin_headers, monkeypatch):
    monkeypatch.delenv("HMS_API_KEY", raising=False)
    monkeypatch.delenv("HMS_API_SECRET", raising=False)
    monkeypatch.delenv("AGORA_APP_ID", raising=False)
    monkeypatch.delenv("AGORA_APP_CERTIFICATE", raising=False)
    r = client.get("/api/live/config", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"provider": None, "configured": False, "join_url_template": None}


def test_request_otp_demo_flag(client, monkeypatch):
    monkeypatch.delenv("MSG91_API_KEY", raising=False)
    monkeypatch.delenv("EXOTEL_SID", raising=False)
    r = client.post("/api/student/auth/request-otp", json={"org_code": DEMO_ORG, "phone": "9876500943"})
    assert r.status_code == 200, r.text
    assert r.json()["demo"] is True
    assert "Demo OTP" in r.json()["message"]


def test_student_live_config_works_with_student_token(client, monkeypatch):
    """Phase 4 fix: students must reach live config without an admin token."""
    monkeypatch.delenv("HMS_API_KEY", raising=False)
    monkeypatch.delenv("HMS_API_SECRET", raising=False)
    monkeypatch.delenv("AGORA_APP_ID", raising=False)
    monkeypatch.delenv("AGORA_APP_CERTIFICATE", raising=False)
    headers = _student_headers(client, DEMO_ORG, "9876500955")
    r = client.get("/api/student/live/config", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"provider": None, "configured": False, "join_url_template": None}
    assert client.get("/api/student/live/config").status_code == 401
