from __future__ import annotations

from typing import Any

from flask import Blueprint, g

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.responses import ok
from pawhome_backend.integrations.supabase_client import get_supabase_user


bp = Blueprint("comments", __name__)


def _parse_comment_id(value: str) -> int:
  return int(value)


@bp.post("/comments/<comment_id>/like")
@require_auth
def like_comment(comment_id: str):
  cid = _parse_comment_id(comment_id)
  client = get_supabase_user()
  try:
    client.table("comment_likes").insert({"user_id": g.user_id, "comment_id": cid}).execute()
  except Exception:
    pass
  return ok({"ok": True})


@bp.delete("/comments/<comment_id>/like")
@require_auth
def unlike_comment(comment_id: str):
  cid = _parse_comment_id(comment_id)
  client = get_supabase_user()
  client.table("comment_likes").delete().eq("user_id", g.user_id).eq("comment_id", cid).execute()
  return ok({"ok": True})

