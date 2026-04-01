from flask import request
from ....extensions import db
from ....models import User, Post, Follow
from ....responses import ok, fail
from .auth import admin_required, log_admin_action

def register_admin_users_routes(bp):
    @bp.get("/admin/users")
    @admin_required
    def get_users():
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
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
                "phone": user.phone,
                "avatar_url": user.avatar_url,
                "gender": user.gender,
                "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
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
