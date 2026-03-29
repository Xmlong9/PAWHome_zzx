import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import Banner, CustomerServiceFaq, RechargeOption, ShopProduct


def main() -> None:
    app = create_app()
    with app.app_context():
        db.create_all()

        if ShopProduct.query.count() == 0:
            products = [
                {
                    "id": "p1",
                    "title": "冻干鸡肉猫粮",
                    "description": "高蛋白低敏，适合挑食猫咪",
                    "price_cents": 6990,
                    "images": ["/assets/images/shop/商品1.jpg"],
                },
                {
                    "id": "p2",
                    "title": "益生菌猫条礼盒",
                    "description": "肠胃友好，适口性强",
                    "price_cents": 3990,
                    "images": ["/assets/images/shop/商品2.jpg"],
                },
                {
                    "id": "p3",
                    "title": "云朵猫砂 6L",
                    "description": "低尘结团快，除味更持久",
                    "price_cents": 2990,
                    "images": ["/assets/images/shop/商品3.jpg"],
                },
                {
                    "id": "p4",
                    "title": "宠物航空箱",
                    "description": "轻便耐用，出行更安心",
                    "price_cents": 12900,
                    "images": ["/assets/images/shop/商品4.jpg"],
                },
            ]
            for p in products:
                db.session.add(
                    ShopProduct(
                        id=p["id"],
                        title=p["title"],
                        description=p["description"],
                        price_cents=p["price_cents"],
                        images_json=json.dumps(p["images"]),
                        stock=999,
                        is_active=True,
                    )
                )

        options = [
            ("r1", 3000, 0, "¥30"),
            ("r2", 6800, 800, "¥68"),
            ("r3", 12800, 2000, "¥128"),
            ("r4", 32800, 6800, "¥328"),
        ]
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
            else:
                row.amount_cents = amount_cents
                row.bonus_cents = bonus_cents
                row.label = label
                row.sort = i

        if CustomerServiceFaq.query.count() == 0:
            faqs = [
                ("f1", "如何退款？", "订单未发货可在订单页申请取消。"),
                ("f2", "如何联系人工客服？", "客服页点击“转人工”并拨打电话。"),
            ]
            for i, (fid, q, a) in enumerate(faqs):
                db.session.add(CustomerServiceFaq(id=fid, question=q, answer=a, sort=i))

        if Banner.query.count() == 0:
            banners = [
                ("b1", "home_promo", "/assets/images/shop/banner.jpg", "限时促销"),
            ]
            for i, (bid, slot, image_url, title) in enumerate(banners):
                db.session.add(Banner(id=bid, slot=slot, image_url=image_url, title=title, sort=i))

        db.session.commit()

    print("seed ok")


if __name__ == "__main__":
    main()
