from flask import request
from ....extensions import db
from ....models import ShopProduct, ShopOrder
from ....responses import ok, fail
from .auth import admin_required, log_admin_action

def register_admin_shop_routes(bp):
    @bp.get("/admin/shop/products")
    @admin_required
    def get_products():
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        
        query = ShopProduct.query

        pagination = query.order_by(ShopProduct.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        products = []
        for product in pagination.items:
            products.append({
                "id": product.id,
                "title": product.title,
                "description": product.description,
                "price_cents": product.price_cents,
                "stock": product.stock,
                "is_active": product.is_active,
                "images_json": product.images_json,
                "created_at": product.created_at.isoformat() + "Z" if product.created_at else None,
            })

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
        page = request.args.get("page", 1, type=int)
        size = request.args.get("size", 10, type=int)
        status = request.args.get("status", "")
        
        query = ShopOrder.query

        if status:
            query = query.filter_by(status=status)

        pagination = query.order_by(ShopOrder.created_at.desc()).paginate(page=page, per_page=size, error_out=False)

        orders = []
        for order in pagination.items:
            orders.append({
                "id": order.id,
                "user_id": order.user_id,
                "total_cents": order.total_cents,
                "status": order.status,
                "receiver_name": order.receiver_name,
                "created_at": order.created_at.isoformat() + "Z" if order.created_at else None,
            })

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
