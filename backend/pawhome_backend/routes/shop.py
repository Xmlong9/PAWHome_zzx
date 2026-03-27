from __future__ import annotations

import uuid
from typing import Any

from flask import Blueprint, g, request
from pydantic import BaseModel, Field

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.errors import AppError
from pawhome_backend.common.pagination import to_range_query
from pawhome_backend.common.responses import ok
from pawhome_backend.common.validation import parse_json
from pawhome_backend.integrations.supabase_client import get_supabase_admin, get_supabase_user
from postgrest.types import CountMethod


bp = Blueprint("shop", __name__)


def _maybe_int(value: str) -> int | None:
  try:
    return int(value)
  except Exception:
    return None


def _resolve_product(product_id_or_code: str) -> dict[str, Any] | None:
  client = get_supabase_user()
  pid = _maybe_int(product_id_or_code)
  q = client.table("products").select("id,code,name,description,cover_url,sold_count,rating,status")
  if pid is not None:
    q = q.eq("id", pid)
  else:
    q = q.eq("code", product_id_or_code)
  res: Any = q.maybe_single().execute()
  return res.data


def _resolve_sku(product: dict[str, Any], spec: str | None) -> dict[str, Any] | None:
  client = get_supabase_user()
  q = (
    client.table("skus")
    .select("id,product_id,spec,price,market_price,stock,status")
    .eq("product_id", product["id"])
    .eq("status", 1)
  )
  if spec:
    q = q.eq("spec", spec)
  res: Any = q.order("id", desc=False).limit(1).execute()
  return (res.data or [None])[0]


def _get_or_create_cart_id() -> int:
  client = get_supabase_user()
  found: Any = client.table("carts").select("id").eq("user_id", g.user_id).maybe_single().execute()
  if found.data and found.data.get("id"):
    return int(found.data["id"])
  created: Any = client.table("carts").insert({"user_id": g.user_id}).execute()
  return int(created.data[0]["id"])


class ToggleFavoriteBody(BaseModel):
  pass


class AddToCartBody(BaseModel):
  productId: str
  count: int = Field(default=1, ge=1)
  spec: str | None = None


class UpdateCartBody(BaseModel):
  count: int | None = Field(default=None, ge=1)
  checked: bool | None = None


class CheckoutPreviewBody(BaseModel):
  from_: str = Field(alias="from", pattern="^(cart|detail)$")
  productId: str | None = None
  count: int | None = Field(default=None, ge=1)


class SubmitOrderBody(BaseModel):
  from_: str = Field(alias="from", pattern="^(cart|detail)$")
  productId: str | None = None
  count: int | None = Field(default=None, ge=1)
  address: str
  payType: str = Field(pattern="^(wx|balance)$")


def _calc_amount(items: list[dict[str, Any]]) -> dict[str, Any]:
  goods = 0.0
  for it in items:
    goods += float(it["sku"]["price"]) * int(it["count"])
  goods_amount = round(goods, 2)
  freight = 0 if goods_amount >= 99 or goods_amount == 0 else 8
  discount = 20 if goods_amount >= 200 else 0
  payable = round(goods_amount + freight - discount, 2)
  return {"goodsAmount": goods_amount, "freight": freight, "discount": discount, "payableAmount": payable}


def _build_preview(from_: str, product_id: str | None, count: int | None) -> dict[str, Any]:
  client = get_supabase_user()
  items: list[dict[str, Any]] = []
  if from_ == "detail":
    if not product_id:
      raise AppError(code="bad_request", message="缺少 productId", status_code=400)
    product = _resolve_product(product_id)
    if not product:
      raise AppError(code="not_found", message="商品不存在", status_code=404)
    sku = _resolve_sku(product, None)
    if not sku:
      raise AppError(code="not_found", message="SKU 不存在", status_code=404)
    items = [{"product": product, "sku": sku, "count": int(count or 1)}]
  else:
    cart_id = _get_or_create_cart_id()
    rows: Any = (
      client.table("cart_items")
      .select("sku_id,quantity,checked,invalid,skus(id,spec,price,market_price,products(id,code,name,cover_url))")
      .eq("cart_id", cart_id)
      .eq("checked", True)
      .eq("invalid", False)
      .execute()
    )
    for row in rows.data or []:
      sku = row.get("skus")
      product = sku.get("products") if sku else None
      if sku and product:
        items.append({"product": product, "sku": sku, "count": int(row.get("quantity") or 1)})

  amount = _calc_amount(items)
  return {"items": items, **amount}


@bp.get("/shop/products")
def list_products():
  p = to_range_query(request.args.get("page"), request.args.get("pageSize"))
  client = get_supabase_user()
  res: Any = (
    client.table("products")
    .select("id,code,name,description,cover_url,sold_count,rating,skus(id,spec,price,market_price,stock)", count=CountMethod.exact)
    .eq("status", 1)
    .order("created_at", desc=True)
    .range(p.start, p.end)
    .execute()
  )
  return ok({"list": res.data or [], "page": p.page, "pageSize": p.page_size, "total": res.count or 0})


@bp.get("/shop/products/<product_id_or_code>")
def get_product(product_id_or_code: str):
  product = _resolve_product(product_id_or_code)
  if not product:
    raise AppError(code="not_found", message="商品不存在", status_code=404)
  client = get_supabase_user()
  skus: Any = client.table("skus").select("id,spec,price,market_price,stock").eq("product_id", product["id"]).eq("status", 1).order("id").execute()
  return ok({"product": product, "skus": skus.data or []})


@bp.get("/shop/favorites")
@require_auth
def list_favorites():
  client = get_supabase_user()
  res: Any = (
    client.table("product_favorites")
    .select("product_id,products(id,code,name,description,cover_url,sold_count,rating,skus(id,spec,price,market_price,stock))")
    .eq("user_id", g.user_id)
    .execute()
  )
  products = []
  for row in res.data or []:
    p = row.get("products")
    if p:
      products.append(p)
  return ok({"list": products})


@bp.post("/shop/favorites/<product_id_or_code>")
@require_auth
def toggle_favorite(product_id_or_code: str):
  product = _resolve_product(product_id_or_code)
  if not product:
    raise AppError(code="not_found", message="商品不存在", status_code=404)
  client = get_supabase_user()
  existing: Any = (
    client.table("product_favorites")
    .select("id")
    .eq("user_id", g.user_id)
    .eq("product_id", product["id"])
    .maybe_single()
    .execute()
  )
  if existing.data and existing.data.get("id"):
    client.table("product_favorites").delete().eq("id", existing.data["id"]).execute()
    return ok({"favorite": False})
  client.table("product_favorites").insert({"user_id": g.user_id, "product_id": product["id"]}).execute()
  return ok({"favorite": True})


@bp.get("/shop/cart")
@require_auth
def list_cart():
  cart_id = _get_or_create_cart_id()
  client = get_supabase_user()
  res: Any = (
    client.table("cart_items")
    .select("sku_id,quantity,checked,invalid,skus(id,spec,price,market_price,products(id,code,name,cover_url))")
    .eq("cart_id", cart_id)
    .order("updated_at", desc=True)
    .execute()
  )
  return ok({"list": res.data or []})


@bp.post("/shop/cart")
@require_auth
def add_to_cart():
  body = parse_json(AddToCartBody)
  product = _resolve_product(body.productId)
  if not product:
    raise AppError(code="not_found", message="商品不存在", status_code=404)
  sku = _resolve_sku(product, body.spec)
  if not sku:
    raise AppError(code="not_found", message="SKU 不存在", status_code=404)
  cart_id = _get_or_create_cart_id()
  client = get_supabase_user()
  existing: Any = (
    client.table("cart_items")
    .select("id,quantity")
    .eq("cart_id", cart_id)
    .eq("sku_id", sku["id"])
    .eq("invalid", False)
    .maybe_single()
    .execute()
  )
  if existing.data and existing.data.get("id"):
    qty = int(existing.data.get("quantity") or 0) + int(body.count)
    client.table("cart_items").update({"quantity": qty}).eq("id", existing.data["id"]).execute()
    return ok({"ok": True})
  client.table("cart_items").insert({"cart_id": cart_id, "sku_id": sku["id"], "quantity": body.count, "checked": True}).execute()
  return ok({"ok": True})


@bp.patch("/shop/cart/<product_id_or_code>")
@require_auth
def update_cart_item(product_id_or_code: str):
  body = parse_json(UpdateCartBody)
  product = _resolve_product(product_id_or_code)
  if not product:
    raise AppError(code="not_found", message="商品不存在", status_code=404)
  sku = _resolve_sku(product, None)
  if not sku:
    raise AppError(code="not_found", message="SKU 不存在", status_code=404)
  cart_id = _get_or_create_cart_id()
  patch: dict[str, Any] = {}
  if body.count is not None:
    patch["quantity"] = body.count
  if body.checked is not None:
    patch["checked"] = body.checked
  if not patch:
    return ok({"ok": True})
  client = get_supabase_user()
  client.table("cart_items").update(patch).eq("cart_id", cart_id).eq("sku_id", sku["id"]).execute()
  return ok({"ok": True})


@bp.post("/shop/cart/check-all")
@require_auth
def check_all():
  checked = (request.get_json(silent=True) or {}).get("checked", True)
  cart_id = _get_or_create_cart_id()
  client = get_supabase_user()
  client.table("cart_items").update({"checked": bool(checked)}).eq("cart_id", cart_id).eq("invalid", False).execute()
  return ok({"ok": True})


@bp.delete("/shop/cart/invalid")
@require_auth
def clear_invalid():
  cart_id = _get_or_create_cart_id()
  client = get_supabase_user()
  client.table("cart_items").delete().eq("cart_id", cart_id).eq("invalid", True).execute()
  return ok({"ok": True})


@bp.post("/shop/order/preview")
@require_auth
def order_preview():
  body = parse_json(CheckoutPreviewBody)
  return ok(_build_preview(body.from_, body.productId, body.count))


@bp.post("/shop/order")
@require_auth
def submit_order():
  body = parse_json(SubmitOrderBody)
  preview = _build_preview(body.from_, body.productId, body.count)
  items = preview.get("items") or []
  if len(items) == 0:
    raise AppError(code="bad_request", message="订单为空", status_code=400)

  amount = preview
  order_no = f"SO{uuid.uuid4().hex[:10].upper()}"

  client = get_supabase_user()
  inserted: Any = (
    client.table("orders")
    .insert(
      {
        "order_no": order_no,
        "buyer_id": g.user_id,
        "status": "pending_pay",
        "total_amount": amount.get("goodsAmount"),
        "pay_amount": amount.get("payableAmount"),
        "pay_method": body.payType,
        "address_snapshot": {"text": body.address},
      }
    )
    .execute()
  )
  order = inserted.data[0]

  admin = get_supabase_admin()
  order_items_payload = []
  for it in items:
    sku = it["sku"]
    product = it["product"]
    order_items_payload.append(
      {
        "order_id": order["id"],
        "sku_id": sku["id"],
        "product_id": product.get("id"),
        "product_name": product.get("name"),
        "sku_spec": sku.get("spec"),
        "price": sku.get("price"),
        "quantity": int(it["count"]),
      }
    )
  admin.table("order_items").insert(order_items_payload).execute()

  if body.from_ == "cart":
    cart_id = _get_or_create_cart_id()
    client.table("cart_items").delete().eq("cart_id", cart_id).eq("checked", True).eq("invalid", False).execute()

  return ok({"order": order, "orderItems": order_items_payload}, status_code=201)


@bp.get("/shop/orders")
@require_auth
def list_orders():
  status = request.args.get("status", "all")
  client = get_supabase_user()
  q = client.table("orders").select(
    "id,order_no,status,pay_amount,created_at,address_snapshot,"
    "order_items(product_id,product_name,sku_spec,price,quantity)"
  )
  if status != "all":
    q = q.eq("status", status)
  res: Any = q.eq("buyer_id", g.user_id).order("created_at", desc=True).execute()
  return ok({"list": res.data or []})


@bp.delete("/shop/orders/<order_no>")
@require_auth
def delete_order(order_no: str):
  client = get_supabase_user()
  client.table("orders").delete().eq("order_no", order_no).eq("buyer_id", g.user_id).execute()
  return ok({"ok": True})


@bp.post("/shop/orders/<order_no>/confirm")
@require_auth
def confirm_order(order_no: str):
  client = get_supabase_user()
  client.table("orders").update({"status": "done"}).eq("order_no", order_no).eq("buyer_id", g.user_id).execute()
  return ok({"ok": True})


@bp.post("/shop/orders/<order_no>/pay_mock")
@require_auth
def pay_mock(order_no: str):
  client = get_supabase_user()
  client.table("orders").update({"status": "shipping"}).eq("order_no", order_no).eq("buyer_id", g.user_id).execute()
  return ok({"ok": True})
