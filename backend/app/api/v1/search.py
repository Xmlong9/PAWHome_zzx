from __future__ import annotations

from flask import g, request

from ...auth import require_auth
import json

from ...models import Post, ShopProduct, User
from ...responses import ok


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def register_routes(bp) -> None:
    @bp.get("/search/posts")
    @require_auth
    def search_posts():
        _me: User = g.current_user
        q = (request.args.get("q") or "").strip()
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        query = Post.query
        if q:
            query = query.filter(Post.content.contains(q))
        query = query.order_by(Post.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

        def img(p: Post) -> str:
            if not p.media_json:
                return ""
            try:
                v = json.loads(p.media_json)
                if isinstance(v, list) and v:
                    return str(v[0])
            except json.JSONDecodeError:
                return ""
            return ""

        return ok(
            {
                "list": [
                    {
                        "id": p.id,
                        "title": (p.content[:18] + "…") if len(p.content) > 18 else p.content,
                        "summary": p.content,
                        "image": img(p),
                        "likes": p.like_count,
                        "comments": p.comment_count,
                    }
                    for p in items
                ],
                "total": total,
            }
        )

    @bp.get("/search/users")
    @require_auth
    def search_users():
        _me: User = g.current_user
        q = (request.args.get("q") or "").strip()
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        query = User.query
        if q:
            query = query.filter(User.nickname.contains(q))
        query = query.order_by(User.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return ok({"list": [{"id": u.id, "nickname": u.nickname, "avatarUrl": u.avatar_url} for u in items], "total": total})

    @bp.get("/search/products")
    @require_auth
    def search_products():
        _me: User = g.current_user
        q = (request.args.get("q") or "").strip()
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))
        query = ShopProduct.query.filter_by(is_active=True)
        if q:
            query = query.filter(ShopProduct.title.contains(q))
        query = query.order_by(ShopProduct.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

        def img(p: ShopProduct) -> str:
            if not p.images_json:
                return ""
            try:
                v = json.loads(p.images_json)
                if isinstance(v, list) and v:
                    return str(v[0])
            except json.JSONDecodeError:
                return ""
            return ""

        return ok(
            {
                "list": [
                    {
                        "id": p.id,
                        "title": p.title,
                        "summary": "销量 0 · 100%好评",
                        "image": img(p),
                        "price": round(p.price_cents / 100, 2),
                    }
                    for p in items
                ],
                "total": total,
            }
        )
