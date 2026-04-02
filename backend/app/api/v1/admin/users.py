from flask import request
from ....extensions import db
from ....models import User, Post, Follow
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

def _mask_phone(phone: str | None):
    if not phone or not isinstance(phone, str):
        return ""
    if len(phone) < 7:
        return phone
    return phone[:3] + "****" + phone[-4:]

def register_admin_users_routes(bp):
    @bp.get("/admin/users")
    @admin_required
    def get_users():
        page, size = _pagination_args()
        keyword = request.args.get("keyword", "")

        query = User.query

        if keyword:
            query = query.filter((User.nickname.like(f"%{keyword}%")) | (User.phone.like(f"%{keyword}%")))

        pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        users = []
        for user in pagination.items:
            users.append({
                "id": user.id,
                "nickname": user.nickname,
                "phoneMasked": _mask_phone(user.phone),
                "avatarUrl": user.avatar_url,
                "gender": user.gender,
                "registeredAt": _iso(user.created_at),
                "status": getattr(user, "status", "active")  # We might need to add status to User model later if not present
            })

        return ok({
            "items": users,
            "total": pagination.total,
            "page": page,
            "size": size
        })

    @bp.put("/admin/users/<user_id>/status")
    @admin_required
    def update_user_status(user_id):
        # Placeholder for user status update logic
        # You would typically add a 'status' column to the User model
        # user = User.query.get(user_id)
        # if not user:
        #     return fail(code="NOT_FOUND", message="User not found", status_code=404)
        
        # data = request.get_json(silent=True) or {}
        # status = data.get("status", "active")
        
        # user.status = status
        # db.session.commit()
        # log_admin_action(f"update_user_status_to_{status}", "user", user_id)
        
        return ok({"message": "User status update (mocked)", "user_id": user_id})
