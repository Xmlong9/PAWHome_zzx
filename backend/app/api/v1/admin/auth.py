from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, TypeVar

from flask import request, g
from werkzeug.security import check_password_hash

from ....extensions import db
from ....models import AdminUser, AdminSession, AdminLog
from ....responses import fail, ok

T = TypeVar("T")

def _now() -> datetime:
    return datetime.utcnow()

def create_admin_session(admin_id: str, ttl_days: int = 7) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(days=ttl_days)
    db.session.add(AdminSession(token=token, admin_id=admin_id, expires_at=expires_at))
    db.session.commit()
    return token

def revoke_admin_session(token: str) -> None:
    AdminSession.query.filter_by(token=token).delete()
    db.session.commit()

def get_admin_from_request() -> AdminUser | None:
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        return None
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        return None
    
    session = AdminSession.query.filter_by(token=token).first()
    if session is None:
        return None
        
    if session.expires_at is not None and session.expires_at <= _now():
        AdminSession.query.filter_by(token=token).delete()
        db.session.commit()
        return None
        
    admin = AdminUser.query.get(session.admin_id)
    if admin is None or admin.status != "active":
        return None
        
    g.admin_token = token
    return admin

def admin_required(fn: Callable[..., T]) -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any):
        admin = get_admin_from_request()
        if admin is None:
            return fail(code="UNAUTHORIZED", message="Unauthorized", status_code=401)
        g.current_admin = admin
        return fn(*args, **kwargs)
    return wrapper

def log_admin_action(action: str, target_type: str = None, target_id: str = None):
    """Utility to log admin actions"""
    if hasattr(g, "current_admin") and g.current_admin:
        ip = request.remote_addr
        user_agent = request.user_agent.string
        log = AdminLog(
            admin_id=g.current_admin.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            ip=ip,
            user_agent=user_agent
        )
        db.session.add(log)
        db.session.commit()

def register_admin_auth_routes(bp) -> None:
    @bp.post("/admin/auth/login")
    def admin_login():
        data = request.get_json(silent=True) or {}
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return fail(code="BAD_REQUEST", message="username and password required", status_code=400)
            
        admin = AdminUser.query.filter_by(username=username).first()
        if not admin:
            return fail(code="INVALID_CREDENTIALS", message="Invalid username or password", status_code=400)
            
        if not check_password_hash(admin.password_hash, password):
            return fail(code="INVALID_CREDENTIALS", message="Invalid username or password", status_code=400)
            
        if admin.status != "active":
            return fail(code="ACCOUNT_DISABLED", message="Account is disabled", status_code=403)
            
        token = create_admin_session(admin.id)
        
        # Manually set g.current_admin to log the login action
        g.current_admin = admin
        log_admin_action("login")
        
        return ok({
            "token": token,
            "admin": {
                "id": admin.id,
                "username": admin.username,
                "name": admin.name,
                "role_id": admin.role_id
            }
        })

    @bp.post("/admin/auth/logout")
    @admin_required
    def admin_logout():
        token = getattr(g, "admin_token", None)
        if token:
            revoke_admin_session(token)
            log_admin_action("logout")
        return ok({"ok": True})
        
    @bp.get("/admin/auth/me")
    @admin_required
    def admin_me():
        admin = g.current_admin
        return ok({
            "admin": {
                "id": admin.id,
                "username": admin.username,
                "name": admin.name,
                "role_id": admin.role_id,
                "status": admin.status
            }
        })
