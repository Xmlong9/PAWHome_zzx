import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "instance" / "app.db"


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts
        USING fts5(content, content='posts', content_rowid='rowid');

        CREATE VIRTUAL TABLE IF NOT EXISTS shop_products_fts
        USING fts5(title, description, title_pinyin, title_initials, content='shop_products', content_rowid='rowid');

        CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
          INSERT INTO posts_fts(rowid, content) VALUES (new.rowid, new.content);
        END;
        CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
          INSERT INTO posts_fts(posts_fts, rowid, content) VALUES('delete', old.rowid, old.content);
        END;
        CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
          INSERT INTO posts_fts(posts_fts, rowid, content) VALUES('delete', old.rowid, old.content);
          INSERT INTO posts_fts(rowid, content) VALUES (new.rowid, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS shop_products_ai AFTER INSERT ON shop_products BEGIN
          INSERT INTO shop_products_fts(rowid, title, description, title_pinyin, title_initials)
          VALUES (new.rowid, new.title, new.description, new.title_pinyin, new.title_initials);
        END;
        CREATE TRIGGER IF NOT EXISTS shop_products_ad AFTER DELETE ON shop_products BEGIN
          INSERT INTO shop_products_fts(shop_products_fts, rowid, title, description, title_pinyin, title_initials)
          VALUES('delete', old.rowid, old.title, old.description, old.title_pinyin, old.title_initials);
        END;
        CREATE TRIGGER IF NOT EXISTS shop_products_au AFTER UPDATE ON shop_products BEGIN
          INSERT INTO shop_products_fts(shop_products_fts, rowid, title, description, title_pinyin, title_initials)
          VALUES('delete', old.rowid, old.title, old.description, old.title_pinyin, old.title_initials);
          INSERT INTO shop_products_fts(rowid, title, description, title_pinyin, title_initials)
          VALUES (new.rowid, new.title, new.description, new.title_pinyin, new.title_initials);
        END;
        """
    )

    cur.execute("INSERT INTO posts_fts(posts_fts) VALUES('rebuild')")
    cur.execute("INSERT INTO shop_products_fts(shop_products_fts) VALUES('rebuild')")
    conn.commit()
    conn.close()

    print(f"db={DB_PATH}")
    print("fts=ready")


if __name__ == "__main__":
    main()

