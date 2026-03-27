from __future__ import annotations

from datetime import datetime

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import Pet, ServiceAppointment, User
from ...responses import fail, ok


def _json() -> dict:
    return request.get_json(silent=True) or {}


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def _parse_dt(v) -> datetime | None:
    if not isinstance(v, str) or not v.strip():
        return None
    s = v.strip()
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def _appointment_to_dict(a: ServiceAppointment) -> dict:
    return {
        "id": a.id,
        "petId": a.pet_id,
        "serviceType": a.service_type,
        "appointmentAt": a.appointment_at.isoformat() if a.appointment_at else None,
        "contactPhone": a.contact_phone or "",
        "address": a.address or "",
        "notes": a.notes or "",
        "status": a.status,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "updatedAt": a.updated_at.isoformat() if a.updated_at else None,
    }


def register_routes(bp) -> None:
    @bp.get("/services/appointments")
    @require_auth
    def list_appointments():
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        status = request.args.get("status")

        q = ServiceAppointment.query.filter_by(user_id=me.id)
        if isinstance(status, str) and status and status != "all":
            q = q.filter_by(status=status)
        q = q.order_by(ServiceAppointment.appointment_at.desc(), ServiceAppointment.created_at.desc())

        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return ok({"list": [_appointment_to_dict(a) for a in items], "page": page, "pageSize": page_size, "total": total})

    @bp.post("/services/appointments")
    @require_auth
    def create_appointment():
        me: User = g.current_user
        data = _json()

        service_type = data.get("serviceType")
        appointment_at = _parse_dt(data.get("appointmentAt"))
        if not isinstance(service_type, str) or not service_type.strip():
            return fail(code="BAD_REQUEST", message="serviceType required", status_code=400)
        if appointment_at is None:
            return fail(code="BAD_REQUEST", message="appointmentAt required", status_code=400)

        pet_id = data.get("petId")
        if pet_id is not None:
            if not isinstance(pet_id, str) or not pet_id.strip():
                return fail(code="BAD_REQUEST", message="petId invalid", status_code=400)
            if Pet.query.filter_by(id=pet_id, user_id=me.id).first() is None:
                return fail(code="NOT_FOUND", message="pet not found", status_code=404)

        a = ServiceAppointment(
            user_id=me.id,
            pet_id=pet_id if isinstance(pet_id, str) and pet_id.strip() else None,
            service_type=service_type.strip(),
            appointment_at=appointment_at,
            contact_phone=(data.get("contactPhone").strip() if isinstance(data.get("contactPhone"), str) else None),
            address=(data.get("address").strip() if isinstance(data.get("address"), str) else None),
            notes=(data.get("notes").strip() if isinstance(data.get("notes"), str) else None),
            status="scheduled",
        )
        db.session.add(a)
        db.session.commit()
        return ok(_appointment_to_dict(a), status_code=201)

    @bp.get("/services/appointments/<appointment_id>")
    @require_auth
    def get_appointment(appointment_id: str):
        me: User = g.current_user
        a = ServiceAppointment.query.filter_by(user_id=me.id, id=appointment_id).first()
        if a is None:
            return fail(code="NOT_FOUND", message="appointment not found", status_code=404)
        return ok(_appointment_to_dict(a))

    @bp.put("/services/appointments/<appointment_id>")
    @require_auth
    def update_appointment(appointment_id: str):
        me: User = g.current_user
        a = ServiceAppointment.query.filter_by(user_id=me.id, id=appointment_id).first()
        if a is None:
            return fail(code="NOT_FOUND", message="appointment not found", status_code=404)
        if a.status != "scheduled":
            return fail(code="CONFLICT", message="appointment not editable", status_code=409)

        data = _json()

        if "serviceType" in data:
            v = data.get("serviceType")
            if not isinstance(v, str) or not v.strip():
                return fail(code="BAD_REQUEST", message="serviceType invalid", status_code=400)
            a.service_type = v.strip()

        if "appointmentAt" in data:
            dt = _parse_dt(data.get("appointmentAt"))
            if data.get("appointmentAt") is not None and dt is None:
                return fail(code="BAD_REQUEST", message="appointmentAt invalid", status_code=400)
            if dt is not None:
                a.appointment_at = dt

        if "petId" in data:
            pet_id = data.get("petId")
            if pet_id is None or pet_id == "":
                a.pet_id = None
            else:
                if not isinstance(pet_id, str) or not pet_id.strip():
                    return fail(code="BAD_REQUEST", message="petId invalid", status_code=400)
                if Pet.query.filter_by(id=pet_id, user_id=me.id).first() is None:
                    return fail(code="NOT_FOUND", message="pet not found", status_code=404)
                a.pet_id = pet_id

        if "contactPhone" in data:
            a.contact_phone = data.get("contactPhone").strip() if isinstance(data.get("contactPhone"), str) else None
        if "address" in data:
            a.address = data.get("address").strip() if isinstance(data.get("address"), str) else None
        if "notes" in data:
            a.notes = data.get("notes").strip() if isinstance(data.get("notes"), str) else None

        db.session.commit()
        return ok(_appointment_to_dict(a))

    @bp.post("/services/appointments/<appointment_id>/cancel")
    @require_auth
    def cancel_appointment(appointment_id: str):
        me: User = g.current_user
        a = ServiceAppointment.query.filter_by(user_id=me.id, id=appointment_id).first()
        if a is None:
            return fail(code="NOT_FOUND", message="appointment not found", status_code=404)
        if a.status in {"canceled", "completed"}:
            return ok({"ok": True})
        a.status = "canceled"
        db.session.commit()
        return ok({"ok": True})

