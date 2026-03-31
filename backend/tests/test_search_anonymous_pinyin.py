import pytest


def _seed_data(app):
    from app.extensions import db
    from app.models import Post, ShopProduct, User

    with app.app_context():
        u1 = User(phone="13900000001", password_hash="x", nickname="u1")
        db.session.add(u1)
        db.session.flush()

        public_post = Post(
            author_id=u1.id,
            content="我家用的是豆腐猫砂，挺好用",
            visibility="public",
            post_type="cat",
        )
        private_post = Post(
            author_id=u1.id,
            content="私密：豆腐猫砂测评",
            visibility="private",
            post_type="cat",
        )
        db.session.add_all([public_post, private_post])

        p1 = ShopProduct(
            title="豆腐猫砂",
            description="低尘好用",
            price_cents=1999,
            is_active=True,
        )
        db.session.add(p1)
        db.session.commit()


def test_anonymous_can_search_posts_but_only_public(client, app):
    _seed_data(app)

    r = client.get("/api/v1/search/posts", query_string={"q": "猫砂", "page": 1, "pageSize": 20})
    assert r.status_code == 200
    data = r.get_json()["data"]
    assert data["total"] == 1
    assert any("豆腐猫砂" in item["summary"] for item in data["list"])


@pytest.mark.parametrize("q", ["ms", "maosha"])
def test_anonymous_product_search_supports_pinyin(client, app, q):
    _seed_data(app)

    r = client.get("/api/v1/search/products", query_string={"q": q, "page": 1, "pageSize": 20})
    assert r.status_code == 200
    data = r.get_json()["data"]
    assert data["total"] == 1
    assert data["list"][0]["title"] == "豆腐猫砂"

