from __future__ import annotations

from flask import g, request

from ...auth import require_auth
from ...models import Notification, Post, User
from ...responses import ok


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def register_routes(bp) -> None:
    @bp.get("/notifications")
    @require_auth
    def list_notifications():
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 20)))
        notif_type = request.args.get("type")

        q = Notification.query.filter_by(user_id=me.id)
        if isinstance(notif_type, str) and notif_type:
            q = q.filter_by(notif_type=notif_type)
        q = q.order_by(Notification.created_at.desc())

        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()

        def to_msg(n: Notification) -> dict:
            actor = User.query.get(n.actor_id) if n.actor_id else None
            post = Post.query.get(n.post_id) if n.post_id else None
            thumb_url = ""
            if post and post.media_json:
                thumb_url = ""
            return {
                "id": n.id,
                "type": n.notif_type,
                "avatarUrl": actor.avatar_url if actor else "",
                "nickname": actor.nickname if actor else "",
                "createdAt": int((n.created_at).timestamp() * 1000) if n.created_at else 0,
                "text": n.text or "",
                "content": None,
                "postId": n.post_id,
                "thumbUrl": thumb_url,
                "isRead": bool(n.is_read),
            }

        return ok({"list": [to_msg(n) for n in items], "total": total})

