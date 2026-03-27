from __future__ import annotations

import json
from datetime import datetime

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import Follow, Notification, Post, PostFavorite, PostHistory, PostLike, User
from ...responses import fail, ok


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def _post_to_dict(p: Post, me_id: str | None) -> dict:
    images: list[str] = []
    video_url: str | None = None
    if p.media_json:
        try:
            val = json.loads(p.media_json)
            if isinstance(val, list):
                images = [str(x) for x in val if isinstance(x, (str, int, float))]
            elif isinstance(val, dict):
                vtype = val.get("type")
                if vtype == "video":
                    url = val.get("url")
                    cover = val.get("coverUrl")
                    if isinstance(url, str) and url:
                        video_url = url
                    if isinstance(cover, str) and cover:
                        images = [cover]
                else:
                    maybe_images = val.get("images")
                    if isinstance(maybe_images, list):
                        images = [
                            str(x)
                            for x in maybe_images
                            if isinstance(x, (str, int, float))
                        ]
        except json.JSONDecodeError:
            images = []

    author = User.query.get(p.author_id)
    is_liked = False
    is_favorited = False
    is_followed = False
    if me_id:
        is_liked = PostLike.query.filter_by(user_id=me_id, post_id=p.id).first() is not None
        is_favorited = (
            PostFavorite.query.filter_by(user_id=me_id, post_id=p.id).first() is not None
        )
        is_followed = Follow.query.filter_by(follower_id=me_id, followee_id=p.author_id).first() is not None

    return {
        "id": p.id,
        "userId": p.author_id,
        "user": {
            "id": author.id,
            "nickname": author.nickname or "",
            "avatarUrl": author.avatar_url or "",
        }
        if author
        else None,
        "title": None,
        "content": p.content,
        "images": images,
        "videoUrl": video_url,
        "petType": p.post_type,
        "visibility": p.visibility,
        "status": "approved",
        "likeCount": p.like_count,
        "commentCount": p.comment_count,
        "favoriteCount": p.favorite_count,
        "isLiked": is_liked,
        "isFavorited": is_favorited,
        "isFollowed": is_followed,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
        "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
    }


def register_routes(bp) -> None:
    @bp.get("/posts")
    @require_auth
    def list_posts():
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        post_type = request.args.get("type")

        q = Post.query
        if isinstance(post_type, str) and post_type and post_type != "all":
            q = q.filter_by(post_type=post_type)
        q = q.order_by(Post.created_at.desc())

        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return ok({"list": [_post_to_dict(p, me.id) for p in items], "total": total})

    @bp.get("/users/me/posts")
    @require_auth
    def list_my_posts():
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        q = Post.query.filter_by(author_id=me.id).order_by(Post.created_at.desc())
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return ok({"list": [_post_to_dict(p, me.id) for p in items], "page": page, "pageSize": page_size, "total": total})

    @bp.get("/users/<user_id>/posts")
    @require_auth
    def list_user_posts(user_id: str):
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        q = Post.query.filter_by(author_id=user_id).order_by(Post.created_at.desc())
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return ok({"list": [_post_to_dict(p, me.id) for p in items], "page": page, "pageSize": page_size, "total": total})

    @bp.get("/posts/<post_id>")
    @require_auth
    def get_post(post_id: str):
        me: User = g.current_user
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)

        h = PostHistory.query.filter_by(user_id=me.id, post_id=p.id).first()
        if h is None:
            db.session.add(PostHistory(user_id=me.id, post_id=p.id))
        else:
            h.last_viewed_at = datetime.utcnow()
        db.session.commit()

        return ok(_post_to_dict(p, me.id))

    @bp.post("/posts")
    @require_auth
    def create_post():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        content = data.get("content")
        if not isinstance(content, str) or not content.strip():
            return fail(code="BAD_REQUEST", message="content required", status_code=400)

        media_json = None
        video_url = data.get("videoUrl")
        cover_url = data.get("coverUrl")
        images = data.get("images")
        if isinstance(video_url, str) and video_url:
            payload: dict = {"type": "video", "url": video_url}
            if isinstance(cover_url, str) and cover_url:
                payload["coverUrl"] = cover_url
            media_json = json.dumps(payload)
        elif isinstance(images, list):
            media_json = json.dumps(
                [str(x) for x in images if isinstance(x, (str, int, float))]
            )

        p = Post(
            author_id=me.id,
            content=content.strip(),
            media_json=media_json,
            location_name=(data.get("location") if isinstance(data.get("location"), str) else None),
            visibility=(data.get("visibility") if isinstance(data.get("visibility"), str) else "public"),
            post_type=(data.get("type") if isinstance(data.get("type"), str) else "all"),
        )
        db.session.add(p)
        db.session.commit()
        return ok(_post_to_dict(p, me.id), status_code=201)

    @bp.post("/posts/<post_id>/like")
    @require_auth
    def like_post(post_id: str):
        me: User = g.current_user
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if PostLike.query.filter_by(user_id=me.id, post_id=post_id).first() is None:
            db.session.add(PostLike(user_id=me.id, post_id=post_id))
            p.like_count += 1
            if p.author_id != me.id:
                db.session.add(
                    Notification(
                        user_id=p.author_id,
                        actor_id=me.id,
                        notif_type="like",
                        post_id=p.id,
                        text="赞了你的帖子",
                    )
                )
            db.session.commit()
        return ok({"ok": True})

    @bp.delete("/posts/<post_id>/like")
    @require_auth
    def unlike_post(post_id: str):
        me: User = g.current_user
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        deleted = PostLike.query.filter_by(user_id=me.id, post_id=post_id).delete()
        if deleted:
            p.like_count = max(0, p.like_count - deleted)
        db.session.commit()
        return ok({"ok": True})

    @bp.post("/posts/<post_id>/favorite")
    @require_auth
    def favorite_post(post_id: str):
        me: User = g.current_user
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if PostFavorite.query.filter_by(user_id=me.id, post_id=post_id).first() is None:
            db.session.add(PostFavorite(user_id=me.id, post_id=post_id))
            p.favorite_count += 1
            if p.author_id != me.id:
                db.session.add(
                    Notification(
                        user_id=p.author_id,
                        actor_id=me.id,
                        notif_type="favorite",
                        post_id=p.id,
                        text="收藏了你的帖子",
                    )
                )
            db.session.commit()
        return ok({"ok": True})

    @bp.delete("/posts/<post_id>/favorite")
    @require_auth
    def unfavorite_post(post_id: str):
        me: User = g.current_user
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        deleted = PostFavorite.query.filter_by(user_id=me.id, post_id=post_id).delete()
        if deleted:
            p.favorite_count = max(0, p.favorite_count - deleted)
        db.session.commit()
        return ok({"ok": True})
