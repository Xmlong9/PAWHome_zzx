from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_post_visibility_private_and_followers(client, user1_token, user2_token):
    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    r = client.get("/api/v1/users/me", headers=h1)
    assert r.status_code == 200
    u1 = r.get_json()["data"]

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": "private post", "images": [], "type": "all", "visibility": "private"},
    )
    assert r.status_code == 201
    private_id = r.get_json()["data"]["id"]

    r = client.get("/api/v1/posts", headers=h2, query_string={"page": 1, "pageSize": 20, "type": "all"})
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert private_id not in ids

    r = client.get(f"/api/v1/users/{u1['id']}/posts", headers=h2, query_string={"page": 1, "pageSize": 20})
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert private_id not in ids

    r = client.get(f"/api/v1/posts/{private_id}", headers=h2)
    assert r.status_code == 403

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": "followers post", "images": [], "type": "all", "visibility": "followers"},
    )
    assert r.status_code == 201
    followers_id = r.get_json()["data"]["id"]

    r = client.get("/api/v1/posts", headers=h2, query_string={"page": 1, "pageSize": 50, "type": "all"})
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert followers_id not in ids

    r = client.get(f"/api/v1/posts/{followers_id}", headers=h2)
    assert r.status_code == 403

    r = client.post(f"/api/v1/users/{u1['id']}/follow", headers=h2)
    assert r.status_code == 200

    r = client.get("/api/v1/posts", headers=h2, query_string={"page": 1, "pageSize": 50, "type": "all"})
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert followers_id in ids

    r = client.get(f"/api/v1/posts/{followers_id}", headers=h2)
    assert r.status_code == 200

