from flask import request
from ....extensions import db
from ....models import AdminUser, AdminLog, AdminRole
from ....responses import ok, fail
from .auth import admin_required, log_admin_action
from werkzeug.security import generate_password_hash

def _iso(dt):
    return dt.isoformat() + "Z" if dt else None

def _pagination_args():
    page = request.args.get("page", 1, type=int)
    size = request.args.get("pageSize", None, type=int)
    if size is None:
        size = request.args.get("size", 10, type=int)
    return page, size

def _module_from_action(action: str):
    if action in {"login", "logout"}:
        return "账户安全"
    if "order" in action or "product" in action:
        return "订单财务"
    return "系统"

def register_admin_system_routes(bp):
    @bp.get("/admin/system/admins")
    @admin_required
    def get_admins():
        page, size = _pagination_args()
        
        query = AdminUser.query

        pagination = query.order_by(AdminUser.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        admins = []
        for admin in pagination.items:
            role = AdminRole.query.get(admin.role_id)
            last_login = (
                AdminLog.query.filter_by(admin_id=admin.id, action="login")
                .order_by(AdminLog.created_at.desc())
                .first()
            )
            admins.append({
                "id": admin.id,
                "username": admin.username,
                "name": admin.name,
                "phone": None,
                "role": {"id": role.id if role else admin.role_id, "name": role.name if role else "Unknown"},
                "status": admin.status,
                "lastLoginAt": _iso(last_login.created_at) if last_login else None,
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
        page, size = _pagination_args()
        
        query = AdminLog.query

        pagination = query.order_by(AdminLog.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        logs = []
        for log in pagination.items:
            admin = AdminUser.query.get(log.admin_id)
            logs.append({
                "id": log.id,
                "serialNo": (log.id or "")[:8],
                "module": _module_from_action(log.action),
                "action": log.action,
                "ip": log.ip,
                "createdAt": _iso(log.created_at),
                "operator": {"id": log.admin_id, "name": admin.name if admin and admin.name else (admin.username if admin else "Unknown")},
            })

        return ok({
            "items": logs,
            "total": pagination.total,
            "page": page,
            "size": size
        })
