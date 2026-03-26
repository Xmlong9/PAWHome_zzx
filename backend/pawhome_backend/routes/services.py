from __future__ import annotations

from flask import Blueprint, g, request
from pydantic import BaseModel, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.errors import AppError
from pawhome_backend.common.pagination import to_range_query
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.integrations.supabase_client import get_supabase_user
from postgrest.types import CountMethod


bp = Blueprint("services", __name__)


class CreateAppointmentBody(BaseModel):
  org_id: int
  service_item_id: int
  schedule_id: int
  status: str = Field(default="pending", pattern="^(pending|confirmed|canceled|done)$")


@bp.get("/service/orgs")
def list_orgs():
  p = to_range_query(request.args.get("page"), request.args.get("pageSize"))
  client = get_supabase_user()
  res = (
    client.table("service_orgs")
    .select("id,name,address,phone,geo_lat,geo_lng", count=CountMethod.exact)
    .eq("status", 1)
    .order("id")
    .range(p.start, p.end)
    .execute()
  )
  return ok({"list": res.data or [], "page": p.page, "pageSize": p.page_size, "total": res.count or 0})


@bp.get("/service/items")
def list_service_items():
  org_id = request.args.get("org_id")
  client = get_supabase_user()
  q = client.table("service_items").select("id,org_id,type_code,name,price,duration_min")
  if org_id:
    q = q.eq("org_id", int(org_id))
  res = q.eq("status", 1).order("id").execute()
  return ok({"list": res.data or []})


@bp.get("/service/schedules")
def list_schedules():
  service_item_id = request.args.get("service_item_id")
  client = get_supabase_user()
  q = client.table("schedules").select("id,org_id,service_item_id,start_time,end_time,capacity,reserved")
  if service_item_id:
    q = q.eq("service_item_id", int(service_item_id))
  res = q.eq("status", 1).order("start_time").execute()
  return ok({"list": res.data or []})


@bp.post("/service/appointments")
@require_auth
def create_appointment():
  body = parse_json(CreateAppointmentBody)
  client = get_supabase_user()
  res = (
    client.table("appointments")
    .insert(
      {
        "user_id": g.user_id,
        "org_id": body.org_id,
        "service_item_id": body.service_item_id,
        "schedule_id": body.schedule_id,
        "status": body.status,
      }
    )
    .execute()
  )
  return ok(res.data[0] if res.data else None, status_code=201)


@bp.get("/service/appointments")
@require_auth
def list_my_appointments():
  client = get_supabase_user()
  res = (
    client.table("appointments")
    .select("id,org_id,service_item_id,schedule_id,status,created_at")
    .eq("user_id", g.user_id)
    .order("created_at", desc=True)
    .execute()
  )
  return ok({"list": res.data or []})
