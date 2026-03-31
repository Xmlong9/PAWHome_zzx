import json


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_shop_order_flow_balance(client, app, user1_token):
    from app.extensions import db
    from app.models import RechargeOption, ShopProduct, Wallet

    with app.app_context():
        if ShopProduct.query.get("p-test") is None:
            db.session.add(
                ShopProduct(
                    id="p-test",
                    title="猫粮",
                    description="d",
                    price_cents=1990,
                    images_json=json.dumps(["/p.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
        if RechargeOption.query.count() == 0:
            db.session.add(RechargeOption(id="r1", amount_cents=1000, bonus_cents=0, label="¥10", sort=0))
        db.session.commit()

    r = client.get("/api/v1/shop/products", headers=_auth(user1_token))
    assert r.status_code == 200
    products = r.get_json()["data"]["list"]
    assert any(p["id"] == "p-test" for p in products)

    r = client.post(
        "/api/v1/shop/recharge",
        headers=_auth(user1_token),
        json={"amount": 50},
    )
    assert r.status_code == 200

    r = client.post(
        "/api/v1/shop/cart",
        headers=_auth(user1_token),
        json={"productId": "p-test", "count": 2},
    )
    assert r.status_code == 200

    r = client.post(
        "/api/v1/shop/order/preview",
        headers=_auth(user1_token),
        json={"from": "cart"},
    )
    assert r.status_code == 200
    prev = r.get_json()["data"]
    assert prev["payableAmount"] > 0

    r = client.post(
        "/api/v1/shop/order",
        headers=_auth(user1_token),
        json={"from": "cart", "address": "x", "payType": "balance"},
    )
    assert r.status_code == 200
    order = r.get_json()["data"]
    assert order["id"]

    r = client.get("/api/v1/shop/orders", headers=_auth(user1_token), query_string={"status": "all"})
    assert r.status_code == 200
    orders = r.get_json()["data"]["list"]
    assert any(o["id"] == order["id"] for o in orders)


def test_balance_insufficient(client, app, user2_token):
    from app.extensions import db
    from app.models import ShopProduct

    with app.app_context():
        if ShopProduct.query.get("p-exp") is None:
            db.session.add(
                ShopProduct(
                    id="p-exp",
                    title="贵的",
                    description="d",
                    price_cents=999000,
                    images_json=json.dumps(["/p.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
            db.session.commit()

    r = client.post(
        "/api/v1/shop/order",
        headers=_auth(user2_token),
        json={"from": "detail", "productId": "p-exp", "count": 1, "address": "x", "payType": "balance"},
    )
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "INSUFFICIENT_BALANCE"
