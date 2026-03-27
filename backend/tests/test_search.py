import json


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_search_posts_and_products(client, app, user1_token):
    from app.extensions import db
    from app.models import Post, ShopProduct, User

    with app.app_context():
        me_id = client.get("/api/v1/users/me", headers=_auth(user1_token)).get_json()["data"]["id"]
        if Post.query.count() == 0:
            db.session.add(Post(author_id=me_id, content="猫咪训练指南"))
        if ShopProduct.query.get("p-s") is None:
            db.session.add(
                ShopProduct(
                    id="p-s",
                    title="猫砂",
                    description="d",
                    price_cents=2990,
                    images_json=json.dumps(["/p.jpg"]),
                    stock=999,
                    is_active=True,
                )
            )
        db.session.commit()

    r = client.get("/api/v1/search/posts", headers=_auth(user1_token), query_string={"q": "猫咪"})
    assert r.status_code == 200
    assert r.get_json()["data"]["total"] >= 1

    r = client.get("/api/v1/search/products", headers=_auth(user1_token), query_string={"q": "猫"})
    assert r.status_code == 200
    assert r.get_json()["data"]["total"] >= 1
