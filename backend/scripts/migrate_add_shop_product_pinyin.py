import sqlite3
import sys
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "instance" / "app.db"
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def main() -> None:
    from app.pinyin import to_pinyin_full_and_initials

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    columns = [row[1] for row in cur.execute("PRAGMA table_info(shop_products)").fetchall()]
    if "title_pinyin" not in columns:
        cur.execute("ALTER TABLE shop_products ADD COLUMN title_pinyin TEXT")
    if "title_initials" not in columns:
        cur.execute("ALTER TABLE shop_products ADD COLUMN title_initials TEXT")

    rows = cur.execute("SELECT id, title FROM shop_products").fetchall()
    for product_id, title in rows:
        full, initials = to_pinyin_full_and_initials(title or "")
        cur.execute(
            "UPDATE shop_products SET title_pinyin = ?, title_initials = ? WHERE id = ?",
            (full, initials, product_id),
        )

    cur.execute("CREATE INDEX IF NOT EXISTS ix_shop_products_title_pinyin ON shop_products(title_pinyin)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_shop_products_title_initials ON shop_products(title_initials)")
    conn.commit()
    conn.close()

    print(f"db={DB_PATH}")
    print(f"updated_rows={len(rows)}")


if __name__ == "__main__":
    main()

