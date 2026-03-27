def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_post_interactions_create_notifications(client, user1_token, user2_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "hello world", "images": ["/a.jpg"]},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.post(f"/api/v1/posts/{post_id}/like", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.post(f"/api/v1/posts/{post_id}/favorite", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.post(
        "/api/v1/comments",
        headers=_auth(user2_token),
        json={"postId": post_id, "content": "nice"},
    )
    assert r.status_code == 201

    r = client.get("/api/v1/notifications", headers=_auth(user1_token), query_string={"type": "like"})
    assert r.status_code == 200
    like_list = r.get_json()["data"]["list"]
    assert len(like_list) == 1
    assert like_list[0]["type"] == "like"

    r = client.get(
        "/api/v1/notifications",
        headers=_auth(user1_token),
        query_string={"type": "comment"},
    )
    assert r.status_code == 200
    comment_list = r.get_json()["data"]["list"]
    assert len(comment_list) == 1
    assert comment_list[0]["type"] == "comment"


def test_history_favorites_and_likes_lists(client, user1_token, user2_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "history test"},
    )
    post_id = r.get_json()["data"]["id"]

    r = client.get(f"/api/v1/posts/{post_id}", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.get("/api/v1/users/me/history/posts", headers=_auth(user2_token))
    assert r.status_code == 200
    hist = r.get_json()["data"]["list"]
    assert any(p["id"] == post_id for p in hist)

    r = client.post(f"/api/v1/posts/{post_id}/like", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.post(f"/api/v1/posts/{post_id}/favorite", headers=_auth(user2_token))
    assert r.status_code == 200

    me2 = client.get("/api/v1/users/me", headers=_auth(user2_token)).get_json()["data"]
    user2_id = me2["id"]

    r = client.get(f"/api/v1/users/{user2_id}/likes/posts", headers=_auth(user1_token))
    assert r.status_code == 200
    liked = r.get_json()["data"]["list"]
    assert any(p["id"] == post_id for p in liked)

    r = client.get(f"/api/v1/users/{user2_id}/favorites/posts", headers=_auth(user1_token))
    assert r.status_code == 200
    fav = r.get_json()["data"]["list"]
    assert any(p["id"] == post_id for p in fav)


def test_comment_like_state_is_returned_and_idempotent(client, user1_token, user2_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "comment like state"},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.post(
        "/api/v1/comments",
        headers=_auth(user2_token),
        json={"postId": post_id, "content": "c1"},
    )
    assert r.status_code == 201
    comment_id = r.get_json()["data"]["id"]

    r = client.post(f"/api/v1/comments/{comment_id}/like", headers=_auth(user1_token))
    assert r.status_code == 200
    r = client.post(f"/api/v1/comments/{comment_id}/like", headers=_auth(user1_token))
    assert r.status_code == 200

    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=_auth(user1_token))
    assert r.status_code == 200
    items = r.get_json()["data"]["list"]
    c1 = next(x for x in items if x["id"] == comment_id)
    assert c1["likeCount"] == 1
    assert c1["isLiked"] is True
