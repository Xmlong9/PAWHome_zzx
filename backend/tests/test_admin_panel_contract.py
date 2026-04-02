from __future__ import annotations

import json
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import (
    AdminRole,
    AdminUser,
    Comment,
    Pet,
    Post,
    ServiceAppointment,
    ServiceOffering,
    ServiceProvider,
    ShopOrder,
    ShopOrderItem,
    ShopProduct,
)


def _register_user_and_get_id(client, phone: str, password: str, nickname: str) -> str:
    r = client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "password": password, "nickname": nickname},
    )
    assert r.status_code == 200
    token = r.get_json()["data"]["token"]
    me = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    return me.get_json()["data"]["id"]


def _ensure_admin(app):
    with app.app_context():
        role = AdminRole(id="super_admin", name="超级管理员", description="all")
        db.session.add(role)
        db.session.add(
            AdminUser(
                username="admin",
                password_hash=generate_password_hash("admin123"),
                name="管理员",
                role_id=role.id,
                status="active",
            )
        )
        db.session.commit()


def _admin_login(client) -> str:
    r = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    token = body["data"]["token"]
    assert isinstance(token, str) and token
    return token


def _seed_admin_panel_domain_data(app, user_id: str):
    with app.app_context():
        p = Post(author_id=user_id, content="今天带狗狗去公园玩，太开心了！", media_json=json.dumps({"images": []}))
        p.like_count = 3
        p.comment_count = 1
        db.session.add(p)
        db.session.flush()

        c = Comment(post_id=p.id, author_id=user_id, content="好可爱！")
        c.like_count = 2
        db.session.add(c)

        prod = ShopProduct(
            title="宠物零食礼包",
            description="测试商品",
            price_cents=1999,
            images_json=json.dumps(["/media/prod_01.jpg"]),
            stock=15,
            is_active=True,
        )
        db.session.add(prod)
        db.session.flush()

        o = ShopOrder(
            user_id=user_id,
            status="pending_ship",
            pay_method="wechat",
            subtotal_cents=1999,
            shipping_cents=0,
            discount_cents=0,
            total_cents=1999,
            receiver_name="张三",
            receiver_phone="13800000001",
            receiver_address="上海市徐汇区",
        )
        db.session.add(o)
        db.session.flush()

        db.session.add(
            ShopOrderItem(
                order_id=o.id,
                product_id=prod.id,
                title_snapshot=prod.title,
                price_cents=prod.price_cents,
                quantity=2,
                variant_json=json.dumps({"size": "M"}),
            )
        )

        provider = ServiceProvider(service_type="grooming", name="爱宠家美容中心", status="active")
        db.session.add(provider)
        db.session.flush()

        offering = ServiceOffering(
            provider_id=provider.id,
            service_type="grooming",
            name="洗护套餐",
            price=12900,
            duration_minutes=60,
            status="active",
        )
        db.session.add(offering)
        db.session.flush()

        pet = Pet(user_id=user_id, name="豆豆", pet_type="dog", breed="金毛", avatar_url="/media/pet.png")
        db.session.add(pet)
        db.session.flush()

        appt = ServiceAppointment(
            user_id=user_id,
            pet_id=pet.id,
            provider_id=provider.id,
            offering_id=offering.id,
            service_type="grooming",
            appointment_at=datetime.utcnow() + timedelta(days=1),
            status="scheduled",
            contact_phone="13800000001",
        )
        db.session.add(appt)

        db.session.commit()


def test_admin_panel_contract_endpoints(client, app):
    _ensure_admin(app)
    user_id = _register_user_and_get_id(client, "13800001001", "pw-1", "用户A")
    _seed_admin_panel_domain_data(app, user_id)

    token = _admin_login(client)
    h = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/v1/admin/dashboard/overview", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert set(body["data"].keys()) == {"userCount", "postCount", "orderCount", "revenue"}

    r = client.get("/api/v1/admin/users?page=1&pageSize=10", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert isinstance(body["data"]["items"], list)
    assert body["data"]["total"] >= 1
    u = body["data"]["items"][0]
    assert {"id", "nickname", "phoneMasked", "gender", "avatarUrl", "status", "registeredAt"} <= set(u.keys())

    r = client.get("/api/v1/admin/content/posts?page=1&pageSize=10", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert isinstance(body["data"]["items"], list)
    assert body["data"]["total"] >= 1
    item = body["data"]["items"][0]
    assert {"id", "author", "contentPreview", "mediaStats", "engagement", "publishedAt"} <= set(item.keys())

    r = client.get("/api/v1/admin/content/comments?page=1&pageSize=10", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert isinstance(body["data"]["items"], list)
    assert body["data"]["total"] >= 1
    c = body["data"]["items"][0]
    assert {"id", "user", "post", "content", "likeCount", "status", "createdAt"} <= set(c.keys())

    r = client.get("/api/v1/admin/shop/products?page=1&pageSize=10", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert isinstance(body["data"]["items"], list)
    assert body["data"]["total"] >= 1
    prod = body["data"]["items"][0]
    assert {"id", "productNo", "name", "price", "stockQty", "status", "imageUrl", "createdAt"} <= set(prod.keys())

    r = client.get("/api/v1/admin/shop/orders?page=1&pageSize=10", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert isinstance(body["data"]["items"], list)
    assert body["data"]["total"] >= 1
    order = body["data"]["items"][0]
    assert {"id", "orderNo", "createdAt", "buyer", "pay", "status", "items"} <= set(order.keys())

    r = client.get("/api/v1/admin/services/appointments?page=1&pageSize=10", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert isinstance(body["data"]["items"], list)
    assert body["data"]["total"] >= 1
    appt = body["data"]["items"][0]
    assert {"id", "bookingNo", "createdAt", "status", "pet", "service", "owner", "schedule"} <= set(appt.keys())

    r = client.get("/api/v1/admin/system/admins?page=1&pageSize=1", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert body["data"]["size"] == 1
    assert body["data"]["total"] >= 1
    a = body["data"]["items"][0]
    assert {"id", "username", "name", "phone", "role", "status", "lastLoginAt"} <= set(a.keys())

    r = client.get("/api/v1/admin/system/logs?page=1&pageSize=10", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert isinstance(body["data"]["items"], list)
    assert body["data"]["total"] >= 1
    log = body["data"]["items"][0]
    assert {"id", "serialNo", "module", "action", "ip", "createdAt", "operator"} <= set(log.keys())
