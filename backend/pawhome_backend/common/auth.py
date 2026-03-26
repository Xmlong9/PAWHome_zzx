from __future__ import annotations

from functools import wraps
from typing import Any, Callable, TypeVar

from flask import g, request

from pawhome_backend.common.errors import AppError
from pawhome_backend.integrations.supabase_client import get_supabase_admin


TReturn = TypeVar("TReturn")


def get_bearer_token() -> str | None:
  auth = request.headers.get("Authorization")
  if not auth:
    return None
  parts = auth.split(" ", 1)
  if len(parts) != 2:
    return None
  if parts[0].lower() != "bearer":
    return None
  token = parts[1].strip()
  return token or None


def require_auth(fn: Callable[..., TReturn]) -> Callable[..., TReturn]:
  @wraps(fn)
  def wrapper(*args: Any, **kwargs: Any) -> TReturn:
    token = get_bearer_token()
    if not token:
      raise AppError(code="unauthorized", message="缺少 Bearer Token", status_code=401)

    admin = get_supabase_admin()
    try:
      res: Any = admin.auth.get_user(token)
    except Exception as e:
      raise AppError(code="unauthorized", message="无效或已过期的 Token", status_code=401) from e

    user: Any = getattr(res, "user", None)
    user_id = getattr(user, "id", None)
    if not user_id:
      raise AppError(code="unauthorized", message="Token 校验失败", status_code=401)

    g.user_id = user_id
    g.access_token = token
    return fn(*args, **kwargs)

  return wrapper
