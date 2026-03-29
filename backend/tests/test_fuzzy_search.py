from __future__ import annotations

import json


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_fuzzy_search_posts_supports_spaces_and_homophone(client, user1_token, user2_token):
    h1 = _auth(user1_token)
    h2 = _auth(user2_token)

    r = client.post(
        "/api/v1/posts",
        headers=h1,
        json={"content": "我家一直用豆腐猫砂", "images": [], "type": "cat", "visibility": "public"},
    )
    assert r.status_code == 201
    pid = r.get_json()["data"]["id"]

    r = client.get("/api/v1/search/posts", headers=h2, query_string={"q": "猫 砂", "page": 1, "pageSize": 10})
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert pid in ids

    r = client.get("/api/v1/search/posts", headers=h2, query_string={"q": "猫莎", "page": 1, "pageSize": 10})
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert pid in ids


def test_fuzzy_search_products_supports_pet_lexicon(client, app, user1_token, user2_token):
    from app.extensions import db
    from app.models import ShopProduct

    h2 = _auth(user2_token)

    with app.app_context():
        p = ShopProduct(
            id="p_cat_sand_1",
            title="豆腐猫砂 低尘结团",
            description="猫咪用品必备，除臭低尘",
            price_cents=1990,
            images_json=json.dumps(["/p.jpg"]),
            stock=999,
            is_active=True,
        )
        t = ShopProduct(
            id="p_cat_toy_1",
            title="逗猫棒 羽毛款",
            description="",
            price_cents=990,
            images_json=json.dumps(["/t.jpg"]),
            stock=999,
            is_active=True,
        )
        db.session.add(p)
        db.session.add(t)
        db.session.commit()

    r = client.get(
        "/api/v1/search/products",
        headers=h2,
        query_string={"q": "猫莎", "page": 1, "pageSize": 10},
    )
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert "p_cat_sand_1" in ids

    r = client.get(
        "/api/v1/search/products",
        headers=h2,
        query_string={"q": "猫咪用品", "page": 1, "pageSize": 10},
    )
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert "p_cat_sand_1" in ids

    r = client.get(
        "/api/v1/search/products",
        headers=h2,
        query_string={"q": "宠物用品", "page": 1, "pageSize": 10},
    )
    assert r.status_code == 200
    ids = [x["id"] for x in r.get_json()["data"]["list"]]
    assert "p_cat_toy_1" in ids
