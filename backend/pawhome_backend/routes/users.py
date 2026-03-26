from __future__ import annotations

from flask import Blueprint, g

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.responses import ok
from pawhome_backend.integrations.supabase_client import get_supabase_admin


bp = Blueprint("users", __name__)


@bp.get("/users/me")
@require_auth
def me():
  admin = get_supabase_admin()
  user = admin.auth.get_user(g.access_token)
  u = getattr(user, "user", None)
  if not u:
    return ok({"id": g.user_id})
  return ok({"id": u.id, "email": getattr(u, "email", None), "phone": getattr(u, "phone", None)})

