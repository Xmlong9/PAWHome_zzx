from __future__ import annotations

import json
from datetime import datetime

from flask import g, request

from ...auth import require_auth
from ...extensions import db
from ...models import (
    Address,
    CartItem,
    CustomerServiceFaq,
    RechargeOption,
    ShopFavorite,
    ShopOrder,
    ShopOrderItem,
    ShopProduct,
    User,
    Wallet,
)
from ...responses import fail, ok


def _money(cents: int) -> float:
    return round(cents / 100, 2)


def _cents(amount) -> int:
    if isinstance(amount, (int, float)):
        return int(round(float(amount) * 100))
    return 0


def _product_to_dict(p: ShopProduct, favorite: bool) -> dict:
    image_url = "/assets/images/shop/问号猫.png"
    if p.images_json:
        try:
            v = json.loads(p.images_json)
            if isinstance(v, list) and v:
                first = v[0]
                if isinstance(first, str) and first:
                    image_url = first
        except json.JSONDecodeError:
            image_url = "/assets/images/shop/问号猫.png"
    return {
        "id": p.id,
        "name": p.title,
        "desc": p.description or "",
        "price": _money(p.price_cents),
        "marketPrice": _money(int(p.price_cents * 1.3)),
        "imageUrl": image_url,
        "soldCount": 0,
        "tags": [],
        "rating": 4.8,
        "favorite": favorite,
        "specs": [],
    }


def _address_to_dict(a: Address) -> dict:
    return {
        "id": a.id,
        "name": a.receiver_name,
        "phone": a.phone,
        "province": a.province or "",
        "city": a.city or "",
        "district": a.district or "",
        "detail": a.address_line,
        "isDefault": bool(a.is_default),
    }


def register_routes(bp) -> None:
    @bp.get("/shop/products")
    @require_auth
    def list_products():
        me: User = g.current_user
        products = ShopProduct.query.filter_by(is_active=True).order_by(ShopProduct.created_at.desc()).all()
        fav_ids = {
            f.product_id
            for f in ShopFavorite.query.filter_by(user_id=me.id).all()
        }
        return ok({"list": [_product_to_dict(p, p.id in fav_ids) for p in products]})

    @bp.get("/shop/products/<product_id>")
    @require_auth
    def get_product(product_id: str):
        me: User = g.current_user
        p = ShopProduct.query.get(product_id)
        if p is None or not p.is_active:
            return fail(code="NOT_FOUND", message="product not found", status_code=404)
        fav = ShopFavorite.query.filter_by(user_id=me.id, product_id=product_id).first() is not None
        return ok(_product_to_dict(p, fav))

    @bp.get("/shop/favorites")
    @require_auth
    def list_favorites():
        me: User = g.current_user
        favs = ShopFavorite.query.filter_by(user_id=me.id).all()
        products = [ShopProduct.query.get(f.product_id) for f in favs]
        products = [p for p in products if p is not None and p.is_active]
        return ok({"list": [_product_to_dict(p, True) for p in products]})

    @bp.post("/shop/favorites/<product_id>")
    @require_auth
    def toggle_favorite(product_id: str):
        me: User = g.current_user
        p = ShopProduct.query.get(product_id)
        if p is None or not p.is_active:
            return fail(code="NOT_FOUND", message="product not found", status_code=404)
        row = ShopFavorite.query.filter_by(user_id=me.id, product_id=product_id).first()
        if row is None:
            db.session.add(ShopFavorite(user_id=me.id, product_id=product_id))
            db.session.commit()
            return ok({"favorite": True})
        db.session.delete(row)
        db.session.commit()
        return ok({"favorite": False})

    @bp.get("/shop/cart")
    @require_auth
    def list_cart():
        me: User = g.current_user
        items = CartItem.query.filter_by(user_id=me.id).all()
        result = []
        for it in items:
            p = ShopProduct.query.get(it.product_id)
            product = _product_to_dict(p, False) if p is not None else None
            result.append(
                {
                    "product": product,
                    "count": it.quantity,
                    "checked": bool(it.checked),
                    "invalid": bool(not it.is_valid),
                }
            )
        return ok({"list": result})

    @bp.post("/shop/cart")
    @require_auth
    def add_cart():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        product_id = data.get("productId")
        count = data.get("count")
        if not isinstance(product_id, str) or not product_id:
            return fail(code="BAD_REQUEST", message="productId required", status_code=400)
        qty = 1
        if isinstance(count, int):
            qty = max(1, count)
        p = ShopProduct.query.get(product_id)
        if p is None or not p.is_active:
            return fail(code="NOT_FOUND", message="product not found", status_code=404)
        row = CartItem.query.filter_by(user_id=me.id, product_id=product_id).first()
        if row is None:
            row = CartItem(user_id=me.id, product_id=product_id, quantity=qty, checked=True, is_valid=True)
            db.session.add(row)
        else:
            row.quantity = max(1, row.quantity + qty)
            row.is_valid = True
        db.session.commit()
        return ok({"ok": True})

    @bp.patch("/shop/cart/<product_id>")
    @require_auth
    def patch_cart(product_id: str):
        me: User = g.current_user
        row = CartItem.query.filter_by(user_id=me.id, product_id=product_id).first()
        if row is None:
            return fail(code="NOT_FOUND", message="cart item not found", status_code=404)
        data = request.get_json(silent=True) or {}
        if "count" in data and isinstance(data.get("count"), int):
            row.quantity = max(1, data.get("count"))
        if "checked" in data:
            row.checked = bool(data.get("checked"))
        db.session.commit()
        return ok({"ok": True})

    @bp.post("/shop/cart/check-all")
    @require_auth
    def check_all_cart():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        checked = bool(data.get("checked"))
        CartItem.query.filter_by(user_id=me.id).update({"checked": checked})
        db.session.commit()
        return ok({"ok": True})

    @bp.delete("/shop/cart/invalid")
    @require_auth
    def clear_invalid_cart():
        me: User = g.current_user
        CartItem.query.filter_by(user_id=me.id, is_valid=False).delete()
        db.session.commit()
        return ok({"ok": True})

    @bp.post("/shop/order/preview")
    @require_auth
    def preview_order():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        from_type = data.get("from")
        if from_type not in {"cart", "detail"}:
            return fail(code="BAD_REQUEST", message="from required", status_code=400)

        items: list[dict] = []
        if from_type == "detail":
            product_id = data.get("productId")
            count = data.get("count")
            if not isinstance(product_id, str) or not product_id:
                return fail(code="BAD_REQUEST", message="productId required", status_code=400)
            qty = max(1, int(count)) if isinstance(count, int) else 1
            p = ShopProduct.query.get(product_id)
            if p is None or not p.is_active:
                return fail(code="NOT_FOUND", message="product not found", status_code=404)
            items = [{"product": _product_to_dict(p, False), "count": qty}]
        else:
            cart = CartItem.query.filter_by(user_id=me.id, checked=True, is_valid=True).all()
            for it in cart:
                p = ShopProduct.query.get(it.product_id)
                if p is None or not p.is_active:
                    continue
                items.append({"product": _product_to_dict(p, False), "count": it.quantity})

        goods_amount = round(sum(i["product"]["price"] * i["count"] for i in items), 2)
        freight = 0 if goods_amount >= 99 or goods_amount == 0 else 8
        discount = 20 if goods_amount >= 200 else 0
        payable = round(goods_amount + freight - discount, 2)
        return ok(
            {
                "items": items,
                "goodsAmount": goods_amount,
                "freight": freight,
                "discount": discount,
                "payableAmount": payable,
            }
        )

    @bp.post("/shop/order")
    @require_auth
    def submit_order():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        from_type = data.get("from")
        address_text = data.get("address")
        pay_type = data.get("payType")
        if from_type not in {"cart", "detail"}:
            return fail(code="BAD_REQUEST", message="from required", status_code=400)
        if not isinstance(address_text, str) or not address_text.strip():
            return fail(code="BAD_REQUEST", message="address required", status_code=400)
        if pay_type not in {"wx", "alipay", "balance"}:
            return fail(code="BAD_REQUEST", message="payType invalid", status_code=400)

        preview = preview_order()
        if isinstance(preview, tuple):
            payload, status = preview
            if status != 200:
                return preview
            data_preview = payload.get_json()["data"]
        else:
            data_preview = preview.get_json()["data"]

        amount = float(data_preview["payableAmount"])
        items = data_preview["items"]

        if pay_type == "balance":
            wallet = Wallet.query.filter_by(user_id=me.id).first()
            if wallet is None:
                wallet = Wallet(user_id=me.id, balance_cents=0)
                db.session.add(wallet)
                db.session.flush()
            required = _cents(amount)
            if wallet.balance_cents < required:
                db.session.rollback()
                return fail(code="INSUFFICIENT_BALANCE", message="Insufficient balance", status_code=400)
            wallet.balance_cents -= required

        order = ShopOrder(
            id=f"SO{int(datetime.utcnow().timestamp())}",
            user_id=me.id,
            status="pending_pay",
            pay_method=pay_type,
            subtotal_cents=_cents(data_preview["goodsAmount"]),
            shipping_cents=_cents(data_preview["freight"]),
            discount_cents=_cents(data_preview["discount"]),
            total_cents=_cents(data_preview["payableAmount"]),
            receiver_address=address_text.strip(),
        )
        db.session.add(order)
        db.session.flush()

        for it in items:
            p = it.get("product")
            if not isinstance(p, dict):
                continue
            product_id = p.get("id")
            product = ShopProduct.query.get(product_id) if isinstance(product_id, str) else None
            if product is None:
                continue
            db.session.add(
                ShopOrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    title_snapshot=product.title,
                    price_cents=product.price_cents,
                    quantity=int(it.get("count") or 1),
                )
            )

        if from_type == "cart":
            CartItem.query.filter_by(user_id=me.id, checked=True, is_valid=True).delete()

        db.session.commit()

        return ok(
            {
                "id": order.id,
                "status": order.status,
                "amount": amount,
                "createdAt": int(datetime.utcnow().timestamp() * 1000),
                "productNames": [i.get("product", {}).get("name", "") for i in items],
                "items": [
                    {
                        "id": i.get("product", {}).get("id"),
                        "name": i.get("product", {}).get("name"),
                        "price": i.get("product", {}).get("price"),
                        "imageUrl": i.get("product", {}).get("imageUrl"),
                        "count": i.get("count"),
                        "spec": "默认",
                    }
                    for i in items
                ],
            }
        )

    @bp.get("/shop/orders")
    @require_auth
    def list_orders():
        me: User = g.current_user
        status = request.args.get("status")
        q = ShopOrder.query.filter_by(user_id=me.id)
        if isinstance(status, str) and status and status != "all":
            q = q.filter_by(status=status)
        q = q.order_by(ShopOrder.created_at.desc())
        orders = []
        for o in q.all():
            items = ShopOrderItem.query.filter_by(order_id=o.id).all()
            product_ids = [it.product_id for it in items if isinstance(it.product_id, str)]
            products = ShopProduct.query.filter(ShopProduct.id.in_(product_ids)).all() if product_ids else []
            image_map = {p.id: _product_to_dict(p, False).get("imageUrl", "") for p in products}
            orders.append(
                {
                    "id": o.id,
                    "status": o.status,
                    "amount": _money(o.total_cents),
                    "createdAt": int((o.created_at or datetime.utcnow()).timestamp() * 1000),
                    "productNames": [it.title_snapshot for it in items],
                    "items": [
                        {
                            "id": it.product_id,
                            "name": it.title_snapshot,
                            "price": _money(it.price_cents),
                            "imageUrl": image_map.get(it.product_id) or "/assets/images/shop/问号猫.png",
                            "count": it.quantity,
                            "spec": "默认",
                        }
                        for it in items
                    ],
                }
            )
        return ok({"list": orders})

    @bp.delete("/shop/orders/<order_id>")
    @require_auth
    def delete_order(order_id: str):
        me: User = g.current_user
        o = ShopOrder.query.filter_by(user_id=me.id, id=order_id).first()
        if o is None:
            return fail(code="NOT_FOUND", message="order not found", status_code=404)
        ShopOrderItem.query.filter_by(order_id=o.id).delete()
        db.session.delete(o)
        db.session.commit()
        return ok({"ok": True})

    @bp.post("/shop/orders/<order_id>/pay")
    @require_auth
    def pay_order(order_id: str):
        me: User = g.current_user
        o = ShopOrder.query.filter_by(user_id=me.id, id=order_id).first()
        if o is None:
            return fail(code="NOT_FOUND", message="order not found", status_code=404)
        if o.status == "pending_pay":
            o.status = "shipping"
            db.session.commit()
        return ok({"ok": True})

    @bp.post("/shop/orders/<order_id>/confirm-receipt")
    @require_auth
    def confirm_receipt(order_id: str):
        me: User = g.current_user
        o = ShopOrder.query.filter_by(user_id=me.id, id=order_id).first()
        if o is None:
            return fail(code="NOT_FOUND", message="order not found", status_code=404)
        o.status = "done"
        db.session.commit()
        return ok({"ok": True})

    @bp.get("/shop/recharge/options")
    @require_auth
    def list_recharge_options():
        options = RechargeOption.query.order_by(RechargeOption.sort.asc()).all()
        return ok(
            {
                "list": [
                    {
                        "id": o.id,
                        "amount": _money(o.amount_cents),
                        "bonus": _money(o.bonus_cents),
                        "label": o.label or "",
                    }
                    for o in options
                ]
            }
        )

    @bp.post("/shop/recharge")
    @require_auth
    def recharge():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}

        option_id = data.get("optionId")
        cents = 0
        if isinstance(option_id, str) and option_id:
            opt = RechargeOption.query.get(option_id)
            if opt is None:
                return fail(code="NOT_FOUND", message="option not found", status_code=404)
            cents = int(opt.amount_cents or 0) + int(opt.bonus_cents or 0)
        else:
            amount = data.get("amount")
            cents = _cents(amount)

        if cents <= 0:
            return fail(code="BAD_REQUEST", message="amount or optionId required", status_code=400)
        wallet = Wallet.query.filter_by(user_id=me.id).first()
        if wallet is None:
            wallet = Wallet(user_id=me.id, balance_cents=0)
            db.session.add(wallet)
        wallet.balance_cents += cents
        db.session.commit()
        return ok({"balance": _money(wallet.balance_cents)})

    @bp.get("/shop/customer-service/faqs")
    def list_faqs():
        faqs = CustomerServiceFaq.query.order_by(CustomerServiceFaq.sort.asc()).all()
        return ok({"list": [{"id": f.id, "q": f.question, "a": f.answer} for f in faqs]})

    @bp.get("/user/addresses")
    @require_auth
    def list_addresses():
        me: User = g.current_user
        addrs = Address.query.filter_by(user_id=me.id).order_by(Address.created_at.desc()).all()
        return ok({"list": [_address_to_dict(a) for a in addrs]})

    @bp.get("/user/address/default")
    @require_auth
    def default_address():
        me: User = g.current_user
        a = Address.query.filter_by(user_id=me.id, is_default=True).first()
        if a is None:
            a = Address.query.filter_by(user_id=me.id).order_by(Address.created_at.desc()).first()
        if a is None:
            return fail(code="NOT_FOUND", message="address not found", status_code=404)
        return ok(_address_to_dict(a))

    @bp.post("/user/addresses")
    @require_auth
    def create_address():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        phone = data.get("phone")
        detail = data.get("detail")
        if not isinstance(name, str) or not name.strip():
            return fail(code="BAD_REQUEST", message="name required", status_code=400)
        if not isinstance(phone, str) or not phone.strip():
            return fail(code="BAD_REQUEST", message="phone required", status_code=400)
        if not isinstance(detail, str) or not detail.strip():
            return fail(code="BAD_REQUEST", message="detail required", status_code=400)
        is_default = bool(data.get("isDefault"))
        if is_default:
            Address.query.filter_by(user_id=me.id, is_default=True).update({"is_default": False})
        a = Address(
            user_id=me.id,
            receiver_name=name.strip(),
            phone=phone.strip(),
            province=(data.get("province") or "") if isinstance(data.get("province"), str) else "",
            city=(data.get("city") or "") if isinstance(data.get("city"), str) else "",
            district=(data.get("district") or "") if isinstance(data.get("district"), str) else "",
            address_line=detail.strip(),
            is_default=is_default,
        )
        db.session.add(a)
        db.session.commit()
        return ok({"data": _address_to_dict(a)})

    @bp.put("/user/addresses/<address_id>")
    @require_auth
    def update_address(address_id: str):
        me: User = g.current_user
        a = Address.query.filter_by(user_id=me.id, id=address_id).first()
        if a is None:
            return fail(code="NOT_FOUND", message="address not found", status_code=404)
        data = request.get_json(silent=True) or {}
        if "name" in data:
            name = data.get("name")
            if not isinstance(name, str) or not name.strip():
                return fail(code="BAD_REQUEST", message="name required", status_code=400)
            a.receiver_name = name.strip()
        if "phone" in data:
            phone = data.get("phone")
            if not isinstance(phone, str) or not phone.strip():
                return fail(code="BAD_REQUEST", message="phone required", status_code=400)
            a.phone = phone.strip()
        if "province" in data:
            a.province = (data.get("province") or "") if isinstance(data.get("province"), str) else ""
        if "city" in data:
            a.city = (data.get("city") or "") if isinstance(data.get("city"), str) else ""
        if "district" in data:
            a.district = (data.get("district") or "") if isinstance(data.get("district"), str) else ""
        if "detail" in data:
            detail = data.get("detail")
            if not isinstance(detail, str) or not detail.strip():
                return fail(code="BAD_REQUEST", message="detail required", status_code=400)
            a.address_line = detail.strip()
        if "isDefault" in data:
            is_default = bool(data.get("isDefault"))
            if is_default:
                Address.query.filter_by(user_id=me.id, is_default=True).update({"is_default": False})
            a.is_default = is_default
        db.session.commit()
        return ok({"data": _address_to_dict(a)})

    @bp.delete("/user/addresses/<address_id>")
    @require_auth
    def delete_address(address_id: str):
        me: User = g.current_user
        a = Address.query.filter_by(user_id=me.id, id=address_id).first()
        if a is None:
            return ok({"ok": True})
        was_default = bool(a.is_default)
        db.session.delete(a)
        db.session.commit()
        if was_default:
            fallback = Address.query.filter_by(user_id=me.id).order_by(Address.created_at.desc()).first()
            if fallback is not None:
                Address.query.filter_by(user_id=me.id, is_default=True).update({"is_default": False})
                fallback.is_default = True
                db.session.commit()
        return ok({"ok": True})

    @bp.put("/user/address/default")
    @require_auth
    def set_default_address():
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        address_id = data.get("id")
        if not isinstance(address_id, str) or not address_id:
            return fail(code="BAD_REQUEST", message="id required", status_code=400)
        a = Address.query.filter_by(user_id=me.id, id=address_id).first()
        if a is None:
            return fail(code="NOT_FOUND", message="address not found", status_code=404)
        Address.query.filter_by(user_id=me.id, is_default=True).update({"is_default": False})
        a.is_default = True
        db.session.commit()
        return ok({"ok": True, "data": _address_to_dict(a)})
