from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flask import Blueprint, g, request
from pydantic import BaseModel, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.pagination import to_range_query
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.integrations.supabase_client import get_supabase_user
from postgrest.types import CountMethod


bp = Blueprint("pets", __name__)


class CreatePetBody(BaseModel):
  name: str = Field(min_length=1, max_length=64)
  avatar_url: str | None = None
  type: str | None = Field(default=None, max_length=32)
  breed: str | None = Field(default=None, max_length=64)
  gender: str | None = Field(default=None, max_length=16)
  weight_kg: float | None = None
  is_sterilized: bool | None = None
  birthday: str | None = None
  description: str | None = Field(default=None, max_length=512)


class UpdatePetBody(BaseModel):
  name: str | None = Field(default=None, max_length=64)
  avatar_url: str | None = None
  type: str | None = Field(default=None, max_length=32)
  breed: str | None = Field(default=None, max_length=64)
  gender: str | None = Field(default=None, max_length=16)
  weight_kg: float | None = None
  is_sterilized: bool | None = None
  birthday: str | None = None
  description: str | None = Field(default=None, max_length=512)


@bp.get("/pets")
@require_auth
def list_pets():
  p = to_range_query(request.args.get("page"), request.args.get("pageSize"))
  client = get_supabase_user()
  res: Any = (
    client.table("pets")
    .select("id,name,avatar_url,type,breed,gender,weight_kg,is_sterilized,birthday,description,created_at", count=CountMethod.exact)
    .eq("owner_id", g.user_id)
    .is_("deleted_at", "null")
    .order("created_at", desc=True)
    .range(p.start, p.end)
    .execute()
  )
  return ok({"list": res.data or [], "page": p.page, "pageSize": p.page_size, "total": res.count or 0})


@bp.post("/pets")
@require_auth
def create_pet():
  body = parse_json(CreatePetBody)
  client = get_supabase_user()
  payload = body.model_dump()
  payload["owner_id"] = g.user_id
  res: Any = client.table("pets").insert(payload).execute()
  return ok(res.data[0] if res.data else None, status_code=201)


@bp.get("/pets/<pet_id>")
@require_auth
def get_pet(pet_id: str):
  client = get_supabase_user()
  res: Any = client.table("pets").select("*").eq("id", pet_id).maybe_single().execute()
  return ok(res.data)


@bp.put("/pets/<pet_id>")
@require_auth
def update_pet(pet_id: str):
  body = parse_json(UpdatePetBody)
  client = get_supabase_user()
  patch: dict[str, Any] = {k: v for k, v in body.model_dump().items() if v is not None}
  if not patch:
    return ok({"ok": True})
  res: Any = client.table("pets").update(patch).eq("id", pet_id).execute()
  return ok({"ok": True, "data": res.data})


@bp.delete("/pets/<pet_id>")
@require_auth
def delete_pet(pet_id: str):
  client = get_supabase_user()
  res: Any = client.table("pets").update({"deleted_at": datetime.now(timezone.utc).isoformat()}).eq("id", pet_id).execute()
  return ok({"ok": True, "data": res.data})
