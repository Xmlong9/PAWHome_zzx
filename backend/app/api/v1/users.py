from __future__ import annotations

from datetime import date

from flask import g, request
from werkzeug.security import check_password_hash, generate_password_hash

from ...auth import require_auth
from ...extensions import db
from ...models import Follow, Pet, Post, PostFavorite, PostHistory, PostLike, SmsCode, User, UserSettings
from ...responses import fail, ok


def _json() -> dict:
    return request.get_json(silent=True) or {}


def _parse_date(v) -> date | None:
    if not isinstance(v, str) or not v.strip():
        return None
    try:
        return date.fromisoformat(v)
    except ValueError:
        return None


def _parse_date_flexible(v) -> date | None:
    if not isinstance(v, str) or not v.strip():
        return None
    s = v.strip()
    d = _parse_date(s)
    if d is not None:
        return d
    if "." in s:
        parts = [p for p in s.split(".") if p]
        if len(parts) == 3:
            try:
                y = int(parts[0])
                m = int(parts[1])
                dd = int(parts[2])
                return date(y, m, dd)
            except ValueError:
                return None
    return None


def _pet_to_dict(p: Pet) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "avatarUrl": p.avatar_url or "",
        "type": p.pet_type,
        "breed": p.breed,
        "gender": p.gender or "帅哥",
        "weight": p.weight or "",
        "isSterilized": "是" if p.is_neutered else "否",
        "birthday": p.birthday.isoformat() if p.birthday else "",
    }


def _user_profile_dict(u: User) -> dict:
    post_count = Post.query.filter_by(author_id=u.id).count()
    following_count = Follow.query.filter_by(follower_id=u.id).count()
    follower_count = Follow.query.filter_by(followee_id=u.id).count()
    like_count = (
        PostLike.query.join(Post, PostLike.post_id == Post.id)
        .filter(Post.author_id == u.id)
        .count()
    )
    return {
        "id": u.id,
        "publicId": u.public_id,
        "nickname": u.nickname or "",
        "avatarUrl": u.avatar_url or "",
        "location": u.location or "",
        "signature": u.bio or "",
        "gender": u.gender,
        "birthday": u.birthday.isoformat() if u.birthday else None,
        "postCount": post_count,
        "followingCount": following_count,
        "followerCount": follower_count,
        "likeCount": like_count,
    }


def _user_brief_dict(u: User, me_id: str) -> dict:
    is_following = Follow.query.filter_by(follower_id=me_id, followee_id=u.id).first() is not None
    return {
        "id": u.id,
        "publicId": u.public_id,
        "nickname": u.nickname or "",
        "avatarUrl": u.avatar_url or "",
        "location": u.location or "",
        "signature": u.bio or "",
        "isFollowing": is_following,
    }


def register_routes(bp) -> None:
    @bp.get("/users/me")
    @require_auth
    def me():
        user: User = g.current_user
        return ok(_user_profile_dict(user))

    @bp.get("/users/<user_id>")
    @require_auth
    def get_user(user_id: str):
        u = User.query.get(user_id)
        if u is None:
            return fail(code="NOT_FOUND", message="user not found", status_code=404)
        return ok(_user_profile_dict(u))

    @bp.get("/users/me/favorites/posts")
    @require_auth
    def my_favorite_posts():
        me: User = g.current_user
        page = int(request.args.get("page", "1") or 1)
        page_size = int(request.args.get("pageSize", "10") or 10)
        page = max(1, page)
        page_size = max(1, min(50, page_size))

        ids = (
            PostFavorite.query.filter_by(user_id=me.id)
            .order_by(PostFavorite.created_at.desc())
            .all()
        )
        post_ids = [x.post_id for x in ids]
        total = len(post_ids)
        sliced = post_ids[(page - 1) * page_size : (page - 1) * page_size + page_size]
        posts = [Post.query.get(pid) for pid in sliced]
        posts = [p for p in posts if p is not None]
        from .posts import _post_to_dict

        return ok({"list": [_post_to_dict(p, me.id) for p in posts], "total": total})

    @bp.get("/users/<user_id>/favorites/posts")
    @require_auth
    def user_favorite_posts(user_id: str):
        me: User = g.current_user
        page = int(request.args.get("page", "1") or 1)
        page_size = int(request.args.get("pageSize", "10") or 10)
        page = max(1, page)
        page_size = max(1, min(50, page_size))

        ids = (
            PostFavorite.query.filter_by(user_id=user_id)
            .order_by(PostFavorite.created_at.desc())
            .all()
        )
        post_ids = [x.post_id for x in ids]
        total = len(post_ids)
        sliced = post_ids[(page - 1) * page_size : (page - 1) * page_size + page_size]
        posts = [Post.query.get(pid) for pid in sliced]
        posts = [p for p in posts if p is not None]
        from .posts import _post_to_dict

        return ok({"list": [_post_to_dict(p, me.id) for p in posts], "total": total})

    @bp.get("/users/<user_id>/likes/posts")
    @require_auth
    def user_liked_posts(user_id: str):
        me: User = g.current_user
        page = int(request.args.get("page", "1") or 1)
        page_size = int(request.args.get("pageSize", "10") or 10)
        page = max(1, page)
        page_size = max(1, min(50, page_size))

        rows = (
            PostLike.query.filter_by(user_id=user_id)
            .order_by(PostLike.created_at.desc())
            .all()
        )
        post_ids = [x.post_id for x in rows]
        total = len(post_ids)
        sliced = post_ids[(page - 1) * page_size : (page - 1) * page_size + page_size]
        posts = [Post.query.get(pid) for pid in sliced]
        posts = [p for p in posts if p is not None]
        from .posts import _post_to_dict

        return ok({"list": [_post_to_dict(p, me.id) for p in posts], "total": total})

    @bp.get("/users/me/history/posts")
    @require_auth
    def my_history_posts():
        me: User = g.current_user
        page = int(request.args.get("page", "1") or 1)
        page_size = int(request.args.get("pageSize", "10") or 10)
        page = max(1, page)
        page_size = max(1, min(50, page_size))

        rows = (
            PostHistory.query.filter_by(user_id=me.id)
            .order_by(PostHistory.last_viewed_at.desc())
            .all()
        )
        total = len(rows)
        sliced = rows[(page - 1) * page_size : (page - 1) * page_size + page_size]
        posts = [Post.query.get(r.post_id) for r in sliced]
        posts = [p for p in posts if p is not None]
        from .posts import _post_to_dict

        return ok({"list": [_post_to_dict(p, me.id) for p in posts], "total": total})

    @bp.put("/users/me/password")
    @require_auth
    def change_password():
        me: User = g.current_user
        data = _json()
        old_password = data.get("oldPassword")
        new_password = data.get("newPassword")
        if not isinstance(old_password, str) or not isinstance(new_password, str):
            return fail(code="BAD_REQUEST", message="参数错误", status_code=400)
        if not me.password_hash or not check_password_hash(me.password_hash, old_password):
            return fail(code="INVALID_CREDENTIALS", message="原密码错误", status_code=400)
        me.password_hash = generate_password_hash(new_password, method="pbkdf2:sha256")
        db.session.commit()
        return ok({"ok": True})

    @bp.put("/users/me/phone")
    @require_auth
    def change_phone():
        me: User = g.current_user
        data = _json()
        phone = data.get("phone")
        code = data.get("code")
        if not isinstance(phone, str) or not isinstance(code, str):
            return fail(code="BAD_REQUEST", message="参数错误", status_code=400)
        row = (
            SmsCode.query.filter_by(phone=phone, code=code)
            .order_by(SmsCode.created_at.desc())
            .first()
        )
        if row is None:
            return fail(code="INVALID_CODE", message="验证码错误", status_code=400)
        if User.query.filter_by(phone=phone).first() is not None:
            return fail(code="ALREADY_EXISTS", message="手机号已被占用", status_code=409)
        me.phone = phone
        db.session.commit()
        return ok({"ok": True})

    @bp.put("/users/me")
    @require_auth
    def update_me():
        user: User = g.current_user
        data = _json()

        if "nickname" in data and isinstance(data.get("nickname"), str):
            user.nickname = data.get("nickname").strip()
        if "avatarUrl" in data and isinstance(data.get("avatarUrl"), str):
            user.avatar_url = data.get("avatarUrl").strip()
        if "gender" in data and isinstance(data.get("gender"), str):
            user.gender = data.get("gender").strip()
        if "signature" in data and isinstance(data.get("signature"), str):
            user.bio = data.get("signature").strip()
        if "location" in data and isinstance(data.get("location"), str):
            user.location = data.get("location").strip()
        if "birthday" in data:
            d = _parse_date(data.get("birthday"))
            if data.get("birthday") is not None and d is None:
                return fail(code="BAD_REQUEST", message="invalid birthday", status_code=400)
            user.birthday = d

        db.session.commit()
        return ok({"ok": True})

    @bp.get("/users/me/pets")
    @require_auth
    def list_pets():
        user: User = g.current_user
        pets = Pet.query.filter_by(user_id=user.id).order_by(Pet.created_at.asc()).all()
        return ok([_pet_to_dict(p) for p in pets])

    @bp.get("/users/me/pet")
    @require_auth
    def get_pet_by_query():
        user: User = g.current_user
        pet_id = request.args.get("id")
        if isinstance(pet_id, str):
            pet_id = pet_id.strip()
            if pet_id in ("", "undefined", "null"):
                pet_id = None
        q = Pet.query.filter_by(user_id=user.id)
        if pet_id:
            p = q.filter_by(id=pet_id).first()
        else:
            p = q.order_by(Pet.created_at.asc()).first()
        if p is None:
            return fail(code="NOT_FOUND", message="pet not found", status_code=404)
        return ok(_pet_to_dict(p))

    @bp.post("/users/me/pets")
    @require_auth
    def create_pet():
        user: User = g.current_user
        data = _json()
        name = data.get("name")
        if not isinstance(name, str) or not name.strip():
            return fail(code="BAD_REQUEST", message="name required", status_code=400)
        pet_type = data.get("type")
        if not isinstance(pet_type, str) or not pet_type.strip():
            pet_type = ""

        is_sterilized = data.get("isSterilized")
        is_neutered = True if is_sterilized == "是" else False
        birthday = _parse_date_flexible(data.get("birthday"))

        p = Pet(
            user_id=user.id,
            name=name.strip(),
            pet_type=pet_type.strip() if isinstance(pet_type, str) else "",
            breed=(data.get("breed").strip() if isinstance(data.get("breed"), str) else None),
            gender=(data.get("gender").strip() if isinstance(data.get("gender"), str) else None),
            weight=(data.get("weight").strip() if isinstance(data.get("weight"), str) else None),
            is_neutered=is_neutered,
            birthday=birthday,
            avatar_url=(
                data.get("avatarUrl").strip() if isinstance(data.get("avatarUrl"), str) else None
            ),
        )
        db.session.add(p)
        db.session.commit()
        return ok({"ok": True, "data": _pet_to_dict(p)})

    @bp.put("/users/me/pets/<pet_id>")
    @require_auth
    def update_pet(pet_id: str):
        user: User = g.current_user
        p = Pet.query.filter_by(user_id=user.id, id=pet_id).first()
        if p is None:
            return fail(code="NOT_FOUND", message="pet not found", status_code=404)
        data = _json()

        if "name" in data and isinstance(data.get("name"), str) and data.get("name").strip():
            p.name = data.get("name").strip()
        if "type" in data and isinstance(data.get("type"), str):
            p.pet_type = data.get("type").strip()
        if "breed" in data and isinstance(data.get("breed"), str):
            p.breed = data.get("breed").strip()
        if "gender" in data and isinstance(data.get("gender"), str):
            p.gender = data.get("gender").strip()
        if "weight" in data and isinstance(data.get("weight"), str):
            p.weight = data.get("weight").strip()
        if "isSterilized" in data and isinstance(data.get("isSterilized"), str):
            p.is_neutered = data.get("isSterilized") == "是"
        if "birthday" in data:
            d = _parse_date_flexible(data.get("birthday"))
            if data.get("birthday") is not None and d is None:
                return fail(code="BAD_REQUEST", message="invalid birthday", status_code=400)
            p.birthday = d
        if "avatarUrl" in data and isinstance(data.get("avatarUrl"), str):
            p.avatar_url = data.get("avatarUrl").strip()

        db.session.commit()
        return ok({"ok": True, "data": _pet_to_dict(p)})

    @bp.post("/users/<user_id>/follow")
    @require_auth
    def follow(user_id: str):
        me: User = g.current_user
        if user_id == me.id:
            return fail(code="BAD_REQUEST", message="cannot follow self", status_code=400)
        if User.query.get(user_id) is None:
            return fail(code="NOT_FOUND", message="user not found", status_code=404)
        if Follow.query.filter_by(follower_id=me.id, followee_id=user_id).first() is None:
            db.session.add(Follow(follower_id=me.id, followee_id=user_id))
            db.session.commit()
        return ok({"ok": True})

    @bp.get("/users/<user_id>/following")
    @require_auth
    def list_following(user_id: str):
        me: User = g.current_user
        page = int(request.args.get("page", "1") or 1)
        page_size = int(request.args.get("pageSize", "20") or 20)
        page = max(1, page)
        page_size = max(1, min(50, page_size))

        rows = (
            Follow.query.filter_by(follower_id=user_id)
            .order_by(Follow.created_at.desc())
            .all()
        )
        total = len(rows)
        sliced = rows[(page - 1) * page_size : (page - 1) * page_size + page_size]
        users = [User.query.get(x.followee_id) for x in sliced]
        users = [u for u in users if u is not None]
        return ok({"list": [_user_brief_dict(u, me.id) for u in users], "total": total})

    @bp.get("/users/<user_id>/followers")
    @require_auth
    def list_followers(user_id: str):
        me: User = g.current_user
        page = int(request.args.get("page", "1") or 1)
        page_size = int(request.args.get("pageSize", "20") or 20)
        page = max(1, page)
        page_size = max(1, min(50, page_size))

        rows = (
            Follow.query.filter_by(followee_id=user_id)
            .order_by(Follow.created_at.desc())
            .all()
        )
        total = len(rows)
        sliced = rows[(page - 1) * page_size : (page - 1) * page_size + page_size]
        users = [User.query.get(x.follower_id) for x in sliced]
        users = [u for u in users if u is not None]
        return ok({"list": [_user_brief_dict(u, me.id) for u in users], "total": total})

    @bp.delete("/users/<user_id>/follow")
    @require_auth
    def unfollow(user_id: str):
        me: User = g.current_user
        Follow.query.filter_by(follower_id=me.id, followee_id=user_id).delete()
        db.session.commit()
        return ok({"ok": True})

    @bp.get("/users/me/settings")
    @require_auth
    def get_settings():
        user: User = g.current_user
        s = UserSettings.query.filter_by(user_id=user.id).first()
        if s is None:
            s = UserSettings(user_id=user.id)
            db.session.add(s)
            db.session.commit()
        return ok(
            {
                "pushNotice": bool(s.notification_enabled),
                "interactNotice": bool(s.notification_enabled),
                "homeAccess": "所有人可见" if s.profile_visibility == "public" else "仅自己可见",
                "commentAccess": "所有人" if s.comment_permission == "all" else "关闭评论",
            }
        )

    @bp.put("/users/me/settings")
    @require_auth
    def update_settings():
        user: User = g.current_user
        data = _json()
        s = UserSettings.query.filter_by(user_id=user.id).first()
        if s is None:
            s = UserSettings(user_id=user.id)
            db.session.add(s)

        if "pushNotice" in data:
            s.notification_enabled = bool(data.get("pushNotice"))
        if "homeAccess" in data and isinstance(data.get("homeAccess"), str):
            home_access = data.get("homeAccess")
            s.profile_visibility = "public" if home_access == "所有人可见" else "private"
        if "commentAccess" in data and isinstance(data.get("commentAccess"), str):
            comment_access = data.get("commentAccess")
            s.comment_permission = "all" if comment_access == "所有人" else "disabled"

        db.session.commit()
        return ok({"ok": True})
