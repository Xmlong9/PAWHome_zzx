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

        if RechargeOption.query.count() == 0:
            options = [
                ("r1", 1000, "¥10"),
                ("r2", 3000, "¥30"),
                ("r3", 5000, "¥50"),
                ("r4", 10000, "¥100"),
            ]
            for i, (oid, cents, label) in enumerate(options):
                db.session.add(RechargeOption(id=oid, amount_cents=cents, bonus_cents=0, label=label, sort=i))

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
