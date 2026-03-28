def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_post_interactions_create_notifications(client, user1_token, user2_token):
    me1 = client.get("/api/v1/users/me", headers=_auth(user1_token)).get_json()["data"]
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

    r = client.post(f"/api/v1/users/{me1['id']}/follow", headers=_auth(user2_token))
    assert r.status_code == 200

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

    r = client.get("/api/v1/notifications", headers=_auth(user1_token), query_string={"type": "follow"})
    assert r.status_code == 200
    follow_list = r.get_json()["data"]["list"]
    assert len(follow_list) == 1
    assert follow_list[0]["type"] == "follow"


def test_notification_unread_summary_and_mark_read(client, user1_token, user2_token):
    me1 = client.get("/api/v1/users/me", headers=_auth(user1_token)).get_json()["data"]
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "summary test", "images": ["/s.jpg"]},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.post(f"/api/v1/posts/{post_id}/like", headers=_auth(user2_token))
    assert r.status_code == 200
    r = client.post(
        "/api/v1/comments",
        headers=_auth(user2_token),
        json={"postId": post_id, "content": "summary comment"},
    )
    assert r.status_code == 201
    r = client.post(f"/api/v1/users/{me1['id']}/follow", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.get("/api/v1/notifications/unread-summary", headers=_auth(user1_token))
    assert r.status_code == 200
    summary = r.get_json()["data"]
    assert summary["like"] == 1
    assert summary["comment"] == 1
    assert summary["follow"] == 1
    assert summary["total"] == 3

    r = client.put("/api/v1/notifications/read", headers=_auth(user1_token), json={"type": "like"})
    assert r.status_code == 200

    r = client.get("/api/v1/notifications/unread-summary", headers=_auth(user1_token))
    assert r.status_code == 200
    summary = r.get_json()["data"]
    assert summary["like"] == 0
    assert summary["comment"] == 1
    assert summary["follow"] == 1
    assert summary["total"] == 2


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


def test_delete_post_requires_author_and_cleans_relations(client, user1_token, user2_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "post to delete", "images": ["/d.jpg"]},
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
        json={"postId": post_id, "content": "will be removed"},
    )
    assert r.status_code == 201

    r = client.delete(f"/api/v1/posts/{post_id}", headers=_auth(user2_token))
    assert r.status_code == 403

    r = client.delete(f"/api/v1/posts/{post_id}", headers=_auth(user1_token))
    assert r.status_code == 200

    r = client.get(f"/api/v1/posts/{post_id}", headers=_auth(user1_token))
    assert r.status_code == 404

    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=_auth(user1_token))
    assert r.status_code == 404


def test_edit_post_content_only_by_author(client, user1_token, user2_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "before edit"},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.put(
        f"/api/v1/posts/{post_id}",
        headers=_auth(user2_token),
        json={"content": "hacked"},
    )
    assert r.status_code == 403

    r = client.put(
        f"/api/v1/posts/{post_id}",
        headers=_auth(user1_token),
        json={"content": "after edit"},
    )
    assert r.status_code == 200
    assert r.get_json()["data"]["content"] == "after edit"

    r = client.get(f"/api/v1/posts/{post_id}", headers=_auth(user1_token))
    assert r.status_code == 200
    assert r.get_json()["data"]["content"] == "after edit"


def test_delete_comment_by_self_or_post_author(client, user1_token, user2_token):
    r = client.post("/api/v1/posts", headers=_auth(user1_token), json={"content": "comment delete test"})
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.post(
        "/api/v1/comments",
        headers=_auth(user2_token),
        json={"postId": post_id, "content": "cmt"},
    )
    assert r.status_code == 201
    comment_id = r.get_json()["data"]["id"]

    r = client.delete(f"/api/v1/comments/{comment_id}", headers=_auth(user1_token))
    assert r.status_code == 200

    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=_auth(user1_token))
    assert r.status_code == 200
    assert len(r.get_json()["data"]["list"]) == 0

    r = client.post(
        "/api/v1/comments",
        headers=_auth(user2_token),
        json={"postId": post_id, "content": "cmt2"},
    )
    assert r.status_code == 201
    comment2_id = r.get_json()["data"]["id"]

    r = client.delete(f"/api/v1/comments/{comment2_id}", headers=_auth(user2_token))
    assert r.status_code == 200
    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=_auth(user1_token))
    assert r.status_code == 200
    assert len(r.get_json()["data"]["list"]) == 0


def test_pin_comment_by_post_author(client, user1_token, user2_token):
    r = client.post("/api/v1/posts", headers=_auth(user1_token), json={"content": "pin test"})
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r1 = client.post(
        "/api/v1/comments",
        headers=_auth(user2_token),
        json={"postId": post_id, "content": "first"},
    )
    assert r1.status_code == 201
    first_id = r1.get_json()["data"]["id"]

    r2 = client.post(
        "/api/v1/comments",
        headers=_auth(user2_token),
        json={"postId": post_id, "content": "second"},
    )
    assert r2.status_code == 201
    second_id = r2.get_json()["data"]["id"]

    r = client.put(
        f"/api/v1/comments/{second_id}/pin",
        headers=_auth(user2_token),
        json={"isPinned": True},
    )
    assert r.status_code == 403

    r = client.put(
        f"/api/v1/comments/{second_id}/pin",
        headers=_auth(user1_token),
        json={"isPinned": True},
    )
    assert r.status_code == 200

    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=_auth(user1_token))
    assert r.status_code == 200
    items = r.get_json()["data"]["list"]
    assert items[0]["id"] == second_id
    assert items[0]["isPinned"] is True
    assert any(x["id"] == first_id and x["isPinned"] is False for x in items)


def test_update_post_visibility_and_pin_limit(client, user1_token):
    post_ids: list[str] = []
    for i in range(4):
        r = client.post(
            "/api/v1/posts",
            headers=_auth(user1_token),
            json={"content": f"pin-{i}"},
        )
        assert r.status_code == 201
        post_ids.append(r.get_json()["data"]["id"])

    r = client.put(
        f"/api/v1/posts/{post_ids[0]}",
        headers=_auth(user1_token),
        json={"content": "edited", "visibility": "private"},
    )
    assert r.status_code == 200
    data = r.get_json()["data"]
    assert data["content"] == "edited"
    assert data["visibility"] == "private"

    assert client.put(
        f"/api/v1/posts/{post_ids[0]}/pin",
        headers=_auth(user1_token),
        json={"isPinned": True},
    ).status_code == 200
    assert client.put(
        f"/api/v1/posts/{post_ids[1]}/pin",
        headers=_auth(user1_token),
        json={"isPinned": True},
    ).status_code == 200
    assert client.put(
        f"/api/v1/posts/{post_ids[2]}/pin",
        headers=_auth(user1_token),
        json={"isPinned": True},
    ).status_code == 200
    r = client.put(
        f"/api/v1/posts/{post_ids[3]}/pin",
        headers=_auth(user1_token),
        json={"isPinned": True},
    )
    assert r.status_code == 400


def test_share_targets_and_short_link(client, user1_token, user2_token):
    me1 = client.get("/api/v1/users/me", headers=_auth(user1_token)).get_json()["data"]
    me2 = client.get("/api/v1/users/me", headers=_auth(user2_token)).get_json()["data"]
    r = client.post(f"/api/v1/users/{me2['id']}/follow", headers=_auth(user1_token))
    assert r.status_code == 200
    r = client.post(f"/api/v1/users/{me1['id']}/follow", headers=_auth(user2_token))
    assert r.status_code == 200

    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={"content": "share target post"},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.get(f"/api/v1/posts/{post_id}/share-targets", headers=_auth(user1_token))
    assert r.status_code == 200
    targets = r.get_json()["data"]["list"]
    assert any(x["id"] == me2["id"] and x["group"] == "mutual" for x in targets)

    r = client.get(f"/api/v1/posts/{post_id}/share-link", headers=_auth(user1_token))
    assert r.status_code == 200
    link_data = r.get_json()["data"]
    assert isinstance(link_data["shortUrl"], str) and link_data["shortUrl"]
    assert "trace=" in link_data["path"]
