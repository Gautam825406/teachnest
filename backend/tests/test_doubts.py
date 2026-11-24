"""Doubt Engine: students ask, AI answers (mocked providers), teachers
reply. No real provider calls are made here."""
import pytest

from app.database import SessionLocal
from app.models import Doubt

DEMO_ORG = "DEMO0001"


@pytest.fixture(autouse=True)
def _clean_doubts():
    yield
    db = SessionLocal()
    try:
        db.query(Doubt).delete()
        db.commit()
    finally:
        db.close()


def _student_headers(client, phone, name="Doubt Student"):
    r = client.post("/api/student/auth/verify", json={"org_code": DEMO_ORG, "phone": phone, "otp": "123456", "name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _teacher_headers(client):
    r = client.post("/api/auth/login", json={"username": "teacher1", "password": "Teacher@123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _mock_ai(monkeypatch, answer="Photosynthesis is how plants make food from sunlight."):
    """Mock both provider calls so no real API is hit."""
    import app.routers.doubts as doubts

    monkeypatch.setattr(doubts, "_call_groq", lambda key, prompt: '{"answer": "%s"}' % answer)
    monkeypatch.setattr(doubts, "_call_gemini", lambda key, prompt: '{"answer": "%s"}' % answer)


def test_create_doubt_without_key_stays_open(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    h = _student_headers(client, "9876501111")
    r = client.post("/api/student/doubts", json={"subject": "Physics", "topic": "Optics", "question": "What is refraction?"}, headers=h)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "open"
    assert body["ai_answer"] == ""
    assert body["ai_provider"] == ""
    assert body["subject"] == "Physics"
    assert body["question"] == "What is refraction?"


def test_create_doubt_with_mocked_groq_gets_ai_answer(client, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_fakekey1234567890")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    _mock_ai(monkeypatch)
    h = _student_headers(client, "9876501112")
    r = client.post("/api/student/doubts", json={"subject": "Biology", "question": "What is photosynthesis?"}, headers=h)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "ai_answered"
    assert body["ai_provider"] == "groq"
    assert "Photosynthesis" in body["ai_answer"]
    assert body["teacher_reply"] == ""


def test_groq_failure_falls_back_to_gemini(client, monkeypatch):
    import app.routers.doubts as doubts

    monkeypatch.setenv("GROQ_API_KEY", "gsk_fakekey1234567890")
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaFakeKey1234567890")
    monkeypatch.setattr(doubts, "_call_groq", lambda key, prompt: (_ for _ in ()).throw(RuntimeError("groq down")))
    monkeypatch.setattr(doubts, "_call_gemini", lambda key, prompt: '{"answer": "Gemini fallback answer."}')
    h = _student_headers(client, "9876501113")
    r = client.post("/api/student/doubts", json={"subject": "Maths", "question": "What is 2+2?"}, headers=h)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "ai_answered"
    assert body["ai_provider"] == "gemini"
    assert body["ai_answer"] == "Gemini fallback answer."


def test_create_doubt_validation(client):
    h = _student_headers(client, "9876501114")
    assert client.post("/api/student/doubts", json={"subject": "Physics", "question": "   "}, headers=h).status_code == 400
    assert client.post("/api/student/doubts", json={"subject": "Physics", "question": "x" * 2001}, headers=h).status_code == 400


def test_student_lists_only_own_doubts(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    h1 = _student_headers(client, "9876501115", "Student One")
    h2 = _student_headers(client, "9876501116", "Student Two")
    client.post("/api/student/doubts", json={"subject": "Physics", "question": "Q1 from one?"}, headers=h1)
    client.post("/api/student/doubts", json={"subject": "Chemistry", "question": "Q1 from two?"}, headers=h2)
    r = client.get("/api/student/doubts", headers=h1)
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["question"] == "Q1 from one?"
    # Other student's doubt detail is not visible
    other_id = client.get("/api/student/doubts", headers=h2).json()["items"][0]["id"]
    assert client.get(f"/api/student/doubts/{other_id}", headers=h1).status_code == 404


def test_teacher_lists_and_replies(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    h = _student_headers(client, "9876501117")
    r = client.post("/api/student/doubts", json={"subject": "Physics", "question": "Why is the sky blue?"}, headers=h)
    doubt_id = r.json()["id"]

    th = _teacher_headers(client)
    r = client.get("/api/teacher/doubts", headers=th)
    assert r.status_code == 200, r.text
    assert any(d["id"] == doubt_id for d in r.json()["items"])

    r = client.post(f"/api/teacher/doubts/{doubt_id}/reply", json={"reply": "Because of Rayleigh scattering."}, headers=th)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "answered"
    assert body["teacher_reply"] == "Because of Rayleigh scattering."
    assert body["teacher_name"] == "teacher1"
    assert body["answered_at"]

    # Student sees the teacher reply on their own doubt
    r = client.get(f"/api/student/doubts/{doubt_id}", headers=h)
    assert r.json()["teacher_reply"] == "Because of Rayleigh scattering."

    # Empty reply rejected
    assert client.post(f"/api/teacher/doubts/{doubt_id}/reply", json={"reply": "  "}, headers=th).status_code == 400


def test_teacher_endpoints_require_teacher_role(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    h = _student_headers(client, "9876501118")
    # Student token is not a User token at all → 401 on teacher endpoints
    assert client.get("/api/teacher/doubts", headers=h).status_code == 401
    # Admin token cannot use student endpoints
    r = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    admin_h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.post("/api/student/doubts", json={"subject": "Physics", "question": "Hi?"}, headers=admin_h).status_code == 401
    # But admin CAN list/reply teacher doubts
    assert client.get("/api/teacher/doubts", headers=admin_h).status_code == 200


def test_doubt_subjects_endpoint(client):
    h = _student_headers(client, "9876501119")
    r = client.get("/api/student/doubts/subjects", headers=h)
    assert r.status_code == 200, r.text
    assert isinstance(r.json()["subjects"], list)
