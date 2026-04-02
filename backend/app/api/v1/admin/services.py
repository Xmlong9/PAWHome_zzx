from flask import request
from ....models import Pet, ServiceOffering, User
from ....extensions import db
from ....models import ServiceProvider, ServiceAppointment
from ....responses import ok, fail
from .auth import admin_required, log_admin_action

def _iso(dt):
    return dt.isoformat() + "Z" if dt else None

def _pagination_args():
    page = request.args.get("page", 1, type=int)
    size = request.args.get("pageSize", None, type=int)
    if size is None:
        size = request.args.get("size", 10, type=int)
    return page, size

def register_admin_services_routes(bp):
    @bp.get("/admin/services/providers")
    @admin_required
    def get_providers():
        page, size = _pagination_args()
        
        query = ServiceProvider.query

        pagination = query.order_by(ServiceProvider.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        providers = []
        for provider in pagination.items:
            providers.append({
                "id": provider.id,
                "name": provider.name,
                "service_type": provider.service_type,
                "status": provider.status,
                "created_at": _iso(provider.created_at),
            })

        return ok({
            "items": providers,
            "total": pagination.total,
            "page": page,
            "size": size
        })

    @bp.get("/admin/services/appointments")
    @admin_required
    def get_appointments():
        page, size = _pagination_args()
        status = request.args.get("status", "")
        
        query = ServiceAppointment.query

        if status:
            query = query.filter_by(status=status)

        pagination = query.order_by(ServiceAppointment.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        status_map = {
            "scheduled": "pending_service",
            "arrived": "arrived",
            "completed": "completed",
            "cancelled": "cancelled",
            "unpaid": "unpaid",
        }

        appointments = []
        for appt in pagination.items:
            u = User.query.get(appt.user_id)
            pet = Pet.query.get(appt.pet_id) if appt.pet_id else None
            offering = ServiceOffering.query.get(appt.offering_id) if appt.offering_id else None
            appointments.append(
                {
                    "id": appt.id,
                    "bookingNo": (appt.id or "")[:8],
                    "createdAt": _iso(appt.created_at),
                    "status": status_map.get(appt.status, appt.status),
                    "pet": {
                        "id": appt.pet_id,
                        "nameCn": pet.name if pet else None,
                        "avatarUrl": pet.avatar_url if pet else None,
                        "breed": pet.breed if pet else None,
                    },
                    "service": {"id": appt.offering_id, "name": offering.name if offering else appt.service_type},
                    "owner": {
                        "id": appt.user_id,
                        "name": u.nickname if u else "Unknown",
                        "phoneMasked": "",
                    },
                    "schedule": {
                        "type": "slot",
                        "startAt": _iso(appt.appointment_at),
                        "endAt": _iso(appt.appointment_at),
                        "durationMinutes": offering.duration_minutes if offering else None,
                    },
                }
            )

        return ok({
            "items": appointments,
            "total": pagination.total,
            "page": page,
            "size": size
        })
        
    @bp.put("/admin/services/appointments/<appt_id>/status")
    @admin_required
    def update_appointment_status(appt_id):
        appt = ServiceAppointment.query.get(appt_id)
        if not appt:
            return fail(code="NOT_FOUND", message="Appointment not found", status_code=404)
        
        data = request.get_json(silent=True) or {}
        status = data.get("status")
        
        if not status:
            return fail(code="BAD_REQUEST", message="Status is required", status_code=400)
            
        appt.status = status
        db.session.commit()
        log_admin_action(f"update_appointment_status_{status}", "appointment", appt_id)
        
        return ok({"message": f"Appointment status updated to {status}"})
