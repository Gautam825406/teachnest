"""Admin-panel AI provider keys (Groq / Gemini): save, list (masked),
test (mocked provider), delete, admin-only access, and use by the AI
question generator. No real provider calls are made here."""
import json

import pytest

from app.database import SessionLocal
from app.models import ProviderCredential


@pytest.fixture(autouse=True)
def _clean_keys():
    yield
    db = SessionLocal()
    try:
        db.query(ProviderCredential).delete()
        db.commit()
    finally:
        db.close()


def _teacher_headers(client):
    r = client.post("/api/auth/login", json={"username": "teacher1", "password": "Teacher@123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_list_keys_empty_for_admin(client, admin_headers, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = client.get("/api/integrations/api-keys", headers=admin_headers)
    assert r.status_code == 200, r.text
    keys = {k["provider"]: k for k in r.json()["keys"]}
    assert set(keys) == {"groq", "gemini"}
    assert keys["groq"]["configured"] is False
    assert keys["groq"]["source"] == "none"
    assert keys["gemini"]["configured"] is False


def test_save_and_list_masked_key(client, admin_headers):
    r = client.put(
        "/api/integrations/api-keys/groq",
        json={"api_key": "gsk_testkey1234567890abcdef"},
        headers=admin_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["configured"] is True
    assert body["source"] == "admin_panel"
    assert body["masked"] == "gsk_...cdef"
    assert "gsk_testkey1234567890abcdef" not in r.text  # full key never returned

    r = client.get("/api/integrations/api-keys", headers=admin_headers)
    keys = {k["provider"]: k for k in r.json()["keys"]}
    assert keys["groq"]["configured"] is True
    assert keys["groq"]["masked"] == "gsk_...cdef"
    assert keys["gemini"]["configured"] is False


def test_save_rejects_bad_provider_and_short_key(client, admin_headers):
    r = client.put("/api/integrations/api-keys/openai", json={"api_key": "sk-1234567890"}, headers=admin_headers)
    assert r.status_code == 400
    r = client.put("/api/integrations/api-keys/groq", json={"api_key": "short"}, headers=admin_headers)
    assert r.status_code == 400


def test_teacher_cannot_manage_keys(client, admin_headers):
    headers = _teacher_headers(client)
    assert client.get("/api/integrations/api-keys", headers=headers).status_code == 403
    r = client.put("/api/integrations/api-keys/groq", json={"api_key": "gsk_testkey1234567890"}, headers=headers)
    assert r.status_code == 403
    assert client.delete("/api/integrations/api-keys/groq", headers=headers).status_code == 403
    assert client.post("/api/integrations/api-keys/groq/test", headers=headers).status_code == 403


def test_delete_key_returns_to_unconfigured(client, admin_headers):
    client.put("/api/integrations/api-keys/gemini", json={"api_key": "AIzaTestKey1234567890"}, headers=admin_headers)
    r = client.delete("/api/integrations/api-keys/gemini", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["configured"] is False
    assert r.json()["source"] == "none"


class _FakeResp:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def test_test_endpoint_ok_and_invalid_key(client, admin_headers, monkeypatch):
    import app.routers.integrations as integ

    client.put("/api/integrations/api-keys/groq", json={"api_key": "gsk_testkey1234567890"}, headers=admin_headers)
    monkeypatch.setattr(integ.httpx, "get", lambda *a, **k: _FakeResp(200, {"data": []}))
    r = client.post("/api/integrations/api-keys/groq/test", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True

    monkeypatch.setattr(integ.httpx, "get", lambda *a, **k: _FakeResp(401, {"error": "invalid key"}))
    r = client.post("/api/integrations/api-keys/groq/test", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is False


def test_test_endpoint_transport_failure_is_not_500(client, admin_headers, monkeypatch):
    """A proxy/DNS failure (httpx.InvalidURL is NOT an HTTPError) must come
    back as ok:false, never a 500."""
    import httpx

    import app.routers.integrations as integ

    client.put("/api/integrations/api-keys/groq", json={"api_key": "gsk_testkey1234567890"}, headers=admin_headers)

    def _boom(*args, **kwargs):
        raise httpx.InvalidURL("Invalid port: ':1]'")

    monkeypatch.setattr(integ.httpx, "get", _boom)
    r = client.post("/api/integrations/api-keys/groq/test", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is False


def test_test_endpoint_without_key_is_503(client, admin_headers, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    r = client.post("/api/integrations/api-keys/groq/test", headers=admin_headers)
    assert r.status_code == 503


def _groq_ok(*args, **kwargs):
    payload = {
        "choices": [
            {"message": {"content": json.dumps({"questions": [
                {"question": "What is 2+2?", "options": ["3", "4", "5", "6"], "correct_option": "B"}
            ]})}}
        ]
    }
    return _FakeResp(200, payload)


def test_generate_uses_saved_groq_key(client, admin_headers, monkeypatch):
    import app.routers.integrations as integ

    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    # No key yet: honest 503.
    r = client.post("/api/ai/generate-questions", data={"topic": "Maths", "count": 1}, headers=admin_headers)
    assert r.status_code == 503

    client.put("/api/integrations/api-keys/groq", json={"api_key": "gsk_testkey1234567890"}, headers=admin_headers)
    seen: dict = {}

    def _groq_ok_capture(*args, **kwargs):
        seen["model"] = kwargs.get("json", {}).get("model")
        return _groq_ok(*args, **kwargs)

    monkeypatch.setattr(integ.httpx, "post", _groq_ok_capture)
    r = client.post("/api/ai/generate-questions", data={"topic": "Maths", "count": 1}, headers=admin_headers)
    assert r.status_code == 201, r.text
    # llama-3.3-70b-versatile was shut down by Groq on 16 Aug 2026.
    assert seen["model"] == "openai/gpt-oss-120b"
    assert r.json()["questions"][0]["question"] == "What is 2+2?"
    assert r.json()["provider"] == "groq"


def test_generate_with_gemini_key(client, admin_headers, monkeypatch):
    import app.routers.integrations as integ

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client.put("/api/integrations/api-keys/gemini", json={"api_key": "AIzaTestKey1234567890"}, headers=admin_headers)

    def _gemini_ok(*args, **kwargs):
        payload = {"candidates": [{"content": {"parts": [{"text": json.dumps({"questions": [
            {"question": "What is the capital of France?", "options": ["London", "Paris", "Berlin", "Rome"], "correct_option": "B"}
        ]})}]}}]}
        return _FakeResp(200, payload)

    monkeypatch.setattr(integ.httpx, "post", _gemini_ok)
    r = client.post(
        "/api/ai/generate-questions",
        data={"topic": "Geography", "count": 1, "provider": "gemini"},
        headers=admin_headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["questions"][0]["question"] == "What is the capital of France?"
    assert r.json()["provider"] == "gemini"


def test_status_reflects_saved_key(client, admin_headers, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client.put("/api/integrations/api-keys/gemini", json={"api_key": "AIzaTestKey1234567890"}, headers=admin_headers)
    r = client.get("/api/integrations/status", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["gemini"]["configured"] is True
    assert r.json()["groq"]["configured"] is False
