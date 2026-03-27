from __future__ import annotations

from typing import Any

from flask import Blueprint, request
from postgrest.types import CountMethod

from pawhome_backend.common.pagination import to_range_query
from pawhome_backend.common.responses import ok
from pawhome_backend.integrations.supabase_client import get_supabase_user


bp = Blueprint("banners", __name__)


@bp.get("/banners")
def list_banners():
  slot = request.args.get("slot")
  if not slot:
    return ok({"list": []})

  client = get_supabase_user()
  res: Any = (
    client.table("banner_items")
    .select(
      "id,slot_code,image_url,title,sub_title,cta_text,link_url,badge,bg_color,border_radius,shadow_offset_x,shadow_offset_y,weight",
      count=CountMethod.exact,
    )
    .eq("slot_code", slot)
    .order("weight", desc=True)
    .order("id", desc=True)
    .execute()
  )

  items = []
  for row in res.data or []:
    items.append(
      {
        "id": row.get("id"),
        "slot": row.get("slot_code"),
        "imageUrl": row.get("image_url"),
        "title": row.get("title"),
        "subTitle": row.get("sub_title"),
        "ctaText": row.get("cta_text"),
        "linkUrl": row.get("link_url"),
        "badge": row.get("badge"),
        "bgColor": row.get("bg_color"),
        "borderRadius": row.get("border_radius"),
        "shadowOffsetX": row.get("shadow_offset_x"),
        "shadowOffsetY": row.get("shadow_offset_y"),
      }
    )

  return ok({"list": items, "total": res.count or 0})


@bp.get("/feeds/community")
def list_community_cards():
  p = to_range_query(request.args.get("page"), request.args.get("pageSize"), max_page_size=50)
  client = get_supabase_user()
  res: Any = (
    client.table("community_cards")
    .select("id,image_url,title,link_url,badge,weight", count=CountMethod.exact)
    .order("weight", desc=True)
    .order("id", desc=True)
    .range(p.start, p.end)
    .execute()
  )

  items = []
  for row in res.data or []:
    items.append(
      {
        "id": row.get("id"),
        "imageUrl": row.get("image_url"),
        "title": row.get("title"),
        "linkUrl": row.get("link_url"),
        "badge": row.get("badge"),
      }
    )

  return ok({"list": items, "page": p.page, "pageSize": p.page_size, "total": res.count or 0})

