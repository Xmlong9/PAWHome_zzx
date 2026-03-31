from __future__ import annotations

from flask import g, request

from ...auth import optional_auth, require_auth
import json
from urllib.parse import quote

from sqlalchemy import and_, or_

from ...search_lexicon import expand_pet_query
from ...models import Follow, Post, ShopProduct, User
from ...responses import ok
from ...search_fts import search_post_ids, search_product_ids


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def register_routes(bp) -> None:
    @bp.get("/search/posts")
    @optional_auth
    def search_posts():
        me: User | None = getattr(g, "current_user", None)
        q = (request.args.get("q") or "").strip()
        post_type = request.args.get("type")
        sort = request.args.get("sort")
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))

        followee_ids: list[str] = []
        if me is not None:
            followee_rows = Follow.query.filter_by(follower_id=me.id).all()
            followee_ids = [x.followee_id for x in followee_rows]

        default_cover = f"{request.host_url.rstrip('/')}/media/{quote('推送3.jpg')}"

        def img(p: Post) -> str:
            if not p.media_json:
                return default_cover
            try:
                v = json.loads(p.media_json)
                if isinstance(v, list) and v:
                    first = v[0]
                    if first is None or str(first) == "":
                        return default_cover
                    return str(first)
                if isinstance(v, dict):
                    vtype = v.get("type")
                    if vtype == "video":
                        cover = v.get("coverUrl")
                        if isinstance(cover, str) and cover:
                            return cover
                        return default_cover
                    images = v.get("images")
                    if isinstance(images, list) and images:
                        first = images[0]
                        if first is None or str(first) == "":
                            return default_cover
                        return str(first)
            except json.JSONDecodeError:
                return default_cover
            return default_cover

        query = Post.query
        if q:
            terms = expand_pet_query(q, max_terms=40)
            if terms:
                fts = search_post_ids(
                    terms=terms,
                    me_id=me.id if me else None,
                    followee_ids=followee_ids,
                    post_type=post_type if isinstance(post_type, str) else None,
                    sort=sort,
                    page=page,
                    page_size=page_size,
                )
                if fts is not None:
                    ids, total = fts
                    rows = Post.query.filter(Post.id.in_(ids)).all()
                    by_id = {p.id: p for p in rows}
                    ordered = [by_id[i] for i in ids if i in by_id]
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
                                for p in ordered
                            ],
                            "total": total,
                        }
                    )
                query = query.filter(or_(*[Post.content.contains(t) for t in terms]))

        if isinstance(post_type, str) and post_type and post_type != "all":
            query = query.filter(Post.post_type == post_type)

        allowed = [Post.visibility == "public"]
        if me is not None:
            allowed.append(Post.author_id == me.id)
            if followee_ids:
                allowed.append(and_(Post.visibility == "followers", Post.author_id.in_(followee_ids)))
        query = query.filter(or_(*allowed))

        if sort == "latest":
            query = query.order_by(Post.created_at.desc())
        else:
            score = Post.like_count + Post.comment_count + Post.favorite_count
            query = query.order_by(score.desc(), Post.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

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
    @optional_auth
    def search_products():
        q = (request.args.get("q") or "").strip()
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 10)))

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

        query = ShopProduct.query.filter_by(is_active=True)
        if q:
            terms = expand_pet_query(q, max_terms=60)
            if terms:
                fts = search_product_ids(terms=terms, page=page, page_size=page_size)
                if fts is not None:
                    ids, total = fts
                    rows = ShopProduct.query.filter(ShopProduct.id.in_(ids)).all()
                    by_id = {p.id: p for p in rows}
                    ordered = [by_id[i] for i in ids if i in by_id]
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
                                for p in ordered
                            ],
                            "total": total,
                        }
                    )
                term_ors = []
                for t in terms:
                    ors = [ShopProduct.title.contains(t), ShopProduct.description.contains(t)]
                    if t.isascii():
                        ors.append(ShopProduct.title_pinyin.contains(t))
                        ors.append(ShopProduct.title_initials.contains(t))
                    term_ors.append(or_(*ors))
                query = query.filter(or_(*term_ors))
        query = query.order_by(ShopProduct.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

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
