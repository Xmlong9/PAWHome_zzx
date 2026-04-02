from flask import request, Response
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
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        service_type = request.args.get("service_type", "")
        
        query = ServiceAppointment.query

        if status:
            query = query.filter_by(status=status)
            
        if service_type:
            query = query.filter_by(service_type=service_type)
            
        if start_date:
            query = query.filter(ServiceAppointment.service_date >= start_date)
        if end_date:
            query = query.filter(ServiceAppointment.service_date <= end_date)

        # If we have start_date/end_date, we might want to skip pagination to get all for the calendar
        if (start_date or end_date) and request.args.get("no_pagination") == "true":
            items = query.order_by(ServiceAppointment.appointment_at.asc()).all()
            total = len(items)
            pagination_items = items
        else:
            pagination = query.order_by(ServiceAppointment.created_at.desc()).paginate(page=page, per_page=size, error_out=False)
            total = pagination.total
            pagination_items = pagination.items

        status_map = {
            "scheduled": "pending_service",
            "arrived": "arrived",
            "completed": "completed",
            "cancelled": "cancelled",
            "unpaid": "unpaid",
        }

        appointments = []
        for appt in pagination_items:
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
            "total": total,
            "page": page,
            "size": size
        })

    @bp.get("/admin/services/appointments/export")
    @admin_required
    def export_appointments():
        status = request.args.get("status", "")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        service_type = request.args.get("service_type", "")
        
        query = ServiceAppointment.query

        if status:
            query = query.filter_by(status=status)
        if service_type:
            query = query.filter_by(service_type=service_type)
        if start_date:
            query = query.filter(ServiceAppointment.service_date >= start_date)
        if end_date:
            query = query.filter(ServiceAppointment.service_date <= end_date)

        items = query.order_by(ServiceAppointment.created_at.desc()).all()

        csv_content = "\uFEFF预约编号,创建时间,状态,宠物名称,宠物品种,服务项目,主人姓名,预约时间,预计时长(min)\n"
        
        status_map = {
            "scheduled": "待服务",
            "arrived": "已到店",
            "completed": "已完成",
            "cancelled": "已取消",
            "unpaid": "待支付",
        }

        for appt in items:
            u = User.query.get(appt.user_id)
            pet = Pet.query.get(appt.pet_id) if appt.pet_id else None
            offering = ServiceOffering.query.get(appt.offering_id) if appt.offering_id else None
            
            booking_no = (appt.id or "")[:8]
            created_at = appt.created_at.strftime("%Y-%m-%d %H:%M") if appt.created_at else "-"
            status_text = status_map.get(appt.status, appt.status)
            status_label = status_text
            if status_text == "pending_service": status_label = "待服务"
            
            pet_name = pet.name if pet else "-"
            pet_breed = pet.breed if pet else "-"
            service_name = offering.name if offering else appt.service_type
            owner_name = u.nickname if u else "Unknown"
            appt_time = appt.appointment_at.strftime("%Y-%m-%d %H:%M") if appt.appointment_at else "-"
            duration = offering.duration_minutes if offering else "-"

            csv_content += f"{booking_no},{created_at},{status_label},{pet_name},{pet_breed},{service_name},{owner_name},{appt_time},{duration}\n"

        return Response(
            csv_content,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=appointments.csv"}
        )

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
