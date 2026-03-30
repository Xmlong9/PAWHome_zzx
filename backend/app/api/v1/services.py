from __future__ import annotations

import json
from datetime import date, datetime

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import Pet, ServiceAppointment, ServiceOffering, ServiceProvider, ServiceSlot, User
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


def _parse_date(v) -> date | None:
    if not isinstance(v, str) or not v.strip():
        return None
    try:
        return date.fromisoformat(v.strip())
    except ValueError:
        return None


def _load_desc_list(value: str | None) -> list[str]:
    if not isinstance(value, str) or not value.strip():
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return [value]
    if not isinstance(data, list):
        return []
    return [str(item) for item in data if str(item).strip()]


def _provider_to_dict(provider: ServiceProvider) -> dict:
    return {
        "id": provider.id,
        "serviceType": provider.service_type,
        "name": provider.name,
        "description": provider.description or "",
        "distance": provider.distance_text or "",
        "rating": provider.rating_text or "",
        "hours": provider.business_hours or "",
        "address": provider.address or "",
        "coverImage": provider.cover_image or "",
        "status": provider.status,
    }


def _offering_to_dict(offering: ServiceOffering) -> dict:
    date_rows = (
        db.session.query(ServiceSlot.service_date)
        .filter_by(offering_id=offering.id, status="active")
        .distinct()
        .order_by(ServiceSlot.service_date.asc())
        .all()
    )
    return {
        "id": offering.id,
        "providerId": offering.provider_id,
        "serviceType": offering.service_type,
        "name": offering.name,
        "summary": offering.summary or "",
        "descList": _load_desc_list(offering.description_json),
        "price": offering.price,
        "durationMinutes": offering.duration_minutes,
        "availableDates": [item[0].isoformat() for item in date_rows if item[0]],
        "status": offering.status,
    }


def _slot_to_dict(slot: ServiceSlot) -> dict:
    remaining = max(0, int(slot.capacity or 0) - int(slot.reserved_count or 0))
    return {
        "id": slot.id,
        "providerId": slot.provider_id,
        "offeringId": slot.offering_id,
        "serviceType": slot.service_type,
        "serviceDate": slot.service_date.isoformat() if slot.service_date else None,
        "timeLabel": slot.time_label,
        "appointmentAt": slot.appointment_at.isoformat() if slot.appointment_at else None,
        "capacity": slot.capacity,
        "reservedCount": slot.reserved_count,
        "remaining": remaining,
        "status": slot.status,
    }


def _provider_snapshot(provider: ServiceProvider | None) -> dict | None:
    if provider is None:
        return None
    return {
        "id": provider.id,
        "name": provider.name,
        "distance": provider.distance_text or "",
        "rating": provider.rating_text or "",
        "hours": provider.business_hours or "",
        "address": provider.address or "",
    }


def _offering_snapshot(offering: ServiceOffering | None) -> dict | None:
    if offering is None:
        return None
    return {
        "id": offering.id,
        "name": offering.name,
        "price": offering.price,
        "descList": _load_desc_list(offering.description_json),
        "summary": offering.summary or "",
    }


def _slot_snapshot(slot: ServiceSlot | None) -> dict | None:
    if slot is None:
        return None
    return {
        "id": slot.id,
        "serviceDate": slot.service_date.isoformat() if slot.service_date else None,
        "timeLabel": slot.time_label,
        "appointmentAt": slot.appointment_at.isoformat() if slot.appointment_at else None,
    }


def _load_snapshot(snapshot_json: str | None) -> dict:
    if not isinstance(snapshot_json, str) or not snapshot_json.strip():
        return {}
    try:
        data = json.loads(snapshot_json)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _appointment_to_dict(a: ServiceAppointment) -> dict:
    snapshot = _load_snapshot(a.snapshot_json)
    provider = snapshot.get("provider")
    offering = snapshot.get("offering")
    slot = snapshot.get("slot")
    return {
        "id": a.id,
        "petId": a.pet_id,
        "providerId": a.provider_id,
        "offeringId": a.offering_id,
        "slotId": a.slot_id,
        "serviceType": a.service_type,
        "serviceDate": a.service_date.isoformat() if a.service_date else None,
        "timeLabel": a.time_label or "",
        "appointmentAt": a.appointment_at.isoformat() if a.appointment_at else None,
        "price": a.price if a.price is not None else snapshot.get("price"),
        "contactPhone": a.contact_phone or "",
        "address": a.address or "",
        "notes": a.notes or "",
        "status": a.status,
        "provider": provider,
        "offering": offering,
        "slot": slot,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
        "updatedAt": a.updated_at.isoformat() if a.updated_at else None,
    }


def register_routes(bp) -> None:
    @bp.get("/services/providers")
    @require_auth
    def list_providers():
        service_type = request.args.get("serviceType", "").strip()
        q = ServiceProvider.query.filter_by(status="active")
        if service_type:
            q = q.filter_by(service_type=service_type)
        items = q.order_by(ServiceProvider.sort_order.asc(), ServiceProvider.created_at.asc()).all()
        return ok({"list": [_provider_to_dict(item) for item in items], "total": len(items)})

    @bp.get("/services/offerings")
    @require_auth
    def list_offerings():
        service_type = request.args.get("serviceType", "").strip()
        provider_id = request.args.get("providerId", "").strip()
        q = ServiceOffering.query.filter_by(status="active")
        if service_type:
            q = q.filter_by(service_type=service_type)
        if provider_id:
            q = q.filter_by(provider_id=provider_id)
        items = q.order_by(ServiceOffering.sort_order.asc(), ServiceOffering.created_at.asc()).all()
        return ok({"list": [_offering_to_dict(item) for item in items], "total": len(items)})

    @bp.get("/services/slots")
    @require_auth
    def list_slots():
        offering_id = request.args.get("offeringId", "").strip()
        if not offering_id:
            return fail(code="BAD_REQUEST", message="offeringId required", status_code=400)
        service_date = _parse_date(request.args.get("date"))
        q = ServiceSlot.query.filter_by(offering_id=offering_id, status="active")
        if service_date is not None:
            q = q.filter_by(service_date=service_date)
        items = q.order_by(ServiceSlot.appointment_at.asc()).all()
        return ok({"list": [_slot_to_dict(item) for item in items], "total": len(items)})

    @bp.get("/services/appointments")
    @require_auth
    def list_appointments():
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        status = request.args.get("status")
        service_type = request.args.get("serviceType", "").strip()

        q = ServiceAppointment.query.filter_by(user_id=me.id)
        if isinstance(status, str) and status and status != "all":
            q = q.filter_by(status=status)
        if service_type:
            q = q.filter_by(service_type=service_type)
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

        provider_id = data.get("providerId")
        offering_id = data.get("offeringId")
        slot_id = data.get("slotId")
        provider = None
        offering = None
        slot = None
        if provider_id or offering_id or slot_id:
            if not isinstance(provider_id, str) or not provider_id.strip():
                return fail(code="BAD_REQUEST", message="providerId required", status_code=400)
            if not isinstance(offering_id, str) or not offering_id.strip():
                return fail(code="BAD_REQUEST", message="offeringId required", status_code=400)
            if not isinstance(slot_id, str) or not slot_id.strip():
                return fail(code="BAD_REQUEST", message="slotId required", status_code=400)

            provider = ServiceProvider.query.filter_by(id=provider_id.strip(), status="active").first()
            if provider is None:
                return fail(code="NOT_FOUND", message="provider not found", status_code=404)
            offering = ServiceOffering.query.filter_by(id=offering_id.strip(), status="active").first()
            if offering is None:
                return fail(code="NOT_FOUND", message="offering not found", status_code=404)
            slot = ServiceSlot.query.filter_by(id=slot_id.strip(), status="active").first()
            if slot is None:
                return fail(code="NOT_FOUND", message="slot not found", status_code=404)
            if provider.service_type != service_type.strip():
                return fail(code="BAD_REQUEST", message="provider serviceType mismatch", status_code=400)
            if offering.service_type != service_type.strip() or offering.provider_id != provider.id:
                return fail(code="BAD_REQUEST", message="offering mismatch", status_code=400)
            if slot.service_type != service_type.strip() or slot.provider_id != provider.id or slot.offering_id != offering.id:
                return fail(code="BAD_REQUEST", message="slot mismatch", status_code=400)
            if slot.appointment_at != appointment_at:
                return fail(code="BAD_REQUEST", message="appointmentAt mismatch", status_code=400)
            if slot.reserved_count >= slot.capacity:
                return fail(code="CONFLICT", message="slot full", status_code=409)

        snapshot = {
            "provider": _provider_snapshot(provider),
            "offering": _offering_snapshot(offering),
            "slot": _slot_snapshot(slot),
            "price": offering.price if offering is not None else None,
        }

        a = ServiceAppointment(
            user_id=me.id,
            pet_id=pet_id if isinstance(pet_id, str) and pet_id.strip() else None,
            provider_id=provider.id if provider is not None else None,
            offering_id=offering.id if offering is not None else None,
            slot_id=slot.id if slot is not None else None,
            service_type=service_type.strip(),
            service_date=slot.service_date if slot is not None else appointment_at.date(),
            time_label=slot.time_label if slot is not None else appointment_at.strftime("%H:%M"),
            appointment_at=appointment_at,
            price=offering.price if offering is not None else None,
            contact_phone=(data.get("contactPhone").strip() if isinstance(data.get("contactPhone"), str) else None),
            address=(
                data.get("address").strip()
                if isinstance(data.get("address"), str)
                else (provider.address if provider is not None else None)
            ),
            notes=(data.get("notes").strip() if isinstance(data.get("notes"), str) else None),
            snapshot_json=json.dumps(snapshot, ensure_ascii=False),
            status="scheduled",
        )
        db.session.add(a)
        if slot is not None:
            slot.reserved_count += 1
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
        if a.slot_id:
            slot = ServiceSlot.query.filter_by(id=a.slot_id).first()
            if slot is not None and slot.reserved_count > 0:
                slot.reserved_count -= 1
        a.status = "canceled"
        db.session.commit()
        return ok({"ok": True})
