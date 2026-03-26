from __future__ import annotations

from typing import Any

from flask import Blueprint, g
from pydantic import BaseModel, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.integrations.supabase_client import get_supabase_admin, get_supabase_user


bp = Blueprint("users", __name__)


class UpdateSettingsBody(BaseModel):
  pushNotice: bool | None = None
  interactNotice: bool | None = None
  homeAccess: str | None = Field(default=None, pattern="^(all|followers|self)$")
  commentAccess: str | None = Field(default=None, pattern="^(all|followers|disabled)$")


@bp.get("/users/me")
@require_auth
def me():
  admin = get_supabase_admin()
  user = admin.auth.get_user(g.access_token)
  u = getattr(user, "user", None)
  if not u:
    return ok({"id": g.user_id})
  return ok({"id": u.id, "email": getattr(u, "email", None), "phone": getattr(u, "phone", None)})


@bp.post("/users/<user_id>/follow")
@require_auth
def follow_user(user_id: str):
  client = get_supabase_user()
  try:
    client.table("follows").insert({"follower_id": g.user_id, "followee_id": user_id}).execute()
  except Exception:
    pass
  return ok({"ok": True})


@bp.delete("/users/<user_id>/follow")
@require_auth
def unfollow_user(user_id: str):
  client = get_supabase_user()
  client.table("follows").delete().eq("follower_id", g.user_id).eq("followee_id", user_id).execute()
  return ok({"ok": True})


@bp.get("/users/me/settings")
@require_auth
def get_my_settings():
  client = get_supabase_user()
  res: Any = (
    client.table("user_settings")
    .select("push_notice,interact_notice,home_access,comment_access")
    .eq("user_id", g.user_id)
    .maybe_single()
    .execute()
  )
  if not res.data:
    created: Any = client.table("user_settings").insert({"user_id": g.user_id}).execute()
    row = (created.data or [None])[0]
  else:
    row = res.data
  return ok(
    {
      "pushNotice": bool(row.get("push_notice")) if row else True,
      "interactNotice": bool(row.get("interact_notice")) if row else True,
      "homeAccess": (row.get("home_access") if row else "followers"),
      "commentAccess": (row.get("comment_access") if row else "all"),
    }
  )


@bp.put("/users/me/settings")
@require_auth
def update_my_settings():
  body = parse_json(UpdateSettingsBody)
  patch: dict[str, Any] = {}
  if body.pushNotice is not None:
    patch["push_notice"] = body.pushNotice
  if body.interactNotice is not None:
    patch["interact_notice"] = body.interactNotice
  if body.homeAccess is not None:
    patch["home_access"] = body.homeAccess
  if body.commentAccess is not None:
    patch["comment_access"] = body.commentAccess

  if not patch:
    return ok({"ok": True})

  client = get_supabase_user()
  existing: Any = client.table("user_settings").select("user_id").eq("user_id", g.user_id).maybe_single().execute()
  if not existing.data:
    client.table("user_settings").insert({"user_id": g.user_id, **patch}).execute()
    return ok({"ok": True})
  client.table("user_settings").update(patch).eq("user_id", g.user_id).execute()
  return ok({"ok": True})
