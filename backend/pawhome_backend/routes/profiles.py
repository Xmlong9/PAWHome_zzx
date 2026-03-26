from __future__ import annotations

from typing import Any

from flask import Blueprint, g
from pydantic import BaseModel, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.integrations.supabase_client import get_supabase_user


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
  return ok(res.data)


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
