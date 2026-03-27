import os
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture()
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    from app import create_app
    from app.extensions import db
    from app import models as _models

    flask_app = create_app("testing")
    flask_app.config.update({"TESTING": True})
    flask_app.instance_path = str(tmp_path / "instance")
    os.makedirs(flask_app.instance_path, exist_ok=True)
    with flask_app.app_context():
        db.drop_all()
        db.create_all()

    yield flask_app


@pytest.fixture()
def client(app):
    return app.test_client()


def _register(client, phone: str, password: str, nickname: str = "u") -> str:
    r = client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "password": password, "nickname": nickname},
    )
    assert r.status_code == 200
    return r.get_json()["data"]["token"]


@pytest.fixture()
def user1_token(client):
    return _register(client, "13800000001", "pass-1", "用户1")


@pytest.fixture()
def user2_token(client):
    return _register(client, "13800000002", "pass-2", "用户2")
