from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, TypeVar

from flask import g, request

from .extensions import db
from .models import Session, User
from .responses import fail


T = TypeVar("T")


def _now() -> datetime:
    return datetime.utcnow()


def create_session(user_id: str, ttl_days: int = 30) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(days=ttl_days)
    db.session.add(Session(token=token, user_id=user_id, expires_at=expires_at))
    db.session.commit()
    return token


def revoke_session(token: str) -> None:
    Session.query.filter_by(token=token).delete()
    db.session.commit()


def get_user_from_request() -> User | None:
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        return None
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        return None
    session = Session.query.filter_by(token=token).first()
    if session is None:
        return None
    if session.expires_at is not None and session.expires_at <= _now():
        Session.query.filter_by(token=token).delete()
        db.session.commit()
        return None
    user = User.query.get(session.user_id)
    if user is None:
        return None
    g.auth_token = token
    return user


def require_auth(fn: Callable[..., T]) -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any):
        user = get_user_from_request()
        if user is None:
            return fail(code="UNAUTHORIZED", message="Unauthorized", status_code=401)
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def optional_auth(fn: Callable[..., T]) -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any):
        user = get_user_from_request()
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper
