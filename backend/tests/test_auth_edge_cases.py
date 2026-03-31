from __future__ import annotations

from datetime import datetime, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_logout_revokes_token(client, user1_token):
    h = _auth(user1_token)
    r = client.post("/api/v1/auth/logout", headers=h)
    assert r.status_code == 200

    r = client.get("/api/v1/users/me", headers=h)
    assert r.status_code == 401


def test_expired_session_is_purged(client, app, user2_token):
    from app.models import Session
    from app.extensions import db

    with app.app_context():
        s = Session.query.filter_by(token=user2_token).first()
        assert s is not None
        s.expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.session.commit()

    h = _auth(user2_token)
    r = client.get("/api/v1/users/me", headers=h)
    assert r.status_code == 401

    with app.app_context():
        assert Session.query.filter_by(token=user2_token).first() is None


def test_invalid_authorization_prefix(client, user1_token):
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Token {user1_token}"})
    assert r.status_code == 401


def test_bearer_without_token(client):
    r = client.get("/api/v1/users/me", headers={"Authorization": "Bearer "})
    assert r.status_code == 401


def test_session_user_missing(client, app, user1_token):
    from app.extensions import db
    from app.models import Session
    from sqlalchemy import text

    with app.app_context():
        s = Session.query.filter_by(token=user1_token).first()
        assert s is not None
        db.session.execute(text("PRAGMA foreign_keys=OFF"))
        db.session.execute(text("DELETE FROM users WHERE id = :id"), {"id": s.user_id})
        db.session.execute(text("PRAGMA foreign_keys=ON"))
        db.session.commit()

    r = client.get("/api/v1/users/me", headers=_auth(user1_token))
    assert r.status_code == 401


def test_int_arg_fallbacks(client, user1_token):
    h = _auth(user1_token)
    r = client.get("/api/v1/posts", headers=h, query_string={"page": "x", "pageSize": "y", "type": "all"})
    assert r.status_code == 200
