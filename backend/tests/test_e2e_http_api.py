from __future__ import annotations

import json
import os
import socket
import threading
import time
import urllib.error
import urllib.request


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    _, port = s.getsockname()
    s.close()
    return int(port)


def _http_json(base: str, method: str, path: str, token: str | None = None, body: dict | None = None):
    url = base + path
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        return e.code, json.loads(raw)


def test_e2e_http_happy_path(tmp_path, monkeypatch):
    db_path = tmp_path / "e2e.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    from app import create_app
    from app.extensions import db
    from werkzeug.serving import make_server

    app = create_app("testing")
    app.config.update({"TESTING": False})
    with app.app_context():
        db.drop_all()
        db.create_all()

    port = _free_port()
    server = make_server("127.0.0.1", port, app)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    base = f"http://127.0.0.1:{port}"

    try:
        for _ in range(20):
            try:
                code, _ = _http_json(base, "GET", "/api/v1/health")
                if code == 200:
                    break
            except Exception:
                pass
            time.sleep(0.05)

        code, body = _http_json(
            base,
            "POST",
            "/api/v1/auth/register",
            body={"phone": "13800009999", "password": "pass", "nickname": "e2e"},
        )
        assert code == 200
        token = body["data"]["token"]
        assert token

        code, me = _http_json(base, "GET", "/api/v1/users/me", token=token)
        assert code == 200
        assert me["data"]["id"]

        code, post = _http_json(
            base,
            "POST",
            "/api/v1/posts",
            token=token,
            body={"content": "hello", "images": []},
        )
        assert code == 201
        post_id = post["data"]["id"]
        assert post_id

        code, posts = _http_json(base, "GET", "/api/v1/posts?page=1&pageSize=10&type=all", token=token)
        assert code == 200
        assert any(x["id"] == post_id for x in posts["data"]["list"])

        code, c1 = _http_json(
            base,
            "POST",
            "/api/v1/comments",
            token=token,
            body={"postId": post_id, "content": "nice"},
        )
        assert code == 201
        comment_id = c1["data"]["id"]
        assert comment_id

        code, comments = _http_json(
            base,
            "GET",
            f"/api/v1/posts/{post_id}/comments?page=1&pageSize=10",
            token=token,
        )
        assert code == 200
        assert any(x["id"] == comment_id for x in comments["data"]["list"])

        code, liked = _http_json(base, "POST", f"/api/v1/posts/{post_id}/like", token=token)
        assert code == 200
        assert liked["data"]["ok"] is True

        code, pet = _http_json(
            base,
            "POST",
            "/api/v1/users/me/pets",
            token=token,
            body={
                "name": "宠物",
                "type": "猫",
                "gender": "帅哥",
                "weight": "3kg",
                "isSterilized": "否",
                "birthday": "2022-05-20",
                "avatarUrl": "",
            },
        )
        assert code == 200
        pet_id = pet["data"]["data"]["id"]

        code, appt = _http_json(
            base,
            "POST",
            "/api/v1/services/appointments",
            token=token,
            body={
                "serviceType": "体检",
                "appointmentAt": "2026-01-01T10:00:00+08:00",
                "petId": pet_id,
                "address": "x",
            },
        )
        assert code == 201
        assert appt["data"]["status"] == "scheduled"
    finally:
        server.shutdown()

