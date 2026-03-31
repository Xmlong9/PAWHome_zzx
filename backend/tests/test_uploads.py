import io
from urllib.parse import urlparse


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_upload_and_media_serving(client, user1_token):
    payload = b"\x89PNG\r\n\x1a\nPNGDATA"
    r = client.post(
        "/api/v1/uploads",
        headers=_auth(user1_token),
        data={"file": (io.BytesIO(payload), "a.png", "image/png")},
        content_type="multipart/form-data",
    )
    assert r.status_code == 201
    url = r.get_json()["data"]["url"]
    path = urlparse(url).path

    r2 = client.get(path)
    assert r2.status_code == 200
    assert r2.data == payload


def test_video_post_serialization(client, user1_token):
    r = client.post(
        "/api/v1/posts",
        headers=_auth(user1_token),
        json={
            "content": "video post",
            "videoUrl": "http://example.com/v.mp4",
            "coverUrl": "http://example.com/c.jpg",
        },
    )
    assert r.status_code == 201
    post = r.get_json()["data"]
    assert post["videoUrl"] == "http://example.com/v.mp4"
    assert post["images"] == ["http://example.com/c.jpg"]

    post_id = post["id"]
    r = client.get(f"/api/v1/posts/{post_id}", headers=_auth(user1_token))
    assert r.status_code == 200
    post2 = r.get_json()["data"]
    assert post2["videoUrl"] == "http://example.com/v.mp4"
    assert post2["images"] == ["http://example.com/c.jpg"]

