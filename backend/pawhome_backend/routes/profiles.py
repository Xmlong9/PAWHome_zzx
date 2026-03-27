from __future__ import annotations

from typing import Any

from flask import Blueprint, g
from pydantic import BaseModel, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.integrations.supabase_client import get_supabase_user
from postgrest.types import CountMethod


bp = Blueprint("profiles", __name__)


class UpdateProfileBody(BaseModel):
  nickname: str | None = Field(default=None, max_length=64)
  avatar_url: str | None = None
  location: str | None = Field(default=None, max_length=64)
  signature: str | None = Field(default=None, max_length=200)
  gender: str | None = Field(default=None, max_length=16)
  birthday: str | None = None


@bp.get("/users/me/profile")
@require_auth
def get_my_profile():
  client = get_supabase_user()
  q = client.table("profiles").select("id,nickname,avatar_url,location,signature,gender,birthday").eq("id", g.user_id)
  res: Any = q.maybe_single().execute()

  posts: Any = client.table("posts").select("id", count=CountMethod.exact).eq("author_id", g.user_id).execute()
  following: Any = client.table("follows").select("id", count=CountMethod.exact).eq("follower_id", g.user_id).execute()
  followers: Any = client.table("follows").select("id", count=CountMethod.exact).eq("followee_id", g.user_id).execute()

  payload = res.data or {"id": g.user_id}
  payload["post_count"] = int(posts.count or 0)
  payload["following_count"] = int(following.count or 0)
  payload["follower_count"] = int(followers.count or 0)
  payload["like_count"] = 0
  return ok(payload)


@bp.get("/users/<user_id>/profile")
def get_profile(user_id: str):
  client = get_supabase_user()
  res: Any = client.table("profiles").select("id,nickname,avatar_url,location,signature,gender,birthday").eq("id", user_id).maybe_single().execute()
  if not res.data:
    return ok(None)

  posts: Any = client.table("posts").select("id", count=CountMethod.exact).eq("author_id", user_id).execute()
  following: Any = client.table("follows").select("id", count=CountMethod.exact).eq("follower_id", user_id).execute()
  followers: Any = client.table("follows").select("id", count=CountMethod.exact).eq("followee_id", user_id).execute()

  payload = res.data
  payload["post_count"] = int(posts.count or 0)
  payload["following_count"] = int(following.count or 0)
  payload["follower_count"] = int(followers.count or 0)
  payload["like_count"] = 0
  return ok(payload)


@bp.put("/users/me/profile")
@require_auth
def update_my_profile():
  body = parse_json(UpdateProfileBody)
  client = get_supabase_user()
  patch: dict[str, Any] = {k: v for k, v in body.model_dump().items() if v is not None}
  if not patch:
    return ok({"ok": True})
  res: Any = client.table("profiles").update(patch).eq("id", g.user_id).execute()
  return ok({"ok": True, "data": res.data})
