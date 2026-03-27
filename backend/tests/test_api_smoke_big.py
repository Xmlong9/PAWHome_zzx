from __future__ import annotations

import json


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_api_smoke_big(client, app, user1_token, user2_token):
    from app.extensions import db
    from app.models import Banner, RechargeOption, ShopProduct

    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    r = client.post("/api/v1/auth/sms/send", json={"phone": "13800001000"})
    assert r.status_code == 200

    r = client.post("/api/v1/auth/login/sms", json={"phone": "13800001000", "code": "123456"})
    assert r.status_code == 200
    sms_token = r.get_json()["data"]["token"]
    assert sms_token

    r = client.post("/api/v1/auth/code2session", json={"code": "abc"})
    assert r.status_code == 200
    assert r.get_json()["data"]["token"]

    r = client.post(
        "/api/v1/auth/login/password",
        json={"account": "13800000001", "password": "pass-1"},
    )
    assert r.status_code == 200
    assert r.get_json()["data"]["token"]

    r = client.get("/api/v1/users/me", headers=h1)
    assert r.status_code == 200
    u1 = r.get_json()["data"]
    r = client.get(f"/api/v1/users/{u1['id']}", headers=h2)
    assert r.status_code == 200

    r = client.put("/api/v1/users/me", headers=h1, json={"birthday": "not-a-date"})
    assert r.status_code == 400
    r = client.put("/api/v1/users/me", headers=h1, json={"birthday": "2000-01-01", "nickname": "n"})
    assert r.status_code == 200

    r = client.get("/api/v1/users/me/settings", headers=h1)
    assert r.status_code == 200
    r = client.put("/api/v1/users/me/settings", headers=h1, json={"pushNotice": False, "homeAccess": "所有人可见"})
    assert r.status_code == 200

    r = client.post(
        "/api/v1/users/me/pets",
        headers=h1,
        json={
            "name": "小白",
            "avatarUrl": "",
            "type": "猫",
            "breed": "",
            "gender": "帅哥",
            "weight": "3kg",
            "isSterilized": "否",
            "birthday": "2022.5.20",
        },
    )
    assert r.status_code == 200
    pet_id = r.get_json()["data"]["data"]["id"]

    r = client.get("/api/v1/users/me/pets", headers=h1)
    assert r.status_code == 200
    r = client.get("/api/v1/users/me/pet", headers=h1, query_string={"id": "undefined"})
    assert r.status_code == 200
    r = client.get("/api/v1/users/me/pet", headers=h1, query_string={"id": pet_id})
    assert r.status_code == 200
    r = client.put(f"/api/v1/users/me/pets/{pet_id}", headers=h1, json={"birthday": "bad"})
    assert r.status_code == 400
    r = client.put(f"/api/v1/users/me/pets/{pet_id}", headers=h1, json={"name": "小白2"})
    assert r.status_code == 200

    r = client.post(f"/api/v1/users/{u1['id']}/follow", headers=h2)
    assert r.status_code == 200
    r = client.delete(f"/api/v1/users/{u1['id']}/follow", headers=h2)
    assert r.status_code == 200

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": "猫粮真不错", "images": ["/x.jpg"], "type": "cat", "visibility": "public"},
    )
    assert r.status_code == 201
    post_id = r.get_json()["data"]["id"]

    r = client.get("/api/v1/posts", headers=h2, query_string={"page": 1, "pageSize": 10, "type": "all"})
    assert r.status_code == 200

    r = client.get(f"/api/v1/posts/{post_id}", headers=h2)
    assert r.status_code == 200

    r = client.post(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert r.status_code == 200
    r = client.delete(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert r.status_code == 200
    r = client.post(f"/api/v1/posts/{post_id}/favorite", headers=h2)
    assert r.status_code == 200

    r = client.post(
        "/api/v1/comments",
        headers=h2,
        json={"postId": post_id, "content": "赞", "parentId": None},
    )
    assert r.status_code == 201
    comment_id = r.get_json()["data"]["id"]
    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=h1, query_string={"page": 1, "pageSize": 10})
    assert r.status_code == 200
    r = client.post(f"/api/v1/comments/{comment_id}/like", headers=h1)
    assert r.status_code == 200
    r = client.delete(f"/api/v1/comments/{comment_id}/like", headers=h1)
    assert r.status_code == 200

    r = client.get("/api/v1/notifications", headers=h1, query_string={"type": "like", "page": 1, "pageSize": 20})
    assert r.status_code == 200
    r = client.get("/api/v1/notifications", headers=h1, query_string={"type": "comment", "page": 1, "pageSize": 20})
    assert r.status_code == 200
    r = client.get("/api/v1/notifications", headers=h1, query_string={"type": "favorite", "page": 1, "pageSize": 20})
    assert r.status_code == 200

    r = client.get("/api/v1/users/me/history/posts", headers=h2, query_string={"page": 1, "pageSize": 10})
    assert r.status_code == 200
    r = client.get(f"/api/v1/users/{u1['id']}/likes/posts", headers=h2, query_string={"page": 1, "pageSize": 10})
    assert r.status_code == 200
    r = client.get(f"/api/v1/users/{u1['id']}/favorites/posts", headers=h2, query_string={"page": 1, "pageSize": 10})
    assert r.status_code == 200

    with app.app_context():
        if ShopProduct.query.get("p_smoke") is None:
            db.session.add(
                ShopProduct(
                    id="p_smoke",
                    title="冻干猫粮",
                    description="d",
                    price_cents=1990,
                    images_json=json.dumps(["/p.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
        if RechargeOption.query.get("r_smoke") is None:
            db.session.add(RechargeOption(id="r_smoke", amount_cents=1000, bonus_cents=200, label="¥10+2", sort=0))
        if Banner.query.count() == 0:
            db.session.add(Banner(slot="home", title="t", image_url="/b.jpg", link_url="/", sort=0))
        db.session.commit()

    r = client.get("/api/v1/shop/products", headers=h1)
    assert r.status_code == 200
    r = client.get("/api/v1/shop/products/p_smoke", headers=h1)
    assert r.status_code == 200
    r = client.post("/api/v1/shop/favorites/p_smoke", headers=h1)
    assert r.status_code == 200
    r = client.get("/api/v1/shop/favorites", headers=h1)
    assert r.status_code == 200

    r = client.post("/api/v1/shop/cart", headers=h1, json={"productId": "p_smoke", "count": 2})
    assert r.status_code == 200
    r = client.patch("/api/v1/shop/cart/p_smoke", headers=h1, json={"count": 1, "checked": True})
    assert r.status_code == 200
    r = client.post("/api/v1/shop/cart/check-all", headers=h1, json={"checked": True})
    assert r.status_code == 200
    r = client.delete("/api/v1/shop/cart/invalid", headers=h1)
    assert r.status_code == 200

    r = client.post("/api/v1/shop/order/preview", headers=h1, json={"from": "cart"})
    assert r.status_code == 200
    r = client.post(
        "/api/v1/shop/order",
        headers=h1,
        json={"from": "cart", "address": "x", "payType": "wx"},
    )
    assert r.status_code == 200
    order_id = r.get_json()["data"]["id"]

    r = client.post(f"/api/v1/shop/orders/{order_id}/pay", headers=h1)
    assert r.status_code == 200
    r = client.post(f"/api/v1/shop/orders/{order_id}/confirm-receipt", headers=h1)
    assert r.status_code == 200
    r = client.get("/api/v1/shop/orders", headers=h1, query_string={"status": "all"})
    assert r.status_code == 200
    r = client.delete(f"/api/v1/shop/orders/{order_id}", headers=h1)
    assert r.status_code == 200

    r = client.get("/api/v1/shop/recharge/options", headers=h1)
    assert r.status_code == 200
    r = client.post("/api/v1/shop/recharge", headers=h1, json={"amount": 5})
    assert r.status_code == 200
    r = client.post("/api/v1/shop/recharge", headers=h1, json={"optionId": "r_smoke"})
    assert r.status_code == 200

    r = client.get("/api/v1/shop/customer-service/faqs")
    assert r.status_code == 200

    r = client.get("/api/v1/user/addresses", headers=h1)
    assert r.status_code == 200
    r = client.get("/api/v1/user/address/default", headers=h1)
    assert r.status_code in (200, 404)

    r = client.get("/api/v1/search/posts", headers=h1, query_string={"q": "猫粮", "page": 1, "pageSize": 10})
    assert r.status_code == 200
    r = client.get("/api/v1/search/products", headers=h1, query_string={"q": "冻干", "page": 1, "pageSize": 10})
    assert r.status_code == 200
    r = client.get("/api/v1/search/users", headers=h1, query_string={"q": "用户", "page": 1, "pageSize": 10})
    assert r.status_code == 200

    r = client.get("/api/v1/banners", query_string={"slot": "home"})
    assert r.status_code == 200
    r = client.get("/api/v1/feeds/community", query_string={"page": 1, "pageSize": 5})
    assert r.status_code == 200

    r = client.get("/api/v1/users/me", headers=h2)
    assert r.status_code == 200
    u2 = r.get_json()["data"]

    r = client.post("/api/v1/im/conversations", headers=h1, json={"peerId": u2["id"]})
    assert r.status_code == 200
    conv_id = r.get_json()["data"]["id"]

    r = client.get("/api/v1/im/messages", headers=h1)
    assert r.status_code == 400
    r = client.post("/api/v1/im/messages", headers=h1, json={"conversationId": conv_id, "text": ""})
    assert r.status_code == 400

    r = client.get("/api/v1/im/conversations", headers=h1)
    assert r.status_code == 200

    r = client.post("/api/v1/im/messages", headers=h1, json={"conversationId": conv_id, "text": "hi"})
    assert r.status_code == 201
    r = client.get("/api/v1/im/messages", headers=h1, query_string={"conversationId": conv_id})
    assert r.status_code == 200
    r = client.post(f"/api/v1/im/conversations/{conv_id}/read", headers=h1)
    assert r.status_code == 200

    r = client.post(
        "/api/v1/services/appointments",
        headers=h1,
        json={"serviceType": "体检", "appointmentAt": "2026-01-01T10:00:00+08:00", "petId": pet_id},
    )
    assert r.status_code == 201
