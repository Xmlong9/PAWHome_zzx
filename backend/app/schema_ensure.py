from __future__ import annotations

from sqlalchemy import text

from .extensions import db
from .pinyin import to_pinyin_full_and_initials


def _has_table(name: str) -> bool:
    r = db.session.execute(
        text("SELECT 1 FROM sqlite_master WHERE type='table' AND name=:n LIMIT 1"),
        {"n": name},
    ).first()
    return r is not None


def ensure_shop_product_pinyin_columns() -> None:
    if not _has_table("shop_products"):
        return

    cols = [r[1] for r in db.session.execute(text("PRAGMA table_info(shop_products)")).all()]
    need_pinyin = "title_pinyin" not in cols
    need_initials = "title_initials" not in cols

    if need_pinyin:
        db.session.execute(text("ALTER TABLE shop_products ADD COLUMN title_pinyin TEXT"))
    if need_initials:
        db.session.execute(text("ALTER TABLE shop_products ADD COLUMN title_initials TEXT"))
    if need_pinyin or need_initials:
        db.session.commit()

    if need_pinyin or need_initials:
        rows = db.session.execute(text("SELECT id, title FROM shop_products")).all()
        for pid, title in rows:
            full, initials = to_pinyin_full_and_initials(title or "")
            db.session.execute(
                text(
                    "UPDATE shop_products SET title_pinyin=:p, title_initials=:i WHERE id=:id"
                ),
                {"p": full, "i": initials, "id": pid},
            )
        db.session.commit()

    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_shop_products_title_pinyin ON shop_products(title_pinyin)"))
    db.session.execute(
        text("CREATE INDEX IF NOT EXISTS ix_shop_products_title_initials ON shop_products(title_initials)")
    )
    db.session.commit()

