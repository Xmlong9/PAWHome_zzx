import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.extensions import db
from app.models import ShopProduct


def to_cents(amount: float) -> int:
    return int(round(float(amount) * 100))


def main():
    app = create_app()
    with app.app_context():
        db.create_all()

        new_desc = "甄选高蛋白原料，低敏易吸收；适口性佳，满足日常营养与能量需求。"
        changed = (
            ShopProduct.query.filter(ShopProduct.description == "seed")
            .update({ShopProduct.description: new_desc})
        )

        products = [
            {
                "title": "益生菌猫条礼盒",
                "description": "添加益生菌与多种维生素，帮助呵护肠胃；独立小袋更方便，喂食不脏手。",
                "price": 39.9,
                "images": ["/assets/images/shop/商品2.jpg"],
                "stock": 500,
            },
            {
                "title": "云朵猫砂 6L",
                "description": "低尘配方，结团更快更紧实；除味持久，铲屎更省心。",
                "price": 29.9,
                "images": ["/assets/images/shop/商品3.jpg"],
                "stock": 1200,
            },
            {
                "title": "猫咪逗猫棒套装",
                "description": "耐咬材质与多款替换头，陪玩更持久；日常互动消耗精力，快乐加倍。",
                "price": 19.9,
                "images": ["/assets/images/shop/商品4.jpg"],
                "stock": 800,
            },
        ]

        inserted = 0
        for p in products:
            exists = ShopProduct.query.filter_by(title=p["title"]).first()
            if exists is not None:
                continue
            db.session.add(
                ShopProduct(
                    title=p["title"],
                    description=p["description"],
                    price_cents=to_cents(p["price"]),
                    currency="CNY",
                    images_json=json.dumps(p["images"], ensure_ascii=False),
                    stock=int(p["stock"]),
                    is_active=True,
                )
            )
            inserted += 1

        db.session.commit()
        return {"updated_seed_count": int(changed or 0), "inserted": inserted, "seed_description": new_desc}


if __name__ == "__main__":
    out = main()
    print(json.dumps(out, ensure_ascii=False))
