from __future__ import annotations

import json

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import Comment, Notification, Post, User
from ...responses import fail, ok
from ...timeutil import dt_to_bj_ms


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
                try:
                    val = json.loads(post.media_json)
                    if isinstance(val, list) and val:
                        first = val[0]
                        if isinstance(first, str) and first:
                            thumb_url = first
                    elif isinstance(val, dict):
                        cover = val.get("coverUrl")
                        if isinstance(cover, str) and cover:
                            thumb_url = cover
                        else:
                            images = val.get("images")
                            if isinstance(images, list) and images:
                                first = images[0]
                                if isinstance(first, str) and first:
                                    thumb_url = first
                except json.JSONDecodeError:
                    thumb_url = ""

            content = None
            comment_text = None
            if n.notif_type == "comment":
                c = Comment.query.get(n.comment_id) if n.comment_id else None
                if c is None and n.post_id and n.actor_id:
                    c = (
                        Comment.query.filter_by(post_id=n.post_id, author_id=n.actor_id)
                        .order_by(Comment.created_at.desc())
                        .first()
                    )
                if c:
                    val = (c.content or "").strip()
                    comment_text = val if val else "（评论内容为空）"
                    if c.parent_id:
                        parent_comment = Comment.query.get(c.parent_id)
                        if parent_comment and parent_comment.content:
                            content = parent_comment.content
                    else:
                        if post and post.content:
                            content = post.content
            return {
                "id": n.id,
                "type": n.notif_type,
                "actorId": n.actor_id,
                "avatarUrl": actor.avatar_url if actor else "",
                "nickname": actor.nickname if actor else "",
                "createdAt": dt_to_bj_ms(n.created_at),
                "text": n.text or "",
                "content": content,
                "commentText": comment_text,
                "postId": n.post_id,
                "commentId": n.comment_id,
                "thumbUrl": thumb_url,
                "isRead": bool(n.is_read),
            }


        return ok({"list": [to_msg(n) for n in items], "total": total})

    @bp.get("/notifications/unread-summary")
    @require_auth
    def unread_summary():
        me: User = g.current_user
        rows = (
            Notification.query.filter_by(user_id=me.id, is_read=False)
            .order_by(Notification.created_at.desc())
            .all()
        )
        counts = {"like": 0, "favorite": 0, "comment": 0, "follow": 0}
        for row in rows:
            if row.notif_type in counts:
                counts[row.notif_type] += 1
        total = counts["like"] + counts["favorite"] + counts["comment"] + counts["follow"]
        return ok({**counts, "total": total})

    @bp.put("/notifications/read")
    @require_auth
    def mark_notifications_read():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        ids = data.get("ids")
        notif_type = data.get("type")

        q = Notification.query.filter_by(user_id=me.id, is_read=False)
        if isinstance(ids, list) and ids:
            valid_ids = [x for x in ids if isinstance(x, str) and x]
            if not valid_ids:
                return fail(code="BAD_REQUEST", message="invalid ids", status_code=400)
            q = q.filter(Notification.id.in_(valid_ids))
        elif isinstance(notif_type, str) and notif_type:
            q = q.filter_by(notif_type=notif_type)

        updated = q.update({"is_read": True}, synchronize_session=False)
        db.session.commit()
        return ok({"updated": int(updated)})
