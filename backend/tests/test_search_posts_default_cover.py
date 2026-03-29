from __future__ import annotations

from urllib.parse import quote


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_search_posts_returns_default_cover_when_missing(client, user1_token, user2_token):
    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    kw = "无封面测试"
    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": kw, "images": [], "type": "all", "visibility": "public"},
    )
    assert r.status_code == 201

    r = client.get("/api/v1/search/posts", headers=h2, query_string={"q": kw, "page": 1, "pageSize": 10})
    assert r.status_code == 200
    item = r.get_json()["data"]["list"][0]
    expected = f"http://localhost/media/{quote('推送3.jpg')}"
    assert item["image"] == expected

