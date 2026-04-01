from flask import request
from ....extensions import db
from ....models import ServiceProvider, ServiceAppointment
from ....responses import ok, fail
from .auth import admin_required, log_admin_action

def register_admin_services_routes(bp):
    @bp.get("/admin/services/providers")
    @admin_required
    def get_providers():
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        
        query = ServiceProvider.query

        pagination = query.order_by(ServiceProvider.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        providers = []
        for provider in pagination.items:
            providers.append({
                "id": provider.id,
                "name": provider.name,
                "service_type": provider.service_type,
                "status": provider.status,
                "created_at": provider.created_at.isoformat() + "Z" if provider.created_at else None,
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
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        status = request.args.get("status", "")
        
        query = ServiceAppointment.query

        if status:
            query = query.filter_by(status=status)

        pagination = query.order_by(ServiceAppointment.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        appointments = []
        for appt in pagination.items:
            appointments.append({
                "id": appt.id,
                "user_id": appt.user_id,
                "service_type": appt.service_type,
                "service_date": appt.service_date.isoformat() if appt.service_date else None,
                "status": appt.status,
                "created_at": appt.created_at.isoformat() + "Z" if appt.created_at else None,
            })

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
