from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_error_handlers_cover(app, client):
    def boom():
        raise RuntimeError("boom")

    app.add_url_rule("/boom", "boom", boom)

    r = client.get("/no-such-route")
    assert r.status_code == 404
    body = r.get_json()
    assert body["ok"] is False
    assert body["error"]["code"].startswith("HTTP_")

    r = client.get("/boom")
    assert r.status_code == 500
    body = r.get_json()
    assert body["ok"] is False
    assert body["error"]["code"] == "INTERNAL_ERROR"


def test_posts_and_comments_error_branches(client, user1_token, user2_token):
    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    r = client.post("/api/v1/posts", headers=h1, json={"content": ""})
    assert r.status_code == 400

    r = client.get("/api/v1/posts/not-found", headers=h1)
    assert r.status_code == 404

    r = client.post("/api/v1/posts/not-found/like", headers=h1)
    assert r.status_code == 404

    r = client.post("/api/v1/posts", headers=h1, json={"content": "c", "images": [], "type": "cat"})
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.get("/api/v1/posts", headers=h1, query_string={"page": 1, "pageSize": 10, "type": "cat"})
    assert r.status_code == 200

    r = client.post(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert r.status_code == 200
    r = client.post(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert r.status_code == 200
    r = client.delete(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert r.status_code == 200
    r = client.delete(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert r.status_code == 200

    r = client.post(f"/api/v1/posts/{post_id}/favorite", headers=h2)
    assert r.status_code == 200
    r = client.post(f"/api/v1/posts/{post_id}/favorite", headers=h2)
    assert r.status_code == 200
    r = client.delete(f"/api/v1/posts/{post_id}/favorite", headers=h2)
    assert r.status_code == 200
    r = client.delete(f"/api/v1/posts/{post_id}/favorite", headers=h2)
    assert r.status_code == 200

    r = client.post("/api/v1/comments", headers=h2, json={"postId": post_id, "content": ""})
    assert r.status_code == 400
    r = client.post("/api/v1/comments", headers=h2, json={"postId": post_id, "content": "hi", "parentId": 1})
    assert r.status_code == 400


def test_users_password_phone_branches(client, app, user1_token, user2_token):
    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    r = client.put("/api/v1/users/me/password", headers=h1, json={"oldPassword": "bad", "newPassword": "new"})
    assert r.status_code == 400

    r = client.put("/api/v1/users/me/password", headers=h1, json={"oldPassword": "pass-1", "newPassword": "new"})
    assert r.status_code == 200

    r = client.post("/api/v1/auth/login/password", json={"account": "13800000001", "password": "new"})
    assert r.status_code == 200

    phone = "13800002222"
    r = client.post("/api/v1/auth/sms/send", json={"phone": phone})
    assert r.status_code == 200
    r = client.put("/api/v1/users/me/phone", headers=h1, json={"phone": phone, "code": "123456"})
    assert r.status_code == 200

    r = client.post("/api/v1/auth/sms/send", json={"phone": phone})
    assert r.status_code == 200
    r = client.put("/api/v1/users/me/phone", headers=h2, json={"phone": phone, "code": "123456"})
    assert r.status_code == 409


def test_services_and_shop_negative_paths(client, app, user1_token):
    from app.extensions import db
    from app.models import RechargeOption, ShopProduct

    h = _auth(user1_token)

    r = client.post("/api/v1/services/appointments", headers=h, json={"serviceType": "x", "appointmentAt": "bad"})
    assert r.status_code == 400
    r = client.get("/api/v1/services/appointments/not-found", headers=h)
    assert r.status_code == 404

    with app.app_context():
        if ShopProduct.query.get("p_neg") is None:
            db.session.add(
                ShopProduct(
                    id="p_neg",
                    title="t",
                    description="d",
                    price_cents=100,
                    images_json="not-json",
                    stock=1,
                    is_active=True,
                )
            )
        if RechargeOption.query.get("r_neg") is None:
            db.session.add(RechargeOption(id="r_neg", amount_cents=100, bonus_cents=0, label="", sort=0))
        db.session.commit()

    r = client.get("/api/v1/shop/products/nope", headers=h)
    assert r.status_code == 404

    r = client.post("/api/v1/shop/cart", headers=h, json={"count": 1})
    assert r.status_code == 400
    r = client.post("/api/v1/shop/cart", headers=h, json={"productId": "nope", "count": 1})
    assert r.status_code == 404
    r = client.patch("/api/v1/shop/cart/nope", headers=h, json={"count": 1})
    assert r.status_code == 404

    r = client.post("/api/v1/shop/order/preview", headers=h, json={"from": "bad"})
    assert r.status_code == 400
    r = client.post("/api/v1/shop/order/preview", headers=h, json={"from": "detail"})
    assert r.status_code == 400
    r = client.post("/api/v1/shop/order", headers=h, json={"from": "detail", "productId": "p_neg", "address": "x", "payType": "bad"})
    assert r.status_code == 400

    r = client.post("/api/v1/shop/recharge", headers=h, json={"amount": 0})
    assert r.status_code == 400
    r = client.post("/api/v1/shop/recharge", headers=h, json={"optionId": "nope"})
    assert r.status_code == 404

    r = client.delete("/api/v1/shop/orders/nope", headers=h)
    assert r.status_code == 404
    r = client.post("/api/v1/shop/orders/nope/pay", headers=h)
    assert r.status_code == 404
    r = client.post("/api/v1/shop/orders/nope/confirm-receipt", headers=h)
    assert r.status_code == 404

