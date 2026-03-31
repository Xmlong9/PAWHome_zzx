import json
import sys
import os
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json as _json

def main() -> None:
    db_path = Path(tempfile.gettempdir()) / "pawhome_smoke_api.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    from app import create_app
    from app.extensions import db
    from app.models import ShopProduct

    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        if ShopProduct.query.count() == 0:
            db.session.add(
                ShopProduct(
                    id="p1",
                    title="冻干鸡肉猫粮",
                    description="seed",
                    price_cents=6990,
                    images_json=_json.dumps(["/assets/images/shop/商品1.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
            db.session.commit()

    client = app.test_client()

    r = client.post("/api/v1/auth/sms/send", json={"phone": "13800000000"})
    assert r.status_code == 200

    r = client.post("/api/v1/auth/login/sms", json={"phone": "13800000000", "code": "123456"})
    assert r.status_code == 200
    token = r.get_json()["data"]["token"]

    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    r = client.post(
        "/api/v1/posts",
        headers={"Authorization": f"Bearer {token}"},
        json={"content": "hello", "images": ["https://example.com/a.jpg"]},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.get(f"/api/v1/posts/{post_id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    r = client.post(f"/api/v1/posts/{post_id}/like", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    r = client.post(
        "/api/v1/comments",
        headers={"Authorization": f"Bearer {token}"},
        json={"postId": post_id, "content": "nice"},
    )
    assert r.status_code == 201
    comment_id = r.get_json()["data"]["id"]

    r = client.post(
        f"/api/v1/comments/{comment_id}/like", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200

    r = client.get("/api/v1/shop/products", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    print(json.dumps({"ok": True, "post_id": post_id, "comment_id": comment_id}))


if __name__ == "__main__":
    main()
