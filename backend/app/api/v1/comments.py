from __future__ import annotations

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import Comment, CommentLike, CommentPin, Notification, Post, User
from ...responses import fail, ok


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def _ensure_comment_pin_table() -> None:
    CommentPin.__table__.create(bind=db.engine, checkfirst=True)


def _comment_to_dict(c: Comment, me_id: str | None, pinned_comment_id: str | None = None) -> dict:
    author = User.query.get(c.author_id)
    is_liked = False
    if me_id:
        is_liked = (
            CommentLike.query.filter_by(user_id=me_id, comment_id=c.id).first() is not None
        )
    return {
        "id": c.id,
        "postId": c.post_id,
        "userId": c.author_id,
        "user": {
            "id": author.id,
            "nickname": author.nickname or "",
            "avatarUrl": author.avatar_url or "",
        }
        if author
        else None,
        "content": c.content,
        "parentId": c.parent_id,
        "likeCount": c.like_count,
        "isLiked": is_liked,
        "isPinned": bool(pinned_comment_id and c.id == pinned_comment_id),
        "createdAt": c.created_at.isoformat() if c.created_at else None,
    }


def register_routes(bp) -> None:
    @bp.get("/posts/<post_id>/comments")
    @require_auth
    def list_comments(post_id: str):
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        _ensure_comment_pin_table()
        if Post.query.get(post_id) is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        pin_row = CommentPin.query.filter_by(post_id=post_id).first()
        pinned_comment_id = pin_row.comment_id if pin_row else None
        q = Comment.query.filter_by(post_id=post_id)
        if pinned_comment_id:
            q = q.order_by((Comment.id != pinned_comment_id).asc(), Comment.created_at.asc())
        else:
            q = q.order_by(Comment.created_at.asc())
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return ok(
            {
                "list": [_comment_to_dict(c, me.id, pinned_comment_id=pinned_comment_id) for c in items],
                "total": total,
            }
        )

    @bp.post("/comments")
    @require_auth
    def add_comment():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        post_id = data.get("postId")
        content = data.get("content")
        parent_id = data.get("parentId")
        if not isinstance(post_id, str) or not post_id:
            return fail(code="BAD_REQUEST", message="postId required", status_code=400)
        if not isinstance(content, str) or not content.strip():
            return fail(code="BAD_REQUEST", message="content required", status_code=400)
        post = Post.query.get(post_id)
        if post is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if parent_id is not None and not isinstance(parent_id, str):
            return fail(code="BAD_REQUEST", message="invalid parentId", status_code=400)
        if isinstance(parent_id, str) and parent_id:
            if Comment.query.get(parent_id) is None:
                return fail(code="NOT_FOUND", message="parent comment not found", status_code=404)
        else:
            parent_id = None

        c = Comment(post_id=post_id, author_id=me.id, content=content.strip(), parent_id=parent_id)
        db.session.add(c)
        post.comment_count += 1

        if post.author_id != me.id:
            db.session.add(
                Notification(
                    user_id=post.author_id,
                    actor_id=me.id,
                    notif_type="comment",
                    post_id=post.id,
                    comment_id=c.id,
                    text="评论了你的帖子",
                )
            )

        db.session.commit()
        return ok(_comment_to_dict(c, me.id), status_code=201)

    @bp.post("/comments/<comment_id>/like")
    @require_auth
    def like_comment(comment_id: str):
        me: User = g.current_user
        c = Comment.query.get(comment_id)
        if c is None:
            return fail(code="NOT_FOUND", message="comment not found", status_code=404)
        if CommentLike.query.filter_by(user_id=me.id, comment_id=comment_id).first() is None:
            db.session.add(CommentLike(user_id=me.id, comment_id=comment_id))
            c.like_count += 1
            db.session.commit()
        return ok({"ok": True})

    @bp.delete("/comments/<comment_id>/like")
    @require_auth
    def unlike_comment(comment_id: str):
        me: User = g.current_user
        c = Comment.query.get(comment_id)
        if c is None:
            return fail(code="NOT_FOUND", message="comment not found", status_code=404)
        deleted = CommentLike.query.filter_by(user_id=me.id, comment_id=comment_id).delete()
        if deleted:
            c.like_count = max(0, c.like_count - deleted)
        db.session.commit()
        return ok({"ok": True})

    @bp.delete("/comments/<comment_id>")
    @require_auth
    def delete_comment(comment_id: str):
        me: User = g.current_user
        _ensure_comment_pin_table()
        c = Comment.query.get(comment_id)
        if c is None:
            return fail(code="NOT_FOUND", message="comment not found", status_code=404)
        post = Post.query.get(c.post_id)
        if post is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if me.id != c.author_id and me.id != post.author_id:
            return fail(code="FORBIDDEN", message="forbidden", status_code=403)

        queue = [c.id]
        to_delete: list[str] = []
        while queue:
            cid = queue.pop(0)
            to_delete.append(cid)
            children = Comment.query.filter_by(parent_id=cid).all()
            queue.extend([x.id for x in children])

        CommentLike.query.filter(CommentLike.comment_id.in_(to_delete)).delete(
            synchronize_session=False
        )
        Notification.query.filter(Notification.comment_id.in_(to_delete)).delete(
            synchronize_session=False
        )
        CommentPin.query.filter(CommentPin.comment_id.in_(to_delete)).delete(
            synchronize_session=False
        )
        Comment.query.filter(Comment.id.in_(to_delete)).delete(synchronize_session=False)
        post.comment_count = max(0, post.comment_count - len(to_delete))
        db.session.commit()
        return ok({"ok": True, "deleted": len(to_delete)})

    @bp.put("/comments/<comment_id>/pin")
    @require_auth
    def pin_comment(comment_id: str):
        me: User = g.current_user
        _ensure_comment_pin_table()
        c = Comment.query.get(comment_id)
        if c is None:
            return fail(code="NOT_FOUND", message="comment not found", status_code=404)
        post = Post.query.get(c.post_id)
        if post is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if me.id != post.author_id:
            return fail(code="FORBIDDEN", message="forbidden", status_code=403)

        data = request.get_json(silent=True) or {}
        is_pinned = bool(data.get("isPinned", True))
        row = CommentPin.query.filter_by(post_id=post.id).first()
        if is_pinned:
            if row is None:
                db.session.add(CommentPin(post_id=post.id, comment_id=c.id))
            else:
                row.comment_id = c.id
        else:
            CommentPin.query.filter_by(post_id=post.id).delete(synchronize_session=False)
        db.session.commit()
        return ok({"ok": True, "isPinned": is_pinned})
