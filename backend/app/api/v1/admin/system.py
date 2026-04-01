from flask import request
from ....extensions import db
from ....models import AdminUser, AdminLog, AdminRole
from ....responses import ok, fail
from .auth import admin_required, log_admin_action
from werkzeug.security import generate_password_hash

def register_admin_system_routes(bp):
    @bp.get("/admin/system/admins")
    @admin_required
    def get_admins():
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        
        query = AdminUser.query

        pagination = query.order_by(AdminUser.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        admins = []
        for admin in pagination.items:
            role = AdminRole.query.get(admin.role_id)
            admins.append({
                "id": admin.id,
                "username": admin.username,
                "name": admin.name,
                "role_id": admin.role_id,
                "role_name": role.name if role else "Unknown",
                "status": admin.status,
                "created_at": admin.created_at.isoformat() + "Z" if admin.created_at else None,
            })

        return ok({
            "items": admins,
            "total": pagination.total,
            "page": page,
            "size": size
        })

    @bp.get("/admin/system/logs")
    @admin_required
    def get_admin_logs():
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        
        query = AdminLog.query

        pagination = query.order_by(AdminLog.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        logs = []
        for log in pagination.items:
            admin = AdminUser.query.get(log.admin_id)
            logs.append({
                "id": log.id,
                "admin_id": log.admin_id,
                "admin_username": admin.username if admin else "Unknown",
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "ip": log.ip,
                "created_at": log.created_at.isoformat() + "Z" if log.created_at else None,
            })

        return ok({
            "items": logs,
            "total": pagination.total,
            "page": page,
            "size": size
        })
