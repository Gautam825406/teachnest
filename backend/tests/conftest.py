import os
import tempfile

import pytest

# Point the app at a throwaway SQLite file BEFORE importing app modules.
_tmp = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}/test.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client, username, password):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin_headers(client):
    return _login(client, "admin", "Admin@123")


@pytest.fixture(scope="session")
def second_headers(client):
    return _login(client, "secondadmin", "Second@123")
