from __future__ import annotations

import json

from flask import request
from sqlalchemy import func

from ...extensions import db
from ...models import Banner, Post, PostHistory
from ...responses import ok


def _int_arg(name: str, default: int) -> int:
    v = request.args.get(name)
    try:
        return int(v) if v is not None else default
    except ValueError:
        return default


def register_routes(bp) -> None:
    @bp.get("/banners")
    def list_banners():
        slot = request.args.get("slot")
        q = Banner.query
        if isinstance(slot, str) and slot:
            q = q.filter_by(slot=slot)
        items = q.order_by(Banner.sort.asc(), Banner.created_at.desc()).all()
        return ok(
            {
                "list": [
                    {
                        "id": b.id,
                        "slot": b.slot,
                        "imageUrl": b.image_url,
                        "title": b.title,
                        "linkUrl": b.link_url,
                    }
                    for b in items
                ]
            }
        )

    @bp.get("/feeds/community")
    def community_feed():
        mode = request.args.get("mode")
        page = max(1, _int_arg("page", 1))
        page_size = max(1, min(50, _int_arg("pageSize", 5)))
        if mode == "hot":
            view_count = func.count(PostHistory.post_id)
            q = (
                db.session.query(Post, view_count.label("viewCount"))
                .outerjoin(PostHistory, PostHistory.post_id == Post.id)
                .group_by(Post.id)
                .order_by(
                    view_count.desc(),
                    Post.like_count.desc(),
                    Post.comment_count.desc(),
                    Post.created_at.desc(),
                )
            )
            rows = q.offset((page - 1) * page_size).limit(page_size).all()
            items = [r[0] for r in rows]
        else:
            q = Post.query.order_by(Post.created_at.desc())
            items = q.offset((page - 1) * page_size).limit(page_size).all()
        cards = []
        for p in items:
            image_url = ""
            if p.media_json:
                try:
                    v = json.loads(p.media_json)
                    if isinstance(v, list) and v:
                        image_url = str(v[0])
                except json.JSONDecodeError:
                    image_url = ""
            cards.append(
                {
                    "id": p.id,
                    "imageUrl": image_url,
                    "title": (p.content[:20] + "…") if len(p.content) > 20 else p.content,
                    "linkUrl": f"/pages/post-detail/index?id={p.id}",
                    "badge": "热门" if mode == "hot" else "社区",
                }
            )
        return ok({"list": cards})
