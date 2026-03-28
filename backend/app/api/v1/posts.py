from __future__ import annotations

import json
import random
import string
from datetime import datetime

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import (
    Comment,
    CommentLike,
    CommentPin,
    Follow,
    Notification,
    Post,
    PostFavorite,
    PostHistory,
    PostPin,
    PostLike,
    User,
)
from ...responses import fail, ok
from ...timeutil import dt_to_bj_iso


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def _view_count(post_id: str) -> int:
    return PostHistory.query.filter_by(post_id=post_id).count()


def _ensure_comment_pin_table() -> None:
    CommentPin.__table__.create(bind=db.engine, checkfirst=True)


def _ensure_post_pin_table() -> None:
    PostPin.__table__.create(bind=db.engine, checkfirst=True)


def _post_to_dict(p: Post, me_id: str | None, include_view_count: bool = False) -> dict:
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

    _ensure_post_pin_table()
    is_pinned = PostPin.query.filter_by(post_id=p.id).first() is not None

    data = {
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
        "location": p.location_name,
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
        "isPinned": is_pinned,
        "createdAt": dt_to_bj_iso(p.created_at),
        "updatedAt": dt_to_bj_iso(p.updated_at),
    }
    if include_view_count:
        data["viewCount"] = _view_count(p.id)
    return data


def register_routes(bp) -> None:
    @bp.get("/posts")
    @require_auth
    def list_posts():
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        post_type = request.args.get("type")
        tab = request.args.get("tab")

        q = Post.query
        if tab == "following":
            followee_rows = Follow.query.filter_by(follower_id=me.id).all()
            followee_ids = [x.followee_id for x in followee_rows]
            if followee_ids:
                q = q.filter(Post.author_id.in_(followee_ids))
            else:
                q = q.filter(Post.author_id == "__none__")
        if isinstance(post_type, str) and post_type and post_type != "all":
            q = q.filter_by(post_type=post_type)
        if tab == "recommend" or tab is None or tab == "":
            q = q.order_by(
                Post.like_count.desc(),
                Post.favorite_count.desc(),
                Post.comment_count.desc(),
                Post.created_at.desc(),
            )
        else:
            q = q.order_by(Post.created_at.desc())

        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return ok({"list": [_post_to_dict(p, me.id, include_view_count=False) for p in items], "total": total})

    @bp.get("/users/me/posts")
    @require_auth
    def list_my_posts():
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        q = Post.query.filter_by(author_id=me.id).order_by(Post.created_at.desc())
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return ok({"list": [_post_to_dict(p, me.id, include_view_count=True) for p in items], "page": page, "pageSize": page_size, "total": total})

    @bp.get("/users/<user_id>/posts")
    @require_auth
    def list_user_posts(user_id: str):
        me: User = g.current_user
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        q = Post.query.filter_by(author_id=user_id).order_by(Post.created_at.desc())
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        include_view_count = me.id == user_id
        return ok({"list": [_post_to_dict(p, me.id, include_view_count=include_view_count) for p in items], "page": page, "pageSize": page_size, "total": total})

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

        return ok(_post_to_dict(p, me.id, include_view_count=(me.id == p.author_id)))

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
        return ok(_post_to_dict(p, me.id, include_view_count=True), status_code=201)

    @bp.put("/posts/<post_id>")
    @require_auth
    def update_post(post_id: str):
        me: User = g.current_user
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if p.author_id != me.id:
            return fail(code="FORBIDDEN", message="forbidden", status_code=403)

        data = request.get_json(silent=True) or {}
        content = data.get("content")
        if not isinstance(content, str) or not content.strip():
            return fail(code="BAD_REQUEST", message="content required", status_code=400)
        p.content = content.strip()
        visibility = data.get("visibility")
        if isinstance(visibility, str) and visibility in {"public", "followers", "private"}:
            p.visibility = visibility
        db.session.commit()
        return ok(_post_to_dict(p, me.id, include_view_count=True))

    @bp.delete("/posts/<post_id>")
    @require_auth
    def delete_post(post_id: str):
        me: User = g.current_user
        _ensure_comment_pin_table()
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if p.author_id != me.id:
            return fail(code="FORBIDDEN", message="forbidden", status_code=403)

        comment_rows = Comment.query.filter_by(post_id=post_id).all()
        comment_ids = [x.id for x in comment_rows]
        if comment_ids:
            CommentLike.query.filter(CommentLike.comment_id.in_(comment_ids)).delete(
                synchronize_session=False
            )
            Notification.query.filter(Notification.comment_id.in_(comment_ids)).delete(
                synchronize_session=False
            )
            Comment.query.filter(Comment.id.in_(comment_ids)).delete(synchronize_session=False)

        Notification.query.filter_by(post_id=post_id).delete(synchronize_session=False)
        PostLike.query.filter_by(post_id=post_id).delete(synchronize_session=False)
        PostFavorite.query.filter_by(post_id=post_id).delete(synchronize_session=False)
        PostHistory.query.filter_by(post_id=post_id).delete(synchronize_session=False)
        PostPin.query.filter_by(post_id=post_id).delete(synchronize_session=False)
        CommentPin.query.filter_by(post_id=post_id).delete(synchronize_session=False)
        db.session.delete(p)
        db.session.commit()
        return ok({"ok": True})

    @bp.put("/posts/<post_id>/pin")
    @require_auth
    def pin_post(post_id: str):
        me: User = g.current_user
        _ensure_post_pin_table()
        p = Post.query.get(post_id)
        if p is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        if p.author_id != me.id:
            return fail(code="FORBIDDEN", message="forbidden", status_code=403)

        data = request.get_json(silent=True) or {}
        is_pinned = bool(data.get("isPinned", True))
        row = PostPin.query.filter_by(post_id=post_id).first()
        if is_pinned:
            if row is None:
                cnt = PostPin.query.filter_by(user_id=me.id).count()
                if cnt >= 3:
                    return fail(code="PIN_LIMIT_REACHED", message="pin limit reached", status_code=400)
                db.session.add(PostPin(user_id=me.id, post_id=post_id))
        else:
            PostPin.query.filter_by(post_id=post_id).delete(synchronize_session=False)
        db.session.commit()
        return ok({"ok": True, "isPinned": is_pinned})

    @bp.get("/posts/<post_id>/share-targets")
    @require_auth
    def share_targets(post_id: str):
        me: User = g.current_user
        if Post.query.get(post_id) is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)

        following_rows = Follow.query.filter_by(follower_id=me.id).all()
        follower_rows = Follow.query.filter_by(followee_id=me.id).all()
        following_ids = {x.followee_id for x in following_rows}
        follower_ids = {x.follower_id for x in follower_rows}

        all_ids = sorted(list(following_ids | follower_ids))
        users = User.query.filter(User.id.in_(all_ids)).all() if all_ids else []
        user_map = {x.id: x for x in users}
        result: list[dict] = []
        for uid in all_ids:
            u = user_map.get(uid)
            if u is None:
                continue
            if uid in following_ids and uid in follower_ids:
                group = "mutual"
            elif uid in following_ids:
                group = "following"
            else:
                group = "follower"
            result.append(
                {
                    "id": uid,
                    "nickname": u.nickname or "",
                    "avatarUrl": u.avatar_url or "",
                    "group": group,
                }
            )
        return ok({"list": result})

    @bp.get("/posts/<post_id>/share-link")
    @require_auth
    def share_link(post_id: str):
        me: User = g.current_user
        if Post.query.get(post_id) is None:
            return fail(code="NOT_FOUND", message="post not found", status_code=404)
        trace = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
        path = f"/pages/post-detail/index?id={post_id}&from={me.id}&trace={trace}"
        short_url = f"https://pawhome.app/p/{post_id[:8]}?u={me.id[:8]}&t={trace}"
        return ok({"path": path, "shortUrl": short_url, "trace": trace})

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
