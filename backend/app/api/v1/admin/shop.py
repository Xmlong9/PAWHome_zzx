from flask import request
import json
from datetime import datetime
from sqlalchemy import func
from ....extensions import db
from ....models import ShopProduct, ShopOrder, ShopOrderItem, User
from ....responses import ok, fail
from .auth import admin_required, log_admin_action

def _iso(dt):
    return dt.isoformat() + "Z" if dt else None

def _pagination_args():
    page = request.args.get("page", 1, type=int)
    size = request.args.get("pageSize", None, type=int)
    if size is None:
        size = request.args.get("size", 10, type=int)
    return page, size

def _first_image(images_json: str | None):
    if isinstance(images_json, str) and images_json.strip():
        try:
            val = json.loads(images_json)
            if isinstance(val, list) and val:
                first = val[0]
                if isinstance(first, (str, int, float)):
                    return str(first)
            if isinstance(val, dict):
                url = val.get("url") or val.get("image") or val.get("cover")
                if isinstance(url, str) and url:
                    return url
        except Exception:
            return None
    return None

def _product_status(is_active: bool, stock: int):
    if not is_active:
        return "off_sale"
    if stock <= 0:
        return "off_sale"
    if stock < 100:
        return "low_stock"
    return "on_sale"

def register_admin_shop_routes(bp):
    @bp.get("/admin/shop/products/summary")
    @admin_required
    def get_products_summary():
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        total_products = db.session.query(func.count(ShopProduct.id)).scalar() or 0
        active_products = (
            db.session.query(func.count(ShopProduct.id))
            .filter(ShopProduct.is_active.is_(True))
            .scalar()
            or 0
        )
        month_new_products = (
            db.session.query(func.count(ShopProduct.id))
            .filter(ShopProduct.created_at >= month_start)
            .scalar()
            or 0
        )
        total_stock_qty = (
            db.session.query(func.coalesce(func.sum(ShopProduct.stock), 0))
            .filter(ShopProduct.is_active.is_(True), ShopProduct.stock > 0)
            .scalar()
            or 0
        )
        stock_value_cents = (
            db.session.query(func.coalesce(func.sum(ShopProduct.stock * ShopProduct.price_cents), 0))
            .filter(ShopProduct.is_active.is_(True), ShopProduct.stock > 0)
            .scalar()
            or 0
        )
        out_of_stock_products = (
            db.session.query(func.count(ShopProduct.id))
            .filter(ShopProduct.is_active.is_(True), ShopProduct.stock <= 0)
            .scalar()
            or 0
        )

        return ok(
            {
                "totalProducts": int(total_products),
                "activeProducts": int(active_products),
                "monthNewProducts": int(month_new_products),
                "outOfStockProducts": int(out_of_stock_products),
                "totalStockQty": int(total_stock_qty),
                "totalStockValue": float(stock_value_cents) / 100,
                "totalStockValueCents": int(stock_value_cents),
            }
        )

    @bp.get("/admin/shop/products")
    @admin_required
    def get_products():
        page, size = _pagination_args()
        
        query = ShopProduct.query

        pagination = query.order_by(ShopProduct.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        products = []
        for product in pagination.items:
            products.append(
                {
                    "id": product.id,
                    "productNo": (product.id or "")[:8],
                    "name": product.title,
                    "categoryText": None,
                    "price": product.price_cents / 100,
                    "stockQty": product.stock,
                    "status": _product_status(bool(product.is_active), int(product.stock or 0)),
                    "isActive": bool(product.is_active),
                    "imageUrl": _first_image(product.images_json),
                    "createdAt": _iso(product.created_at),
                }
            )

        return ok({
            "items": products,
            "total": pagination.total,
            "page": page,
            "size": size
        })

    @bp.post("/admin/shop/products")
    @admin_required
    def create_product():
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        if not title:
            return fail(code="BAD_REQUEST", message="Title is required", status_code=400)
            
        price_cents = data.get("price_cents", 0)
        stock = data.get("stock", 0)
        description = data.get("description", "")
        images_json = data.get("images_json", "[]")
        is_active = data.get("is_active", True)
        
        product = ShopProduct(
            title=title,
            description=description,
            price_cents=price_cents,
            stock=stock,
            images_json=images_json,
            is_active=is_active
        )
        db.session.add(product)
        db.session.commit()
        log_admin_action("create_product", "product", product.id)
        
        return ok({"id": product.id, "message": "Product created successfully"})

    @bp.put("/admin/shop/products/<product_id>")
    @admin_required
    def update_product(product_id):
        product = ShopProduct.query.get(product_id)
        if not product:
            return fail(code="NOT_FOUND", message="Product not found", status_code=404)
            
        data = request.get_json(silent=True) or {}
        
        if "title" in data:
            product.title = data["title"]
        if "description" in data:
            product.description = data["description"]
        if "price_cents" in data:
            product.price_cents = data["price_cents"]
        if "stock" in data:
            product.stock = data["stock"]
        if "images_json" in data:
            product.images_json = data["images_json"]
        if "is_active" in data:
            product.is_active = data["is_active"]
            
        db.session.commit()
        log_admin_action("update_product", "product", product.id)
        
        return ok({"message": "Product updated successfully"})

    @bp.put("/admin/shop/products/<product_id>/status")
    @admin_required
    def update_product_status(product_id):
        product = ShopProduct.query.get(product_id)
        if not product:
            return fail(code="NOT_FOUND", message="Product not found", status_code=404)
        
        data = request.get_json(silent=True) or {}
        is_active = data.get("is_active", True)
        
        product.is_active = is_active
        db.session.commit()
        log_admin_action(f"update_product_status_{is_active}", "product", product_id)
        
        return ok({"message": "Product status updated"})

    @bp.get("/admin/shop/orders")
    @admin_required
    def get_orders():
        page, size = _pagination_args()
        status = request.args.get("status", "")
        
        query = ShopOrder.query

        if status:
            query = query.filter_by(status=status)

        pagination = query.order_by(ShopOrder.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        orders = []
        for order in pagination.items:
            buyer = User.query.get(order.user_id)
            items = []
            for it in ShopOrderItem.query.filter_by(order_id=order.id).all():
                prod = ShopProduct.query.get(it.product_id)
                items.append(
                    {
                        "id": it.id,
                        "skuText": None,
                        "quantity": it.quantity,
                        "product": {
                            "id": it.product_id,
                            "name": (prod.title if prod else it.title_snapshot),
                            "imageUrl": _first_image(prod.images_json) if prod else None,
                        },
                    }
                )

            status_map = {
                "pending_pay": "unpaid",
                "pending_ship": "to_ship",
                "shipped": "shipped",
                "completed": "completed",
                "cancelled": "cancelled",
            }
            orders.append(
                {
                    "id": order.id,
                    "orderNo": (order.id or "")[:8],
                    "createdAt": _iso(order.created_at),
                    "buyer": {
                        "id": order.user_id,
                        "name": buyer.nickname if buyer else "Unknown",
                        "phoneMasked": "",
                    },
                    "pay": {
                        "amountPaid": order.total_cents / 100,
                        "method": order.pay_method or "",
                    },
                    "status": status_map.get(order.status, order.status),
                    "items": items,
                }
            )

        return ok({
            "items": orders,
            "total": pagination.total,
            "page": page,
            "size": size
        })

    @bp.put("/admin/shop/orders/<order_id>/ship")
    @admin_required
    def ship_order(order_id):
        order = ShopOrder.query.get(order_id)
        if not order:
            return fail(code="NOT_FOUND", message="Order not found", status_code=404)
        
        if order.status != "pending_ship":
            return fail(code="INVALID_STATE", message="Order is not pending shipment", status_code=400)
            
        order.status = "shipped"
        db.session.commit()
        log_admin_action("ship_order", "order", order_id)
        
        return ok({"message": "Order shipped"})
