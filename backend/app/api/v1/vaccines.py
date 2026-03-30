from __future__ import annotations

import json
from datetime import datetime, timedelta

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import (
    DewormingRecord,
    Pet,
    ServiceAppointment,
    User,
    VaccineCatalog,
    VaccineRecord,
    VaccineReminder,
)
from ...responses import fail, ok


def _json() -> dict:
    return request.get_json(silent=True) or {}


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


def _catalog_to_dict(item: VaccineCatalog) -> dict:
    return {
        "id": item.id,
        "category": item.category,
        "name": item.name,
        "description": item.description or "",
    }


def _record_to_dict(record: VaccineRecord) -> dict:
    return {
        "id": record.id,
        "petId": record.pet_id,
        "vaccineId": record.vaccine_id,
        "vaccinatedAt": record.vaccinated_at.isoformat() if record.vaccinated_at else None,
        "providerName": record.provider_name or "",
        "notes": record.notes or "",
    }


def _deworm_to_dict(record: DewormingRecord) -> dict:
    return {
        "id": record.id,
        "petId": record.pet_id,
        "recordAt": record.record_at.isoformat() if record.record_at else None,
        "title": record.title,
        "providerName": record.provider_name or "",
        "notes": record.notes or "",
    }


def _reminder_to_dict(reminder: VaccineReminder) -> dict:
    return {
        "id": reminder.id,
        "petId": reminder.pet_id,
        "appointmentId": reminder.appointment_id,
        "vaccineId": reminder.vaccine_id,
        "vaccineName": reminder.vaccine_name,
        "appointmentAt": reminder.appointment_at.isoformat() if reminder.appointment_at else None,
        "remindAt": reminder.remind_at.isoformat() if reminder.remind_at else None,
        "aheadDays": reminder.ahead_days,
        "channel": reminder.channel,
        "remark": reminder.remark or "",
        "addToCalendar": bool(reminder.add_to_calendar),
        "status": reminder.status,
    }


def _require_my_pet(me: User, pet_id: str) -> Pet | None:
    if not isinstance(pet_id, str) or not pet_id.strip():
        return None
    return Pet.query.filter_by(id=pet_id.strip(), user_id=me.id).first()


def register_routes(bp) -> None:
    @bp.get("/vaccines/catalog")
    @require_auth
    def vaccine_catalog():
        category = request.args.get("category", "").strip()
        q = VaccineCatalog.query.filter_by(status="active")
        if category:
            q = q.filter_by(category=category)
        items = q.order_by(VaccineCatalog.category.asc(), VaccineCatalog.sort_order.asc(), VaccineCatalog.created_at.asc()).all()
        return ok({"list": [_catalog_to_dict(item) for item in items], "total": len(items)})

    @bp.get("/vaccines/status")
    @require_auth
    def vaccine_status():
        me: User = g.current_user
        pet_id = request.args.get("petId")
        category = request.args.get("category", "").strip()
        pet = _require_my_pet(me, pet_id or "")
        if pet is None:
            return fail(code="NOT_FOUND", message="pet not found", status_code=404)

        q = VaccineCatalog.query.filter_by(status="active")
        if category:
            q = q.filter_by(category=category)
        catalog_items = q.order_by(VaccineCatalog.sort_order.asc(), VaccineCatalog.created_at.asc()).all()
        catalog_ids = [item.id for item in catalog_items]

        record_rows = (
            VaccineRecord.query.filter_by(user_id=me.id, pet_id=pet.id)
            .filter(VaccineRecord.vaccine_id.in_(catalog_ids))
            .order_by(VaccineRecord.vaccinated_at.desc(), VaccineRecord.created_at.desc())
            .all()
        )
        latest: dict[str, VaccineRecord] = {}
        for row in record_rows:
            if row.vaccine_id not in latest:
                latest[row.vaccine_id] = row

        out = []
        for item in catalog_items:
            r = latest.get(item.id)
            out.append(
                {
                    "id": item.id,
                    "category": item.category,
                    "name": item.name,
                    "description": item.description or "",
                    "vaccinated": r is not None,
                    "lastVaccinatedAt": r.vaccinated_at.isoformat() if r is not None else None,
                    "providerName": r.provider_name if r is not None else "",
                }
            )
        return ok({"list": out, "total": len(out)})

    @bp.post("/vaccines/records")
    @require_auth
    def create_vaccine_record():
        me: User = g.current_user
        data = _json()
        pet_id = data.get("petId")
        vaccine_id = data.get("vaccineId")
        vaccinated_at = _parse_dt(data.get("vaccinatedAt")) or datetime.utcnow()
        if not isinstance(pet_id, str) or not pet_id.strip():
            return fail(code="BAD_REQUEST", message="petId required", status_code=400)
        if not isinstance(vaccine_id, str) or not vaccine_id.strip():
            return fail(code="BAD_REQUEST", message="vaccineId required", status_code=400)
        pet = _require_my_pet(me, pet_id)
        if pet is None:
            return fail(code="NOT_FOUND", message="pet not found", status_code=404)
        if VaccineCatalog.query.filter_by(id=vaccine_id.strip(), status="active").first() is None:
            return fail(code="NOT_FOUND", message="vaccine not found", status_code=404)

        record = VaccineRecord(
            user_id=me.id,
            pet_id=pet.id,
            vaccine_id=vaccine_id.strip(),
            vaccinated_at=vaccinated_at,
            provider_name=(data.get("providerName").strip() if isinstance(data.get("providerName"), str) else None),
            notes=(data.get("notes").strip() if isinstance(data.get("notes"), str) else None),
        )
        db.session.add(record)
        db.session.commit()
        return ok(_record_to_dict(record), status_code=201)

    @bp.get("/deworming/records")
    @require_auth
    def list_deworm_records():
        me: User = g.current_user
        pet_id = request.args.get("petId")
        pet = _require_my_pet(me, pet_id or "")
        if pet is None:
            return fail(code="NOT_FOUND", message="pet not found", status_code=404)
        items = (
            DewormingRecord.query.filter_by(user_id=me.id, pet_id=pet.id)
            .order_by(DewormingRecord.record_at.desc(), DewormingRecord.created_at.desc())
            .all()
        )
        return ok({"list": [_deworm_to_dict(item) for item in items], "total": len(items)})

    @bp.post("/deworming/records")
    @require_auth
    def create_deworm_record():
        me: User = g.current_user
        data = _json()
        pet_id = data.get("petId")
        title = data.get("title")
        record_at = _parse_dt(data.get("recordAt")) or datetime.utcnow()
        if not isinstance(pet_id, str) or not pet_id.strip():
            return fail(code="BAD_REQUEST", message="petId required", status_code=400)
        if not isinstance(title, str) or not title.strip():
            return fail(code="BAD_REQUEST", message="title required", status_code=400)
        pet = _require_my_pet(me, pet_id)
        if pet is None:
            return fail(code="NOT_FOUND", message="pet not found", status_code=404)
        record = DewormingRecord(
            user_id=me.id,
            pet_id=pet.id,
            record_at=record_at,
            title=title.strip(),
            provider_name=(data.get("providerName").strip() if isinstance(data.get("providerName"), str) else None),
            notes=(data.get("notes").strip() if isinstance(data.get("notes"), str) else None),
        )
        db.session.add(record)
        db.session.commit()
        return ok(_deworm_to_dict(record), status_code=201)

    @bp.get("/vaccines/reminders/by-appointment")
    @require_auth
    def get_reminder_by_appointment():
        me: User = g.current_user
        appointment_id = request.args.get("appointmentId")
        if not isinstance(appointment_id, str) or not appointment_id.strip():
            return fail(code="BAD_REQUEST", message="appointmentId required", status_code=400)
        appointment = ServiceAppointment.query.filter_by(user_id=me.id, id=appointment_id.strip()).first()
        if appointment is None:
            return fail(code="NOT_FOUND", message="appointment not found", status_code=404)
        if appointment.service_type != "vaccine":
            return fail(code="BAD_REQUEST", message="appointment is not vaccine", status_code=400)
        reminder = VaccineReminder.query.filter_by(user_id=me.id, appointment_id=appointment.id).first()
        if reminder is None:
            return ok({"exists": False})
        return ok({"exists": True, "reminder": _reminder_to_dict(reminder)})

    @bp.post("/vaccines/reminders")
    @require_auth
    def upsert_reminder():
        me: User = g.current_user
        data = _json()
        appointment_id = data.get("appointmentId")
        ahead_days = data.get("aheadDays", 1)
        channel = data.get("channel", "push")
        if not isinstance(appointment_id, str) or not appointment_id.strip():
            return fail(code="BAD_REQUEST", message="appointmentId required", status_code=400)
        if not isinstance(ahead_days, int) or ahead_days < 0 or ahead_days > 30:
            return fail(code="BAD_REQUEST", message="aheadDays invalid", status_code=400)
        if channel not in {"push", "sms"}:
            return fail(code="BAD_REQUEST", message="channel invalid", status_code=400)

        appointment = ServiceAppointment.query.filter_by(user_id=me.id, id=appointment_id.strip()).first()
        if appointment is None:
            return fail(code="NOT_FOUND", message="appointment not found", status_code=404)
        if appointment.service_type != "vaccine":
            return fail(code="BAD_REQUEST", message="appointment is not vaccine", status_code=400)
        if appointment.pet_id is None:
            return fail(code="BAD_REQUEST", message="appointment pet missing", status_code=400)

        vaccine_id = None
        vaccine_name = None
        try:
            snap = json.loads(appointment.snapshot_json or "{}")
        except json.JSONDecodeError:
            snap = {}
        vaccine = snap.get("vaccine") if isinstance(snap, dict) else None
        if isinstance(vaccine, dict):
            vaccine_id = vaccine.get("id")
            vaccine_name = vaccine.get("name")

        if not isinstance(vaccine_id, str) or not vaccine_id.strip():
            return fail(code="BAD_REQUEST", message="vaccineId missing in appointment", status_code=400)
        if not isinstance(vaccine_name, str) or not vaccine_name.strip():
            v = VaccineCatalog.query.filter_by(id=vaccine_id.strip()).first()
            vaccine_name = v.name if v is not None else ""
        remind_at = appointment.appointment_at - timedelta(days=ahead_days)

        existing = VaccineReminder.query.filter_by(user_id=me.id, appointment_id=appointment.id).first()
        if existing is None:
            reminder = VaccineReminder(
                user_id=me.id,
                pet_id=appointment.pet_id,
                appointment_id=appointment.id,
                vaccine_id=vaccine_id.strip(),
                vaccine_name=vaccine_name.strip(),
                appointment_at=appointment.appointment_at,
                remind_at=remind_at,
                ahead_days=ahead_days,
                channel=channel,
                remark=(data.get("remark").strip() if isinstance(data.get("remark"), str) else None),
                add_to_calendar=bool(data.get("addToCalendar")),
                status="active",
            )
            db.session.add(reminder)
            db.session.commit()
            return ok(_reminder_to_dict(reminder), status_code=201)

        existing.ahead_days = ahead_days
        existing.channel = channel
        existing.remind_at = remind_at
        existing.remark = data.get("remark").strip() if isinstance(data.get("remark"), str) else None
        existing.add_to_calendar = bool(data.get("addToCalendar"))
        existing.status = "active"
        db.session.commit()
        return ok(_reminder_to_dict(existing))

    @bp.get("/vaccines/reminders/upcoming")
    @require_auth
    def upcoming_reminder():
        me: User = g.current_user
        pet_id = request.args.get("petId")
        pet = _require_my_pet(me, pet_id or "")
        if pet is None:
            return fail(code="NOT_FOUND", message="pet not found", status_code=404)
        now = datetime.utcnow()
        reminder = (
            VaccineReminder.query.filter_by(user_id=me.id, pet_id=pet.id, status="active")
            .filter(VaccineReminder.appointment_at >= now)
            .order_by(VaccineReminder.appointment_at.asc(), VaccineReminder.remind_at.asc(), VaccineReminder.created_at.asc())
            .first()
        )
        return ok({"reminder": _reminder_to_dict(reminder) if reminder is not None else None})
