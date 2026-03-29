from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_search_posts_returns_cover_for_video_posts(client, app, user1_token, user2_token):
    from app.extensions import db
    from app.models import Post
    import json

    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    cover = "https://example.com/c.jpg"
    video = "https://example.com/v.mp4"
    kw = "视频封面测试"

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={
            "content": kw,
            "videoUrl": video,
            "coverUrl": cover,
            "type": "all",
            "visibility": "public",
        },
    )
    assert r.status_code == 201
    pid = r.get_json()["data"]["id"]

    with app.app_context():
        p = Post.query.get(pid)
        assert p is not None
        p.media_json = json.dumps({"type": "video", "url": video, "coverUrl": cover})
        db.session.commit()

    r = client.get("/api/v1/search/posts", headers=h2, query_string={"q": kw, "page": 1, "pageSize": 10})
    assert r.status_code == 200
    item = r.get_json()["data"]["list"][0]
    assert item["image"] == cover

