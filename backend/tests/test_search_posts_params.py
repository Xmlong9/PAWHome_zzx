from __future__ import annotations

from datetime import datetime, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_search_posts_supports_type_and_sort(client, app, user1_token, user2_token):
    from app.extensions import db
    from app.models import Post

    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    kw = "猫粮"

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": f"{kw} cat low", "images": [], "type": "cat", "visibility": "public"},
    )
    assert r.status_code == 201
    cat_low_id = r.get_json()["data"]["id"]

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": f"{kw} cat high", "images": [], "type": "cat", "visibility": "public"},
    )
    assert r.status_code == 201
    cat_high_id = r.get_json()["data"]["id"]

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": f"{kw} dog", "images": [], "type": "dog", "visibility": "public"},
    )
    assert r.status_code == 201
    dog_id = r.get_json()["data"]["id"]

    now = datetime.utcnow()
    with app.app_context():
        p_low = Post.query.get(cat_low_id)
        p_high = Post.query.get(cat_high_id)
        p_dog = Post.query.get(dog_id)
        assert p_low and p_high and p_dog

        p_low.created_at = now - timedelta(days=2)
        p_high.created_at = now - timedelta(days=3)
        p_dog.created_at = now - timedelta(days=1)

        p_low.like_count = 1
        p_low.comment_count = 1
        p_low.favorite_count = 0

        p_high.like_count = 9
        p_high.comment_count = 5
        p_high.favorite_count = 2

        p_dog.like_count = 0
        p_dog.comment_count = 0
        p_dog.favorite_count = 0

        db.session.commit()

    r = client.get(
        "/api/v1/search/posts",
        headers=h2,
        query_string={"q": kw, "type": "cat", "sort": "latest", "page": 1, "pageSize": 10},
    )
    assert r.status_code == 200
    got = r.get_json()["data"]["list"]
    ids = [x["id"] for x in got]
    assert dog_id not in ids
    assert ids[:2] == [cat_low_id, cat_high_id]

    r = client.get(
        "/api/v1/search/posts",
        headers=h2,
        query_string={"q": kw, "type": "cat", "sort": "hot", "page": 1, "pageSize": 10},
    )
    assert r.status_code == 200
    got = r.get_json()["data"]["list"]
    ids = [x["id"] for x in got]
    assert ids[:2] == [cat_high_id, cat_low_id]

