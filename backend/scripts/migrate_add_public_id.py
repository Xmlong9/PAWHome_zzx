import random
import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "instance" / "app.db"


def _random_public_id(used: set[str]) -> str:
    value = "".join(str(random.randint(0, 9)) for _ in range(8))
    while value in used:
        value = "".join(str(random.randint(0, 9)) for _ in range(8))
    return value


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    columns = [row[1] for row in cur.execute("PRAGMA table_info(users)").fetchall()]
    if "public_id" not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN public_id TEXT")

    used = {
        row[0]
        for row in cur.execute(
            "SELECT public_id FROM users WHERE public_id IS NOT NULL AND public_id != ''"
        ).fetchall()
    }
    rows = cur.execute(
        "SELECT id FROM users WHERE public_id IS NULL OR public_id = ''"
    ).fetchall()
    for (user_id,) in rows:
        public_id = _random_public_id(used)
        used.add(public_id)
        cur.execute("UPDATE users SET public_id = ? WHERE id = ?", (public_id, user_id))

    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_public_id ON users(public_id)")
    conn.commit()
    conn.close()

    print(f"db={DB_PATH}")
    print(f"filled_rows={len(rows)}")


if __name__ == "__main__":
    main()
