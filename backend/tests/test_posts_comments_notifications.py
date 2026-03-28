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


def test_post_location_is_returned(client, user1_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "with location", "location": "杭州滨江宝龙城"},
    )
    assert r.status_code == 201
    post = r.get_json()["data"]
    assert post["location"] == "杭州滨江宝龙城"


def test_like_and_favorite_lists_return_my_interaction_state(client, user1_token, user2_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "state test"},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    me2 = client.get("/api/v1/users/me", headers=_auth(user2_token)).get_json()["data"]
    user2_id = me2["id"]

    r = client.post(f"/api/v1/posts/{post_id}/like", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.get(f"/api/v1/users/{user2_id}/likes/posts", headers=_auth(user2_token))
    assert r.status_code == 200
    liked = next(p for p in r.get_json()["data"]["list"] if p["id"] == post_id)
    assert liked["isLiked"] is True

    r = client.delete(f"/api/v1/posts/{post_id}/like", headers=_auth(user2_token))
    assert r.status_code == 200
    r = client.post(f"/api/v1/posts/{post_id}/favorite", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.get(f"/api/v1/users/{user2_id}/favorites/posts", headers=_auth(user2_token))
    assert r.status_code == 200
    fav = next(p for p in r.get_json()["data"]["list"] if p["id"] == post_id)
    assert fav["isFavorited"] is True
    assert fav["isLiked"] is False


def test_posts_following_tab_only_returns_followed_authors(client, user1_token, user2_token):
    r = client.get("/api/v1/users/me", headers=_auth(user1_token))
    user1_id = r.get_json()["data"]["id"]
    r = client.get("/api/v1/users/me", headers=_auth(user2_token))
    user2_id = r.get_json()["data"]["id"]

    r = client.post(f"/api/v1/users/{user2_id}/follow", headers=_auth(user1_token))
    assert r.status_code == 200

    r = client.post("/api/v1/posts", headers=_auth(user2_token), json={"content": "followed post"})
    assert r.status_code == 201
    followed_post_id = r.get_json()["data"]["id"]

    r = client.post("/api/v1/posts", headers=_auth(user1_token), json={"content": "my own post"})
    assert r.status_code == 201
    own_post_id = r.get_json()["data"]["id"]

    r = client.get("/api/v1/posts", headers=_auth(user1_token), query_string={"tab": "following"})
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert followed_post_id in ids
    assert own_post_id not in ids


def test_view_count_visibility_rules(client, user1_token, user2_token):
    r = client.post("/api/v1/posts", headers=_auth(user1_token), json={"content": "view count post"})
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.get(f"/api/v1/posts/{post_id}", headers=_auth(user2_token))
    assert r.status_code == 200
    assert "viewCount" not in r.get_json()["data"]

    r = client.get(f"/api/v1/posts/{post_id}", headers=_auth(user1_token))
    assert r.status_code == 200
    assert isinstance(r.get_json()["data"]["viewCount"], int)
    assert r.get_json()["data"]["viewCount"] >= 1

    r = client.get("/api/v1/users/me", headers=_auth(user1_token))
    user1_id = r.get_json()["data"]["id"]

    r = client.get(f"/api/v1/users/{user1_id}/posts", headers=_auth(user1_token))
    assert r.status_code == 200
    my_item = next(x for x in r.get_json()["data"]["list"] if x["id"] == post_id)
    assert isinstance(my_item["viewCount"], int)

    r = client.get(f"/api/v1/users/{user1_id}/posts", headers=_auth(user2_token))
    assert r.status_code == 200
    other_item = next(x for x in r.get_json()["data"]["list"] if x["id"] == post_id)
    assert "viewCount" not in other_item

    r = client.get("/api/v1/posts", headers=_auth(user2_token))
    assert r.status_code == 200
    feed_item = next(x for x in r.get_json()["data"]["list"] if x["id"] == post_id)
    assert "viewCount" not in feed_item


def test_following_and_followers_list_api(client, user1_token, user2_token):
    me1 = client.get("/api/v1/users/me", headers=_auth(user1_token)).get_json()["data"]
    me2 = client.get("/api/v1/users/me", headers=_auth(user2_token)).get_json()["data"]

    r = client.post(f"/api/v1/users/{me2['id']}/follow", headers=_auth(user1_token))
    assert r.status_code == 200

    r = client.get(f"/api/v1/users/{me1['id']}/following", headers=_auth(user1_token))
    assert r.status_code == 200
    following_list = r.get_json()["data"]["list"]
    assert any(x["id"] == me2["id"] for x in following_list)

    r = client.get(f"/api/v1/users/{me2['id']}/followers", headers=_auth(user1_token))
    assert r.status_code == 200
    follower_list = r.get_json()["data"]["list"]
    assert any(x["id"] == me1["id"] for x in follower_list)
