from __future__ import annotations

from typing import Any

from sqlalchemy import text

from .extensions import db


def _has_table(name: str) -> bool:
    r = db.session.execute(
        text("SELECT 1 FROM sqlite_master WHERE type='table' AND name=:n LIMIT 1"),
        {"n": name},
    ).first()
    return r is not None


def fts_ready() -> bool:
    return _has_table("posts_fts") and _has_table("shop_products_fts")


def _escape_term(t: str) -> str:
    return t.replace('"', "").strip()


def _fts_query(terms: list[str]) -> str:
    cleaned = [_escape_term(t) for t in terms if _escape_term(t)]
    if not cleaned:
        return ""
    return " OR ".join([f'"{t}"' for t in cleaned])


def search_product_ids(terms: list[str], page: int, page_size: int) -> tuple[list[str], int] | None:
    if not _has_table("shop_products_fts"):
        return None
    q = _fts_query(terms)
    if not q:
        return None
    offset = (page - 1) * page_size
    total = db.session.execute(
        text(
            """
            SELECT COUNT(1)
            FROM shop_products sp
            JOIN shop_products_fts fts ON fts.rowid = sp.rowid
            WHERE sp.is_active = 1 AND shop_products_fts MATCH :q
            """
        ),
        {"q": q},
    ).scalar_one()
    rows = db.session.execute(
        text(
            """
            SELECT sp.id
            FROM shop_products sp
            JOIN shop_products_fts fts ON fts.rowid = sp.rowid
            WHERE sp.is_active = 1 AND shop_products_fts MATCH :q
            ORDER BY sp.created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"q": q, "limit": page_size, "offset": offset},
    ).all()
    return [r[0] for r in rows], int(total)


def search_post_ids(
    terms: list[str],
    me_id: str | None,
    followee_ids: list[str],
    post_type: str | None,
    sort: str | None,
    page: int,
    page_size: int,
) -> tuple[list[str], int] | None:
    if not _has_table("posts_fts"):
        return None
    q = _fts_query(terms)
    if not q:
        return None
    offset = (page - 1) * page_size

    where = ["posts_fts MATCH :q"]
    params: dict[str, Any] = {"q": q, "limit": page_size, "offset": offset}

    if post_type and post_type != "all":
        where.append("p.post_type = :post_type")
        params["post_type"] = post_type

    allowed = ["p.visibility = 'public'"]
    if me_id:
        allowed.append("p.author_id = :me_id")
        params["me_id"] = me_id
        if followee_ids:
            in_params = []
            for i, fid in enumerate(followee_ids):
                k = f"fid{i}"
                params[k] = fid
                in_params.append(f":{k}")
            allowed.append(f"(p.visibility = 'followers' AND p.author_id IN ({', '.join(in_params)}))")
    where.append("(" + " OR ".join(allowed) + ")")

    order = "p.created_at DESC"
    if sort != "latest":
        order = "(p.like_count + p.comment_count + p.favorite_count) DESC, p.created_at DESC"

    total = db.session.execute(
        text(
            f"""
            SELECT COUNT(1)
            FROM posts p
            JOIN posts_fts ON posts_fts.rowid = p.rowid
            WHERE {' AND '.join(where)}
            """
        ),
        params,
    ).scalar_one()
    rows = db.session.execute(
        text(
            f"""
            SELECT p.id
            FROM posts p
            JOIN posts_fts ON posts_fts.rowid = p.rowid
            WHERE {' AND '.join(where)}
            ORDER BY {order}
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).all()
    return [r[0] for r in rows], int(total)

