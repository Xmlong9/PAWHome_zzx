from __future__ import annotations

from typing import Any

from flask import Blueprint, g, request
from pydantic import BaseModel, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.pagination import to_range_query
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.integrations.supabase_client import get_supabase_admin, get_supabase_user
from postgrest.types import CountMethod


bp = Blueprint("posts", __name__)


class PostMediaBody(BaseModel):
  type: str = Field(pattern="^(image|video)$")
  url: str
  cover_url: str | None = None
  sort_order: int | None = None


class CreatePostBody(BaseModel):
  title: str | None = Field(default=None, max_length=128)
  content: str = Field(min_length=1)
  pet_type: str | None = Field(default=None, max_length=32)
  visibility: str = Field(default="public", pattern="^(public|followers|private)$")
  location_name: str | None = Field(default=None, max_length=128)
  location_address: str | None = Field(default=None, max_length=256)
  media: list[PostMediaBody] = Field(default_factory=list)


class CreateCommentBody(BaseModel):
  content: str = Field(min_length=1, max_length=1024)
  parent_id: int | None = None


def _parse_post_id(value: str) -> int:
  return int(value)


def _recount_post_counts(post_id: int) -> dict[str, int]:
  admin = get_supabase_admin()
  likes = admin.table("post_likes").select("id", count="exact").eq("post_id", post_id).execute()
  comments = admin.table("comments").select("id", count="exact").eq("post_id", post_id).execute()
  favorites = admin.table("post_favorites").select("id", count="exact").eq("post_id", post_id).execute()
  counts = {
    "like_count": int(likes.count or 0),
    "comment_count": int(comments.count or 0),
    "favorite_count": int(favorites.count or 0),
  }
  admin.table("posts").update(counts).eq("id", post_id).execute()
  return counts


@bp.get("/posts")
def list_posts():
  p = to_range_query(request.args.get("page"), request.args.get("pageSize"))
  t = request.args.get("type", "推荐")

  client = get_supabase_user()
  q = client.table("posts").select(
    "id,author_id,title,content,pet_type,visibility,status,like_count,comment_count,favorite_count,created_at,"
    "profiles(id,nickname,avatar_url),"
    "post_media(id,type,url,cover_url,sort_order)",
    count=CountMethod.exact,
  )

  if t == "最新":
    q = q.order("created_at", desc=True)
  else:
    q = q.order("like_count", desc=True).order("created_at", desc=True)

  res = q.range(p.start, p.end).execute()
  return ok({"list": res.data or [], "page": p.page, "pageSize": p.page_size, "total": res.count or 0})


@bp.get("/posts/<post_id>")
def get_post(post_id: str):
  pid = _parse_post_id(post_id)
  client = get_supabase_user()
  res = (
    client.table("posts")
    .select(
      "id,author_id,title,content,pet_type,visibility,status,like_count,comment_count,favorite_count,created_at,"
      "profiles(id,nickname,avatar_url),"
      "post_media(id,type,url,cover_url,sort_order)",
    )
    .eq("id", pid)
    .maybe_single()
    .execute()
  )
  return ok(res.data)


@bp.post("/posts")
@require_auth
def create_post():
  body = parse_json(CreatePostBody)
  client = get_supabase_user()
  payload: dict[str, Any] = {
    "author_id": g.user_id,
    "title": body.title,
    "content": body.content,
    "pet_type": body.pet_type,
    "visibility": body.visibility,
    "location_name": body.location_name,
    "location_address": body.location_address,
  }
  post_res = client.table("posts").insert(payload).execute()
  post = post_res.data[0]
  pid = post["id"]

  if body.media:
    media_payload = []
    for idx, m in enumerate(body.media):
      media_payload.append(
        {
          "post_id": pid,
          "type": m.type,
          "url": m.url,
          "cover_url": m.cover_url,
          "sort_order": m.sort_order if m.sort_order is not None else idx,
        }
      )
    client.table("post_media").insert(media_payload).execute()

  full = (
    client.table("posts")
    .select(
      "id,author_id,title,content,pet_type,visibility,status,like_count,comment_count,favorite_count,created_at,"
      "profiles(id,nickname,avatar_url),"
      "post_media(id,type,url,cover_url,sort_order)",
    )
    .eq("id", pid)
    .maybe_single()
    .execute()
  )
  return ok(full.data, status_code=201)


@bp.get("/posts/<post_id>/comments")
def list_comments(post_id: str):
  pid = _parse_post_id(post_id)
  p = to_range_query(request.args.get("page"), request.args.get("pageSize"), max_page_size=100)
  client = get_supabase_user()
  res = (
    client.table("comments")
    .select("id,post_id,author_id,parent_id,content,like_count,created_at,profiles(id,nickname,avatar_url)", count=CountMethod.exact)
    .eq("post_id", pid)
    .order("created_at", desc=False)
    .range(p.start, p.end)
    .execute()
  )
  return ok({"list": res.data or [], "page": p.page, "pageSize": p.page_size, "total": res.count or 0})


@bp.post("/posts/<post_id>/comments")
@require_auth
def add_comment(post_id: str):
  pid = _parse_post_id(post_id)
  body = parse_json(CreateCommentBody)
  client = get_supabase_user()
  res = (
    client.table("comments")
    .insert({"post_id": pid, "author_id": g.user_id, "content": body.content, "parent_id": body.parent_id})
    .execute()
  )
  counts = _recount_post_counts(pid)
  return ok({"comment": res.data[0] if res.data else None, "post_counts": counts}, status_code=201)


@bp.post("/posts/<post_id>/like")
@require_auth
def like_post(post_id: str):
  pid = _parse_post_id(post_id)
  client = get_supabase_user()
  try:
    client.table("post_likes").insert({"user_id": g.user_id, "post_id": pid}).execute()
  except Exception:
    pass
  counts = _recount_post_counts(pid)
  return ok({"ok": True, "post_counts": counts})


@bp.delete("/posts/<post_id>/like")
@require_auth
def unlike_post(post_id: str):
  pid = _parse_post_id(post_id)
  client = get_supabase_user()
  client.table("post_likes").delete().eq("user_id", g.user_id).eq("post_id", pid).execute()
  counts = _recount_post_counts(pid)
  return ok({"ok": True, "post_counts": counts})
