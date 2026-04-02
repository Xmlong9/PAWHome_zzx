from __future__ import annotations

import json
import os
import re
import shutil
import sys
import threading
import time
from datetime import datetime, timezone

from flask import current_app, g, request

from ...auth import require_auth
from ...extensions import db
from ...models import (
    Address,
    CartItem,
    CustomerServiceFaq,
    RechargeOption,
    SupportConversation,
    SupportMessage,
    ShopFavorite,
    ShopOrder,
    ShopOrderEvent,
    ShopOrderItem,
    ShopProduct,
    User,
    Wallet,
    Pet,
    VaccineRecord,
    VaccineCatalog,
    DewormingRecord,
)
from ...responses import fail, ok


_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
_ARK_DEFAULT_MODEL = "ep-20260330013048-7zdsl"
_SHOP_SUPPORT_PHONE = "4008888888"

_ark_client_lock = threading.Lock()
_ark_client = None


def _get_ark_client():
    global _ark_client
    if _ark_client is not None:
        return _ark_client
    with _ark_client_lock:
        if _ark_client is not None:
            return _ark_client
        api_key = os.getenv("ARK_API_KEY") or ""
        if not api_key:
            _ark_client = None
            return None
        from openai import OpenAI

        _ark_client = OpenAI(base_url=_ARK_BASE_URL, api_key=api_key)
        return _ark_client


def _support_system_prompt() -> str:
    return (
        "你是爱宠家商店的智能客服助手。"
        "你只能回答与商店与订单相关的问题：下单、支付、退款/退货/换货、物流、发货、收货、地址、商品信息、库存、价格、购物车、优惠券、售后。"
        "对于问候语（如“你好/您好/在吗”）或用户询问“你是谁/怎么用/能做什么”，请先友好自我介绍并引导用户提供订单号/商品名/遇到的情况。"
        "除上述问候与使用说明外，如果用户问题不在上述范围内，请直接拒答，并提示“我只能回答订单、商店相关的问题”。"
        "回答要简洁、可执行，尽量给出用户下一步操作路径。"
        "不要编造订单状态与物流信息；如果缺少关键信息，请先追问订单号或商品名。"
        f"客服电话：{_SHOP_SUPPORT_PHONE}。如果用户询问客服电话，直接返回该号码。"
    )


def _ai_pet_system_prompt(user_id: str) -> str:
    base_prompt = (
        "你是爱宠家的专属养宠智囊团「AI宠」。"
        "你是一个专业的宠物医生和养宠专家，可以回答关于宠物健康、饮食、行为训练、日常护理等全方位的问题。\n\n"
        "【排版和格式要求（非常重要！）】：\n"
        "1. 绝对不要使用 Markdown 中的 `#` 或 `*` 符号（例如 `###`、`**`、`*` 等）。\n"
        "2. 不要把所有内容挤在一段里。\n"
        "3. 请使用清晰的段落和纯文本的换行。比如分点列出原因时，每个点前面必须加换行，使用 `1. 标题：详细说明` 的格式。\n"
        "4. 在说明可能的原因和对应的解决建议时，要条理清晰、容易阅读，不要使用过长的不换行的句子。\n"
        "5. 回答要温和、专业、有同理心。如果遇到紧急的医疗问题，请明确提醒用户及时就医。\n"
        "6. 不要回答与宠物无关的政治、时事等敏感话题。\n\n"
    )
    
    pets = Pet.query.filter_by(user_id=user_id).all()
    if not pets:
        return base_prompt + "【提示】用户当前尚未登记宠物信息。"
        
    pet_infos = []
    for pet in pets:
        info = f"宠物名字：{pet.name}\n- 种类：{pet.pet_type}\n- 品种：{pet.breed or '未知'}\n- 性别：{pet.gender or '未知'}\n- 体重：{pet.weight or '未知'}\n- 是否绝育：{'是' if pet.is_neutered else '否'}\n"
        if pet.birthday:
            info += f"- 生日：{pet.birthday.isoformat()}\n"
            
        v_records = VaccineRecord.query.filter_by(pet_id=pet.id).order_by(VaccineRecord.vaccinated_at.desc()).all()
        if v_records:
            v_items = []
            for vr in v_records:
                cat = VaccineCatalog.query.get(vr.vaccine_id)
                v_name = cat.name if cat else "未知疫苗"
                v_items.append(f"{v_name}({vr.vaccinated_at.strftime('%Y-%m-%d')})")
            info += f"- 疫苗记录：{', '.join(v_items)}\n"
        else:
            info += "- 疫苗记录：暂无\n"
            
        d_records = DewormingRecord.query.filter_by(pet_id=pet.id).order_by(DewormingRecord.record_at.desc()).all()
        if d_records:
            d_items = []
            for dr in d_records:
                d_items.append(f"{dr.title}({dr.record_at.strftime('%Y-%m-%d')})")
            info += f"- 驱虫记录：{', '.join(d_items)}\n"
        else:
            info += "- 驱虫记录：暂无\n"
            
        pet_infos.append(info)
        
    return base_prompt + "【以下是用户的宠物档案，请结合这些信息（如种类、年龄、绝育状态、疫苗驱虫情况）来提供最准确的个性化建议】：\n" + "\n".join(pet_infos)


def _call_doubao_text(text: str, *, conversation_id: str, user_id: str, system_prompt: str = None) -> str:
    client = _get_ark_client()
    if client is None:
        return ""
    model_id = os.getenv("ARK_MODEL_ID") or _ARK_DEFAULT_MODEL
    rows = (
        SupportMessage.query.filter_by(conversation_id=conversation_id)
        .order_by(SupportMessage.created_at.desc())
        .limit(12)
        .all()
    )
    rows = list(reversed(rows))
    if system_prompt is None:
        system_prompt = _support_system_prompt()
    messages = [{"role": "system", "content": system_prompt}]
    for m in rows:
        role = "user" if m.sender_role == "user" else "assistant"
        content = (m.content or "").strip()
        if not content:
            continue
        messages.append({"role": role, "content": content})
    latest_text = (text or "").strip()
    if latest_text:
        if not messages or messages[-1].get("role") != "user" or messages[-1].get("content") != latest_text:
            messages.append({"role": "user", "content": latest_text})
    resp = client.chat.completions.create(
        model=model_id,
        messages=messages,
        temperature=0.2,
    )
    choice = resp.choices[0] if getattr(resp, "choices", None) else None
    msg = getattr(choice, "message", None) if choice is not None else None
    content = getattr(msg, "content", "") if msg is not None else ""
    
    content = (content or "").strip()
    
    # post-process markdown
    content = re.sub(r'#+\s*', '', content)
    content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)
    content = re.sub(r'\*(.*?)\*', r'\1', content)
    content = re.sub(r'-(?=\s)', '•', content)
    
    return content.strip()


def _support_ai_allow(*, user_id: str, conversation_id: str) -> bool:
    return _support_ai_limiter.allow(user_id=user_id, conversation_id=conversation_id)


class _SupportAiLimiter:
    def __init__(self):
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def allow(self, *, user_id: str, conversation_id: str) -> bool:
        now = time.time()
        window = 60.0
        user_key = f"u:{user_id}"
        conv_key = f"c:{conversation_id}"
        with self._lock:
            if not self._allow_key(user_key, now, window, 20):
                return False
            if not self._allow_key(conv_key, now, window, 10):
                return False
            return True

    def _allow_key(self, key: str, now: float, window: float, limit: int) -> bool:
        hits = self._hits.get(key)
        if hits is None:
            self._hits[key] = [now]
            return True
        cutoff = now - window
        i = 0
        for ts in hits:
            if ts >= cutoff:
                break
            i += 1
        if i:
            hits[:] = hits[i:]
        if len(hits) >= limit:
            return False
        hits.append(now)
        return True


_support_ai_limiter = _SupportAiLimiter()


def _money(cents: int) -> float:
    return round(cents / 100, 2)


def _ms(dt: datetime | None) -> int:
    if dt is None:
        return 0
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def _s(dt: datetime) -> float:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _cents(amount) -> int:
    if isinstance(amount, (int, float)):
        return int(round(float(amount) * 100))
    return 0


def _ensure_recharge_options_seeded() -> None:
    options = [
        ("r1", 3000, 0, "¥30"),
        ("r2", 6800, 800, "¥68"),
        ("r3", 12800, 2000, "¥128"),
        ("r4", 32800, 6800, "¥328"),
    ]
    changed = False
    for i, (oid, amount_cents, bonus_cents, label) in enumerate(options):
        row = RechargeOption.query.get(oid)
        if row is None:
            db.session.add(
                RechargeOption(
                    id=oid,
                    amount_cents=amount_cents,
                    bonus_cents=bonus_cents,
                    label=label,
                    sort=i,
                )
            )
            changed = True
            continue

        next_sort = i
        if (
            int(row.amount_cents or 0) != int(amount_cents)
            or int(row.bonus_cents or 0) != int(bonus_cents)
            or (row.label or "") != label
            or int(row.sort or 0) != int(next_sort)
        ):
            row.amount_cents = amount_cents
            row.bonus_cents = bonus_cents
            row.label = label
            row.sort = next_sort
            changed = True

    if changed:
        db.session.commit()


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
    specs = _product_specs(p.id)
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
        "specs": specs,
    }


def _product_specs(product_id: str) -> list[str]:
    mapping: dict[str, list[str]] = {
        "p1": ["1.5kg", "2.5kg", "5kg"],
        "p2": ["10支", "20支", "30支"],
        "p3": ["6L", "12L", "18L"],
        "p4": ["经典款", "豪华款"],
        "p5": ["标准版", "MAX版"],
        "p6": ["8件套", "12件套"],
        "p7": ["6款任选"],
        "p8": ["M", "L"],
        "p9": ["小号", "大号"],
        "p10": ["3件套", "5件套"],
        "p11": ["单个", "2个装"],
        "p12": ["5件套"],
        "p13": ["单把", "2把装"],
        "p14": ["基础款", "加长款"],
        "p15": ["2kg×4"],
        "p16": ["1.8kg"],
        "p17": ["1.8kg", "5kg"],
        "p18": ["10kg"],
        "p19": ["800g", "2kg"],
        "p20": ["2kg", "12kg"],
        "p21": ["1.5kg", "2.5kg"],
    }
    return mapping.get(product_id, [])


def _ensure_shop_products_seeded() -> None:
    _ensure_shop_product_media_files()
    items = [
        ("p1", "冻干鸡肉猫粮", "高蛋白低敏，适合挑食猫咪", 6990, ["/assets/images/shop/商品1.jpg"]),
        ("p2", "益生菌猫条礼盒", "肠胃友好，适口性强", 3990, ["/assets/images/shop/商品2.jpg"]),
        ("p3", "云朵猫砂 6L", "低尘结团快，除味更持久", 2990, ["/assets/images/shop/商品3.jpg"]),
        ("p4", "猫咪逗猫棒套装", "耐咬材质，互动不伤牙", 1990, ["/assets/images/shop/商品4.jpg"]),
        ("p5", "智能自动猫砂盆 MAX", "大入口大空间，减少异味，适合多猫家庭", 159900, ["/media/prod_01.jpg"]),
        ("p6", "狗狗玩具组合", "磨牙解闷，快乐陪伴", 3990, ["/media/prod_02.jpg"]),
        ("p7", "宠物零食任选 6 款", "39元任选，多品牌混合装", 3900, ["/media/prod_03.jpg"]),
        ("p8", "透气防潮网眼行军床", "透气防潮，耐磨稳固，四季可用", 12900, ["/media/prod_04.jpg"]),
        ("p9", "鸭鸭安抚玩偶", "萌宠伴侣，抱着安睡整晚", 2990, ["/media/prod_05.jpg"]),
        ("p10", "联名逗猫棒套装", "自由DIY，多种玩法，猫猫更爱玩", 2990, ["/media/prod_06.jpg"]),
        ("p11", "多功能立式猫抓板", "玩耍/睡觉/躲猫，一板三用", 7900, ["/media/prod_07.jpg"]),
        ("p12", "磨牙自嗨 5 件套", "磨牙/洁齿/自嗨，尺寸更好玩", 2990, ["/media/prod_08.jpg"]),
        ("p13", "加宽梳面去毛刷", "加宽梳面，深层去毛，顺滑不伤皮肤", 3990, ["/media/prod_09.jpg"]),
        ("p14", "趣味猫窝（自由DIY）", "多模块组合，玩耍躲藏两不误", 12900, ["/media/prod_10.jpg"]),
        ("p15", "放山鸡猫粮 2kg×4", "高鲜肉配方，适口性更好", 15400, ["/media/prod_11.jpg"]),
        ("p16", "Dream 美毛猫粮 1.8kg", "21天美毛，含鱼油更亮毛", 12990, ["/media/prod_12.jpg"]),
        ("p17", "喵梵思蓝袋子猫粮", "好粮不贵，口味丰富更耐吃", 8990, ["/media/prod_13.jpg"]),
        ("p18", "三拼狗粮 10kg", "鸡肉拼板栗，营养搭配更均衡", 23900, ["/media/prod_14.jpg"]),
        ("p19", "鸭肉配方鲜肉狗粮", "鲜肉配方，更好消化，适口性佳", 1590, ["/media/prod_15.jpg"]),
        ("p20", "N33 PLUS 鲜肉狗粮", "鲜肉果蔬配方，营养更全面", 8490, ["/media/prod_16.jpg"]),
        ("p21", "Care 全价全期猫粮", "80%高肉含量，满足食肉天性", 9900, ["/media/prod_17.jpg"]),
    ]
    changed = False
    for pid, title, desc, price_cents, images in items:
        row = ShopProduct.query.get(pid)
        images_json = json.dumps(images, ensure_ascii=False)
        if row is None:
            db.session.add(
                ShopProduct(
                    id=pid,
                    title=title,
                    description=desc,
                    price_cents=price_cents,
                    images_json=images_json,
                    is_active=True,
                )
            )
            changed = True
            continue

        next_active = True
        if (
            (row.title or "") != title
            or (row.description or "") != (desc or "")
            or int(row.price_cents or 0) != int(price_cents)
            or (row.images_json or "") != images_json
            or bool(row.is_active) != bool(next_active)
        ):
            row.title = title
            row.description = desc
            row.price_cents = price_cents
            row.images_json = images_json
            row.is_active = next_active
            changed = True

    if changed:
        db.session.commit()


def _ensure_shop_product_media_files() -> None:
    try:
        upload_dir = os.path.join(current_app.instance_path, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
    except Exception:
        return

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    src_dir = os.path.join(root, "products")
    if not os.path.isdir(src_dir):
        return

    names = [
        "微信图片_20260330152829_829_214.jpg",
        "微信图片_20260330152830_830_214.jpg",
        "微信图片_20260330152832_831_214.jpg",
        "微信图片_20260330152833_832_214.jpg",
        "微信图片_20260330152834_833_214.jpg",
        "微信图片_20260330152835_834_214.jpg",
        "微信图片_20260330152837_835_214.jpg",
        "微信图片_20260330152838_836_214.jpg",
        "微信图片_20260330152839_837_214.jpg",
        "微信图片_20260330152840_838_214.jpg",
        "微信图片_20260330152841_839_214.jpg",
        "微信图片_20260330152842_840_214.jpg",
        "微信图片_20260330152843_841_214.jpg",
        "微信图片_20260330152844_842_214.jpg",
        "微信图片_20260330152845_843_214.jpg",
        "微信图片_20260330152846_844_214.jpg",
        "微信图片_20260330152847_845_214.jpg",
    ]
    for i, name in enumerate(names, start=1):
        dst = os.path.join(upload_dir, f"prod_{i:02d}.jpg")
        if os.path.exists(dst):
            continue
        src = os.path.join(src_dir, name)
        if not os.path.isfile(src):
            continue
        try:
            shutil.copyfile(src, dst)
        except Exception:
            continue

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


def _ensure_order_event_table():
    ShopOrderEvent.__table__.create(db.engine, checkfirst=True)


def _ensure_support_tables():
    SupportConversation.__table__.create(db.engine, checkfirst=True)
    SupportMessage.__table__.create(db.engine, checkfirst=True)


def _add_order_event(order_id: str, event_type: str, at: datetime, message: str | None = None):
    _ensure_order_event_table()
    exists = ShopOrderEvent.query.filter_by(order_id=order_id, event_type=event_type).first()
    if exists is not None:
        return
    db.session.add(ShopOrderEvent(order_id=order_id, event_type=event_type, at=at, message=message))


def _parse_receiver_address(address_text: str) -> dict:
    raw = (address_text or "").strip()
    if not raw:
        return {"name": "", "phone": "", "detail": ""}
    parts = raw.split()
    if len(parts) >= 3 and parts[1].isdigit() and 7 <= len(parts[1]) <= 18:
        return {"name": parts[0], "phone": parts[1], "detail": " ".join(parts[2:])}
    return {"name": "", "phone": "", "detail": raw}


def register_routes(bp) -> None:
    @bp.get("/shop/products")
    @require_auth
    def list_products():
        me: User = g.current_user
        _ensure_shop_products_seeded()
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
        _ensure_shop_products_seeded()
        p = ShopProduct.query.get(product_id)
        if p is None or not p.is_active:
            return fail(code="NOT_FOUND", message="product not found", status_code=404)
        fav = ShopFavorite.query.filter_by(user_id=me.id, product_id=product_id).first() is not None
        return ok(_product_to_dict(p, fav))

    @bp.get("/shop/favorites")
    @require_auth
    def list_favorites():
        me: User = g.current_user
        _ensure_shop_products_seeded()
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
            id=f"SO{int(_utcnow().timestamp())}",
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
        _add_order_event(order.id, "created", datetime.utcnow(), "订单已创建")

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
                "createdAt": _ms(datetime.utcnow()),
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
                    "createdAt": _ms(o.created_at or datetime.utcnow()),
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
        ShopOrderEvent.query.filter_by(order_id=o.id).delete()
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
            now = datetime.utcnow()
            _add_order_event(o.id, "paid", now, "支付成功")
            _add_order_event(o.id, "shipped", now, "商家已发货")
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
        _add_order_event(o.id, "signed", datetime.utcnow(), "已签收")
        db.session.commit()
        return ok({"ok": True})

    @bp.get("/shop/orders/<order_id>/logistics")
    @require_auth
    def get_order_logistics(order_id: str):
        me: User = g.current_user
        o = ShopOrder.query.filter_by(user_id=me.id, id=order_id).first()
        if o is None:
            return fail(code="NOT_FOUND", message="order not found", status_code=404)
        _ensure_order_event_table()
        events = ShopOrderEvent.query.filter_by(order_id=o.id).order_by(ShopOrderEvent.at.desc()).all()
        if not events:
            created_at = o.created_at or datetime.utcnow()
            _add_order_event(o.id, "created", created_at, "订单已创建")
            db.session.commit()
            events = ShopOrderEvent.query.filter_by(order_id=o.id).order_by(ShopOrderEvent.at.desc()).all()

        by_type = {e.event_type: e for e in events}
        created_at = by_type.get("created").at if by_type.get("created") else (o.created_at or datetime.utcnow())
        shipped_at = (by_type.get("shipped") or by_type.get("paid") or by_type.get("created")).at if by_type.get("created") else created_at
        end_at = by_type.get("signed").at if by_type.get("signed") else datetime.utcnow()
        window_seconds = max(0, int((end_at - shipped_at).total_seconds()))
        seed = sum(ord(c) for c in str(o.id))
        steps = []
        if window_seconds > 30 * 60:
            t1 = _s(shipped_at) + min(window_seconds - 10 * 60, 10 * 60 + (seed % (40 * 60)))
            t2 = _s(shipped_at) + min(window_seconds - 5 * 60, 30 * 60 + (seed % (60 * 60)))
            steps = [
                ("transit", datetime.utcfromtimestamp(t1), "快件已到达分拨中心"),
                ("out_for_delivery", datetime.utcfromtimestamp(t2), "快件派送中"),
            ]
            steps = [s for s in steps if s[1] <= end_at]

        out_events = [
            {"type": e.event_type, "at": _ms(e.at), "text": e.message or ""}
            for e in events
        ]
        out_events.extend([{"type": t, "at": _ms(dt), "text": text} for (t, dt, text) in steps])
        out_events.sort(key=lambda x: x["at"], reverse=True)

        addr = _parse_receiver_address(o.receiver_address or "")
        return ok(
            {
                "orderId": o.id,
                "status": o.status,
                "address": addr,
                "createdAt": _ms(created_at),
                "events": out_events,
            }
        )

    @bp.get("/shop/recharge/options")
    @require_auth
    def list_recharge_options():
        _ensure_recharge_options_seeded()
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
            _ensure_recharge_options_seeded()
            opt = RechargeOption.query.get(option_id)
            if opt is None:
                fallback = {
                    "r1": 3000,
                    "r2": 6800 + 800,
                    "r3": 12800 + 2000,
                    "r4": 32800 + 6800,
                }.get(option_id)
                if fallback is None:
                    return fail(code="NOT_FOUND", message="option not found", status_code=404)
                cents = int(fallback)
            else:
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

    @bp.post("/shop/support/conversations")
    @require_auth
    def create_support_conversation():
        _ensure_support_tables()
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        mode = data.get("mode")
        if mode not in {"smart", "human"}:
            mode = "smart"
        channel = data.get("channel") or "shop"
        force_new = bool(data.get("forceNew"))

        conv = None
        if not force_new:
            conv = (
                SupportConversation.query.filter_by(user_id=me.id, channel=channel, mode=mode)
                .order_by(SupportConversation.updated_at.desc())
                .first()
            )
        if conv is None or conv.status != "open":
            conv = SupportConversation(user_id=me.id, channel=channel, mode=mode, status="open")
            db.session.add(conv)
            db.session.commit()

        return ok(
            {
                "id": conv.id,
                "mode": conv.mode,
                "status": conv.status,
                "createdAt": _ms(conv.created_at),
                "lastMessageAt": _ms(conv.last_message_at or conv.updated_at),
            }
        )

    @bp.post("/shop/support/conversations/<cid>/close")
    @require_auth
    def close_support_conversation(cid: str):
        _ensure_support_tables()
        me: User = g.current_user
        conv = SupportConversation.query.get(cid)
        if conv is None or conv.user_id != me.id:
            return fail(code="NOT_FOUND", message="conversation not found", status_code=404)
        if conv.status != "closed":
            conv.status = "closed"
            db.session.commit()
        return ok(
            {
                "id": conv.id,
                "mode": conv.mode,
                "status": conv.status,
                "createdAt": _ms(conv.created_at),
                "lastMessageAt": _ms(conv.last_message_at or conv.updated_at),
            }
        )

    @bp.get("/shop/support/conversations")
    @require_auth
    def list_support_conversations():
        _ensure_support_tables()
        me: User = g.current_user
        channel = request.args.get("channel", "shop")
        rows = (
            SupportConversation.query.filter_by(user_id=me.id, channel=channel)
            .order_by(SupportConversation.updated_at.desc())
            .limit(50)
            .all()
        )
        return ok(
            {
                "list": [
                    {
                        "id": c.id,
                        "mode": c.mode,
                        "status": c.status,
                        "createdAt": _ms(c.created_at),
                        "lastMessageAt": _ms(c.last_message_at or c.updated_at),
                    }
                    for c in rows
                ]
            }
        )

    @bp.post("/shop/support/conversations/cleanup")
    @require_auth
    def cleanup_support_conversations():
        _ensure_support_tables()
        me: User = g.current_user
        data = request.get_json(silent=True) or {}
        channel = data.get("channel") or "shop"
        keep = data.get("keep")
        try:
            keep_n = int(keep) if keep is not None else 5
        except Exception:
            keep_n = 5
        if keep_n < 0:
            keep_n = 0
        if keep_n > 50:
            keep_n = 50

        keep_rows = (
            SupportConversation.query.filter_by(user_id=me.id, channel=channel)
            .order_by(SupportConversation.updated_at.desc())
            .limit(keep_n)
            .all()
        )
        keep_ids = {c.id for c in keep_rows}

        q = SupportConversation.query.filter_by(user_id=me.id, channel=channel, status="closed")
        if keep_ids:
            q = q.filter(~SupportConversation.id.in_(list(keep_ids)))
        del_ids = [r[0] for r in q.with_entities(SupportConversation.id).all()]
        if not del_ids:
            return ok({"deletedConversations": 0, "deletedMessages": 0, "kept": keep_n})

        deleted_messages = (
            SupportMessage.query.filter(SupportMessage.conversation_id.in_(del_ids)).delete(synchronize_session=False)
            or 0
        )
        deleted_convs = (
            SupportConversation.query.filter(SupportConversation.id.in_(del_ids)).delete(synchronize_session=False) or 0
        )
        db.session.commit()
        return ok({"deletedConversations": int(deleted_convs), "deletedMessages": int(deleted_messages), "kept": keep_n})

    @bp.get("/shop/support/conversations/<cid>/messages")
    @require_auth
    def list_support_messages(cid: str):
        _ensure_support_tables()
        me: User = g.current_user
        conv = SupportConversation.query.get(cid)
        if conv is None or conv.user_id != me.id:
            return fail(code="NOT_FOUND", message="conversation not found", status_code=404)
        rows = (
            SupportMessage.query.filter_by(conversation_id=cid)
            .order_by(SupportMessage.created_at.asc())
            .limit(200)
            .all()
        )
        return ok(
            {
                "list": [
                    {
                        "id": m.id,
                        "role": m.sender_role,
                        "type": m.message_type,
                        "content": m.content,
                        "createdAt": _ms(m.created_at),
                    }
                    for m in rows
                ]
            }
        )

    def _normalize_support_text(text: str) -> str:
        t = (text or "").strip()
        if not t:
            return ""
        punct = " \t\r\n，。！？!?、,.；;：:（）()【】[]{}<>《》“”\"'’‘-—_~`·|/\\"
        for ch in punct:
            t = t.replace(ch, "")
        return t

    def _extract_order_id(text: str) -> str:
        t = (text or "").strip()
        if not t:
            return ""
        m = re.search(r"(?i)so\d{6,}", t)
        return m.group(0).upper() if m else ""

    def _recent_support_order_id(conversation_id: str, user_id: str) -> str:
        rows = (
            SupportMessage.query.filter_by(conversation_id=conversation_id)
            .order_by(SupportMessage.created_at.desc())
            .limit(20)
            .all()
        )
        for row in rows:
            oid = _extract_order_id(row.content or "")
            if not oid:
                continue
            order = ShopOrder.query.filter_by(id=oid, user_id=user_id).first()
            if order is not None:
                return oid
        return ""

    def _support_followup_intent(text: str) -> bool:
        t = _normalize_support_text(text)
        if not t:
            return False
        keywords = [
            "这单",
            "这一单",
            "这笔订单",
            "这个订单",
            "该订单",
            "买了什么",
            "什么商品",
            "啥商品",
            "花了多少",
            "多少钱",
            "物流",
            "快递",
            "发货",
            "收货",
            "售后",
            "退款",
            "退货",
            "换货",
            "到哪",
            "进度",
        ]
        return any(k in t for k in keywords)

    def _support_in_scope(text: str) -> bool:
        t = _normalize_support_text(text)
        if not t:
            return False
        if re.search(r"(?i)so\d{6,}", t):
            return True
        if re.search(r"\d{10,}", t):
            return True
        if re.search(r"(?i)[a-z]{1,4}\d{6,}", t):
            return True
        keywords = [
            "订单",
            "退款",
            "退货",
            "换货",
            "售后",
            "物流",
            "快递",
            "发货",
            "收货",
            "支付",
            "付款",
            "地址",
            "商品",
            "价格",
            "库存",
            "购物车",
            "优惠券",
            "商店",
            "下单",
            "客服",
            "人工",
            "智能",
            "ai",
            "AI",
            "怎么用",
            "你是谁",
            "是什么",
            "你好",
            "您好",
            "在吗",
            "嗨",
            "哈喽",
            "hello",
            "hi",
        ]
        return any(k in t for k in keywords)

    def _smart_reply(text: str, *, conversation_id: str, user_id: str) -> str:
        t = (text or "").strip()
        if not t:
            return "请描述下你的问题，我来帮你看看。"
        faqs = CustomerServiceFaq.query.order_by(CustomerServiceFaq.sort.asc()).all()
        tn = _normalize_support_text(t)
        recent_order_id = _recent_support_order_id(conversation_id, user_id)
        followup_with_recent_order = bool(recent_order_id and _support_followup_intent(t))
        for f in faqs:
            if _normalize_support_text(f.question or "") == tn:
                return f.answer
        if not _support_in_scope(t) and not followup_with_recent_order:
            return "我只能回答订单、商店相关的问题。你可以描述下订单号/商品名/遇到的情况，我来帮你处理。"
        try:
            allow_fn = getattr(sys.modules[__name__], "_support_ai_allow")
            if not allow_fn(user_id=user_id, conversation_id=conversation_id):
                return "提问太频繁，请稍后再试。"
            fn = getattr(sys.modules[__name__], "_call_doubao_text")
            order_id = _extract_order_id(t) or (recent_order_id if followup_with_recent_order or _support_in_scope(t) else "")
            if order_id:
                order = ShopOrder.query.filter_by(id=order_id, user_id=user_id).first()
                if order is not None:
                    items = (
                        ShopOrderItem.query.filter_by(order_id=order_id)
                        .order_by(ShopOrderItem.created_at.asc())
                        .limit(20)
                        .all()
                    )
                    latest_event = (
                        ShopOrderEvent.query.filter_by(order_id=order_id)
                        .order_by(ShopOrderEvent.at.desc())
                        .first()
                    )
                    latest_text = (latest_event.message or latest_event.event_type) if latest_event is not None else ""
                    ctx_lines = [
                        f"订单号：{order.id}",
                        f"下单时间：{_ms(order.created_at)}",
                        f"金额：{_money(int(order.total_cents or 0))}",
                    ]
                    if latest_text:
                        ctx_lines.append(f"物流最新：{latest_text}")
                    if items:
                        ctx_lines.append("商品：")
                        for it in items[:5]:
                            ctx_lines.append(
                                f"- {it.title_snapshot} x{int(it.quantity or 0)}（单价{_money(int(it.price_cents or 0))}）"
                            )
                    ctx = "\n".join(ctx_lines)
                    t = f"{t}\n\n【订单信息】\n{ctx}"
            r = fn(t, conversation_id=conversation_id, user_id=user_id)
            if isinstance(r, str) and r.strip():
                return r.strip()
        except Exception:
            pass
        return "我先记下了～如果是订单/退款/地址修改等问题，可以点上方常见问题快速获取答案；也可以转人工客服。"

    def _ai_pet_reply(text: str, *, conversation_id: str, user_id: str) -> str:
        t = (text or "").strip()
        if not t:
            return "你好呀！我是你的专属 AI 宠。可以问我关于宠物健康、日常护理、行为训练的问题哦～"
        try:
            allow_fn = getattr(sys.modules[__name__], "_support_ai_allow")
            if not allow_fn(user_id=user_id, conversation_id=conversation_id):
                return "提问太频繁，请稍后再试。"
            fn = getattr(sys.modules[__name__], "_call_doubao_text")
            r = fn(t, conversation_id=conversation_id, user_id=user_id, system_prompt=_ai_pet_system_prompt(user_id))
            if isinstance(r, str) and r.strip():
                return r.strip()
        except Exception:
            pass
        return "我现在有点小迷糊，可以换个说法再问我一次吗？"

    @bp.post("/shop/support/conversations/<cid>/messages")
    @require_auth
    def send_support_message(cid: str):
        _ensure_support_tables()
        me: User = g.current_user
        conv = SupportConversation.query.get(cid)
        if conv is None or conv.user_id != me.id:
            return fail(code="NOT_FOUND", message="conversation not found", status_code=404)

        data = request.get_json(silent=True) or {}
        message_type = data.get("messageType")
        if not isinstance(message_type, str) or not message_type:
            message_type = "text"
        content = data.get("content")
        order_id = data.get("orderId")
        user_text_for_ai = ""
        stored_content = ""
        stored_type = message_type

        if message_type == "text":
            if not isinstance(content, str) or not content.strip():
                return fail(code="BAD_REQUEST", message="content required", status_code=400)
            stored_content = content.strip()
            user_text_for_ai = stored_content
        elif message_type == "order_card":
            if not isinstance(order_id, str) or not order_id.strip():
                return fail(code="BAD_REQUEST", message="orderId required", status_code=400)
            oid = order_id.strip().upper()
            order = ShopOrder.query.filter_by(id=oid, user_id=me.id).first()
            if order is None:
                return fail(code="NOT_FOUND", message="order not found", status_code=404)
            items = (
                ShopOrderItem.query.filter_by(order_id=oid)
                .order_by(ShopOrderItem.created_at.asc())
                .limit(50)
                .all()
            )
            snapshot = {
                "orderId": oid,
                "amount": _money(int(order.total_cents or 0)),
                "createdAt": _ms(order.created_at),
                "items": [
                    {
                        "name": it.title_snapshot,
                        "price": _money(int(it.price_cents or 0)),
                        "count": int(it.quantity or 0),
                    }
                    for it in items
                ],
            }
            stored_content = json.dumps(snapshot, ensure_ascii=False)
            user_text_for_ai = oid
        else:
            return fail(code="BAD_REQUEST", message="unsupported messageType", status_code=400)

        now = _utcnow()
        db.session.add(
            SupportMessage(conversation_id=cid, sender_role="user", message_type=stored_type, content=stored_content)
        )
        conv.last_message_at = now
        db.session.commit()

        if conv.mode == "smart":
            if getattr(conv, "channel", "shop") == "ai_pet":
                reply = _ai_pet_reply(user_text_for_ai, conversation_id=cid, user_id=me.id)
            else:
                reply = _smart_reply(user_text_for_ai, conversation_id=cid, user_id=me.id)
            db.session.add(
                SupportMessage(conversation_id=cid, sender_role="bot", message_type="text", content=reply)
            )
            conv.last_message_at = _utcnow()
            db.session.commit()

        return ok({"ok": True})

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
