import os
import sqlite3


def main() -> None:
    p = os.path.join(os.path.dirname(__file__), "..", "instance", "app.db")
    p = os.path.abspath(p)
    con = sqlite3.connect(p)
    cur = con.cursor()
    cur.execute("select name from sqlite_master where type='table' order by name")
    print([r[0] for r in cur.fetchall()])

    cur.execute("select name, tbl_name, sql from sqlite_master where type='index' and tbl_name='addresses' order by name")
    print(cur.fetchall())


if __name__ == "__main__":
    main()
