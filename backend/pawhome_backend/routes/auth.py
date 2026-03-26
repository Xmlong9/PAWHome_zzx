from __future__ import annotations

from typing import Any

from flask import Blueprint
from pydantic import BaseModel, EmailStr, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.errors import AppError
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.config import get_settings
from pawhome_backend.integrations.supabase_client import get_supabase_admin, get_supabase_user


bp = Blueprint("auth", __name__)


class RegisterBody(BaseModel):
  email: EmailStr
  password: str = Field(min_length=6)
  nickname: str | None = Field(default=None, max_length=64)


class LoginBody(BaseModel):
  email: EmailStr
  password: str


class RefreshBody(BaseModel):
  refresh_token: str


def _session_payload(session: Any) -> dict[str, Any]:
  if not session:
    return {"session": None}
  user = getattr(session, "user", None)
  return {
    "access_token": getattr(session, "access_token", None),
    "refresh_token": getattr(session, "refresh_token", None),
    "expires_at": getattr(session, "expires_at", None),
    "token_type": getattr(session, "token_type", None),
    "user": {"id": getattr(user, "id", None), "email": getattr(user, "email", None)},
  }


def _ensure_profile(access_token: str, user_id: str, email: str | None, nickname: str | None) -> None:
  client = get_supabase_user()
  client.postgrest.auth(access_token)
  default_name = nickname or (email.split("@", 1)[0] if email else "用户")
  client.table("profiles").upsert({"id": user_id, "nickname": default_name}).execute()


def _raise_auth_error(e: Exception) -> None:
  message = str(e) or "认证服务错误"
  lowered = message.lower()
  if "rate limit" in lowered:
    raise AppError(code="rate_limited", message=message, status_code=429) from e
  if "invalid" in lowered and "email" in lowered:
    raise AppError(code="validation_error", message=message, status_code=422) from e
  raise AppError(code="auth_error", message=message, status_code=400) from e


@bp.post("/auth/register")
def register():
  body = parse_json(RegisterBody)
  s = get_settings()
  anon = get_supabase_user()

  session = None
  try:
    res: Any = anon.auth.sign_up({"email": body.email, "password": body.password})
    session = getattr(res, "session", None)
  except Exception as e:
    if s.env in {"dev", "test"}:
      admin = get_supabase_admin()
      try:
        admin.auth.admin.create_user({"email": body.email, "password": body.password, "email_confirm": True})
        login_res: Any = anon.auth.sign_in_with_password({"email": body.email, "password": body.password})
        session = getattr(login_res, "session", None)
      except Exception as e2:
        _raise_auth_error(e2)
    else:
      _raise_auth_error(e)

  if session and getattr(session, "access_token", None) and getattr(getattr(session, "user", None), "id", None):
    _ensure_profile(session.access_token, session.user.id, getattr(session.user, "email", None), body.nickname)
  return ok({"session": _session_payload(session)})


@bp.post("/auth/login")
def login():
  body = parse_json(LoginBody)
  anon = get_supabase_user()
  try:
    res: Any = anon.auth.sign_in_with_password({"email": body.email, "password": body.password})
  except Exception as e:
    _raise_auth_error(e)
  session = getattr(res, "session", None)
  if session and getattr(session, "access_token", None) and getattr(getattr(session, "user", None), "id", None):
    _ensure_profile(session.access_token, session.user.id, getattr(session.user, "email", None), None)
  return ok({"session": _session_payload(session)})


@bp.post("/auth/refresh")
def refresh():
  body = parse_json(RefreshBody)
  anon = get_supabase_user()
  try:
    res: Any = anon.auth.refresh_session(body.refresh_token)
  except Exception as e:
    _raise_auth_error(e)
  session = getattr(res, "session", None)
  if session and getattr(session, "access_token", None) and getattr(getattr(session, "user", None), "id", None):
    _ensure_profile(session.access_token, session.user.id, getattr(session.user, "email", None), None)
  return ok({"session": _session_payload(session)})


@bp.post("/auth/logout")
@require_auth
def logout():
  admin = get_supabase_admin()
  try:
    admin.auth.sign_out()
  except Exception:
    pass
  return ok({"ok": True})
