"""Password-based student registration / login (no OTP)."""
import pytest

from app.database import SessionLocal
from app.models import Student

DEMO_ORG = "DEMO0001"


@pytest.fixture(autouse=True)
def _clean_students():
    yield
    db = SessionLocal()
    try:
        db.query(Student).filter(Student.phone.like("9876503%")).delete()
        db.commit()
    finally:
        db.close()


def _register(client, phone, name="Pass Student", password="secret123", org=DEMO_ORG):
    return client.post(
        "/api/student/auth/register",
        json={"org_code": org, "name": name, "phone": phone, "password": password},
    )


def test_register_success_returns_token(client):
    r = _register(client, "9876503001")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["student"]["name"] == "Pass Student"
    assert body["student"]["phone"] == "9876503001"
    # Password is hashed, never returned or stored in plaintext
    assert "secret123" not in r.text
    db = SessionLocal()
    try:
        row = db.query(Student).filter(Student.phone == "9876503001").first()
        assert row is not None and row.password_hash and row.password_hash != "secret123"
    finally:
        db.close()
    # The token works as a student token
    h = {"Authorization": f"Bearer {body['access_token']}"}
    assert client.get("/api/student/me", headers=h).status_code == 200


def test_register_duplicate_phone_409(client):
    assert _register(client, "9876503002").status_code == 201
    r = _register(client, "9876503002", name="Someone Else")
    assert r.status_code == 409, r.text
    assert "already exists" in r.json()["detail"]
    assert "log in" in r.json()["detail"]


def test_register_validation(client):
    # Bad org code
    assert _register(client, "9876503003", org="NOPE0000").status_code == 404
    # Bad phone
    assert _register(client, "12345").status_code == 400
    # Missing name
    assert _register(client, "9876503004", name="   ").status_code == 400
    # Short password
    assert _register(client, "9876503005", password="abc").status_code == 400


def test_login_password_success_and_wrong_password(client):
    assert _register(client, "9876503006", password="correct-horse").status_code == 201
    r = client.post(
        "/api/student/auth/login",
        json={"org_code": DEMO_ORG, "phone": "9876503006", "password": "correct-horse"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]
    assert r.json()["student"]["phone"] == "9876503006"

    r = client.post(
        "/api/student/auth/login",
        json={"org_code": DEMO_ORG, "phone": "9876503006", "password": "wrong-pass"},
    )
    assert r.status_code == 401, r.text


def test_login_unknown_phone_404_with_hint(client):
    r = client.post(
        "/api/student/auth/login",
        json={"org_code": DEMO_ORG, "phone": "9876503007", "password": "whatever1"},
    )
    assert r.status_code == 404, r.text
    assert "create an account" in r.json()["detail"]
    assert "OTP" in r.json()["detail"]


def test_login_otp_only_account_401_with_hint(client):
    # Account created via OTP has no password — password login must say so.
    r = client.post(
        "/api/student/auth/verify",
        json={"org_code": DEMO_ORG, "phone": "9876503008", "otp": "123456", "name": "Otp Only"},
    )
    assert r.status_code == 200, r.text
    r = client.post(
        "/api/student/auth/login",
        json={"org_code": DEMO_ORG, "phone": "9876503008", "password": "whatever1"},
    )
    assert r.status_code == 401, r.text
    assert "OTP" in r.json()["detail"]
