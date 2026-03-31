from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_im_unread_count_and_mark_read(client, user1_token, user2_token):
    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    r = client.get("/api/v1/users/me", headers=h1)
    assert r.status_code == 200
    u1 = r.get_json()["data"]

    r = client.get("/api/v1/users/me", headers=h2)
    assert r.status_code == 200
    u2 = r.get_json()["data"]

    r = client.post("/api/v1/im/conversations", headers=h1, json={"peerId": u2["id"]})
    assert r.status_code == 200
    conv_id = r.get_json()["data"]["id"]
    assert conv_id

    r = client.post(
        "/api/v1/im/messages",
        headers=h2,
        json={"conversationId": conv_id, "text": "hi"},
    )
    assert r.status_code == 201

    r = client.get("/api/v1/im/conversations", headers=h1)
    assert r.status_code == 200
    convs = r.get_json()["data"]["list"]
    conv = next((c for c in convs if c["id"] == conv_id), None)
    assert conv is not None
    assert conv["unreadCount"] == 1

    r = client.post(f"/api/v1/im/conversations/{conv_id}/read", headers=h1)
    assert r.status_code == 200

    r = client.get("/api/v1/im/conversations", headers=h1)
    assert r.status_code == 200
    convs = r.get_json()["data"]["list"]
    conv = next((c for c in convs if c["id"] == conv_id), None)
    assert conv is not None
    assert conv["unreadCount"] == 0

    r = client.post(
        "/api/v1/im/messages",
        headers=h1,
        json={"conversationId": conv_id, "text": "yo"},
    )
    assert r.status_code == 201

    r = client.get("/api/v1/im/conversations", headers=h1)
    assert r.status_code == 200
    conv = next((c for c in r.get_json()["data"]["list"] if c["id"] == conv_id), None)
    assert conv is not None
    assert conv["unreadCount"] == 0

    r = client.get("/api/v1/im/conversations", headers=h2)
    assert r.status_code == 200
    conv = next((c for c in r.get_json()["data"]["list"] if c["id"] == conv_id), None)
    assert conv is not None
    assert conv["unreadCount"] == 1

