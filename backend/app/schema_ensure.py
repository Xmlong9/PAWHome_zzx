from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta
from urllib.parse import quote

from sqlalchemy import text

from .extensions import db
from .models import ServiceOffering, ServiceProvider, ServiceSlot, VaccineCatalog
from .pinyin import to_pinyin_full_and_initials


def _has_table(name: str) -> bool:
    r = db.session.execute(
        text("SELECT 1 FROM sqlite_master WHERE type='table' AND name=:n LIMIT 1"),
        {"n": name},
    ).first()
    return r is not None


def ensure_shop_product_pinyin_columns() -> None:
    if not _has_table("shop_products"):
        return

    cols = [r[1] for r in db.session.execute(text("PRAGMA table_info(shop_products)")).all()]
    need_pinyin = "title_pinyin" not in cols
    need_initials = "title_initials" not in cols

    if need_pinyin:
        db.session.execute(text("ALTER TABLE shop_products ADD COLUMN title_pinyin TEXT"))
    if need_initials:
        db.session.execute(text("ALTER TABLE shop_products ADD COLUMN title_initials TEXT"))
    if need_pinyin or need_initials:
        db.session.commit()

    if need_pinyin or need_initials:
        rows = db.session.execute(text("SELECT id, title FROM shop_products")).all()
        for pid, title in rows:
            full, initials = to_pinyin_full_and_initials(title or "")
            db.session.execute(
                text(
                    "UPDATE shop_products SET title_pinyin=:p, title_initials=:i WHERE id=:id"
                ),
                {"p": full, "i": initials, "id": pid},
            )
        db.session.commit()

    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_shop_products_title_pinyin ON shop_products(title_pinyin)"))
    db.session.execute(
        text("CREATE INDEX IF NOT EXISTS ix_shop_products_title_initials ON shop_products(title_initials)")
    )
    db.session.commit()


def _has_column(table: str, column: str) -> bool:
    cols = [r[1] for r in db.session.execute(text(f"PRAGMA table_info({table})")).all()]
    return column in cols


def _ensure_service_appointment_columns() -> None:
    if not _has_table("service_appointments"):
        return

    additions = [
        ("provider_id", "TEXT"),
        ("offering_id", "TEXT"),
        ("slot_id", "TEXT"),
        ("service_date", "DATE"),
        ("time_label", "TEXT"),
        ("price", "INTEGER"),
        ("snapshot_json", "TEXT"),
    ]
    changed = False
    for column, sql_type in additions:
        if not _has_column("service_appointments", column):
            db.session.execute(text(f"ALTER TABLE service_appointments ADD COLUMN {column} {sql_type}"))
            changed = True
    if changed:
        db.session.commit()

    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_service_appointments_provider_id ON service_appointments(provider_id)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_service_appointments_offering_id ON service_appointments(offering_id)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_service_appointments_slot_id ON service_appointments(slot_id)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_service_appointments_service_date ON service_appointments(service_date)"))
    db.session.commit()


def _service_seed_data() -> list[dict]:
    return [
        {
            "serviceType": "vaccine",
            "providers": [
                {
                    "id": "provider-vaccine-1",
                    "name": "友宠动物医院",
                    "description": "提供常规免疫、体检与疫苗咨询",
                    "distance": "0.8km",
                    "rating": "4.9",
                    "hours": "09:00-21:00",
                    "address": "杭州市上城区友宠路 18 号",
                    "offerings": [
                        {
                            "id": "offering-vaccine-core",
                            "name": "核心疫苗（狂犬/多联）",
                            "summary": "年度核心免疫方案",
                            "descList": ["适用年龄：2-4个月", "接种周期：每年一次"],
                            "price": 268,
                        },
                        {
                            "id": "offering-vaccine-choice",
                            "name": "选择性疫苗",
                            "summary": "按宠物体质补充接种",
                            "descList": ["适用年龄：3个月以上", "接种周期：每年一次"],
                            "price": 198,
                        },
                    ],
                },
                {
                    "id": "provider-vaccine-2",
                    "name": "安心宠物诊所",
                    "description": "社区就近接种门诊",
                    "distance": "1.3km",
                    "rating": "4.8",
                    "hours": "08:30-20:30",
                    "address": "杭州市拱墅区安心街 66 号",
                    "offerings": [
                        {
                            "id": "offering-vaccine-check",
                            "name": "疫苗前健康检查",
                            "summary": "接种前状态评估",
                            "descList": ["检查体温与基础状态", "适合首次接种宠物"],
                            "price": 66,
                        }
                    ],
                },
            ],
        },
        {
            "serviceType": "beauty",
            "providers": [
                {
                    "id": "provider-beauty-1",
                    "name": "汪喵洗护中心",
                    "description": "犬猫基础洗护与造型",
                    "distance": "0.6km",
                    "rating": "4.9",
                    "hours": "10:00-20:00",
                    "address": "杭州市西湖区喵爪路 20 号",
                    "offerings": [
                        {
                            "id": "offering-beauty-basic",
                            "name": "基础洗护",
                            "summary": "洗澡、清耳、剪指甲",
                            "descList": ["包含洗澡、剪指甲、清耳朵等", "适用：小型犬/猫"],
                            "price": 88,
                        },
                        {
                            "id": "offering-beauty-style",
                            "name": "全身造型",
                            "summary": "洗护加造型修剪",
                            "descList": ["包含洗护及全身毛发修剪", "适用：全犬种/猫"],
                            "price": 188,
                        },
                    ],
                },
                {
                    "id": "provider-beauty-2",
                    "name": "星球宠物SPA",
                    "description": "精致美容与皮毛护理",
                    "distance": "1.4km",
                    "rating": "4.7",
                    "hours": "09:30-21:00",
                    "address": "杭州市滨江区星球路 8 号",
                    "offerings": [
                        {
                            "id": "offering-beauty-care",
                            "name": "深层护理SPA",
                            "summary": "舒缓护理方案",
                            "descList": ["适合换毛季皮毛护理", "含基础精油护理"],
                            "price": 158,
                        }
                    ],
                },
            ],
        },
        {
            "serviceType": "medical",
            "providers": [
                {
                    "id": "provider-medical-1",
                    "name": "瑞康动物医院",
                    "description": "常规门诊与住院支持",
                    "distance": "0.9km",
                    "rating": "4.9",
                    "hours": "24小时",
                    "address": "杭州市余杭区瑞康街 12 号",
                    "offerings": [
                        {
                            "id": "offering-medical-internal",
                            "name": "常规内科",
                            "summary": "常见疾病诊断与治疗",
                            "descList": ["常见疾病诊断与治疗", "包含基础检查"],
                            "price": 50,
                        },
                        {
                            "id": "offering-medical-surgery",
                            "name": "外科手术",
                            "summary": "创伤处理与手术咨询",
                            "descList": ["外科创伤处理、绝育等", "需提前禁食禁水"],
                            "price": 200,
                        },
                    ],
                },
                {
                    "id": "provider-medical-2",
                    "name": "安宠专科门诊",
                    "description": "皮肤科与消化科诊疗",
                    "distance": "2.1km",
                    "rating": "4.8",
                    "hours": "09:00-19:30",
                    "address": "杭州市临平区安宠路 101 号",
                    "offerings": [
                        {
                            "id": "offering-medical-derma",
                            "name": "皮肤专科",
                            "summary": "皮肤与过敏问题诊疗",
                            "descList": ["适合反复瘙痒或皮屑问题", "包含基础显微检查"],
                            "price": 120,
                        }
                    ],
                },
            ],
        },
        {
            "serviceType": "foster",
            "providers": [
                {
                    "id": "provider-foster-1",
                    "name": "暖窝寄养中心",
                    "description": "短期寄养与日常陪护",
                    "distance": "1.1km",
                    "rating": "4.9",
                    "hours": "全天营业",
                    "address": "杭州市萧山区暖窝巷 9 号",
                    "offerings": [
                        {
                            "id": "offering-foster-standard",
                            "name": "标准舱",
                            "summary": "适合短期寄养",
                            "descList": ["适合中小型宠物，独立通风", "每日两次遛狗/逗猫"],
                            "price": 80,
                        },
                        {
                            "id": "offering-foster-suite",
                            "name": "豪华套房",
                            "summary": "大空间与专属服务",
                            "descList": ["超大空间，24小时监控", "专属管家服务"],
                            "price": 150,
                        },
                    ],
                },
                {
                    "id": "provider-foster-2",
                    "name": "安心假日宠物酒店",
                    "description": "节假日寄养与视频看护",
                    "distance": "2.4km",
                    "rating": "4.8",
                    "hours": "全天营业",
                    "address": "杭州市钱塘区假日路 188 号",
                    "offerings": [
                        {
                            "id": "offering-foster-vip",
                            "name": "VIP阳光房",
                            "summary": "大空间高频陪护",
                            "descList": ["适合长住宠物", "含每日视频播报"],
                            "price": 188,
                        }
                    ],
                },
            ],
        },
    ]


def _seed_service_booking_data() -> None:
    if ServiceProvider.query.count() > 0:
        return

    base_dates = [date.today() + timedelta(days=i) for i in range(3)]
    time_points = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]

    for service_idx, service_item in enumerate(_service_seed_data()):
        for provider_idx, provider_item in enumerate(service_item["providers"]):
            provider = ServiceProvider(
                id=provider_item["id"],
                service_type=service_item["serviceType"],
                name=provider_item["name"],
                description=provider_item["description"],
                distance_text=provider_item["distance"],
                rating_text=provider_item["rating"],
                business_hours=provider_item["hours"],
                address=provider_item["address"],
                cover_image="/assets/images/home/advertise@1x.png",
                status="active",
                sort_order=service_idx * 10 + provider_idx,
            )
            db.session.add(provider)
            db.session.flush()

            for offering_idx, offering_item in enumerate(provider_item["offerings"]):
                offering = ServiceOffering(
                    id=offering_item["id"],
                    provider_id=provider.id,
                    service_type=service_item["serviceType"],
                    name=offering_item["name"],
                    summary=offering_item["summary"],
                    description_json=json.dumps(offering_item["descList"], ensure_ascii=False),
                    price=offering_item["price"],
                    duration_minutes=60,
                    status="active",
                    sort_order=offering_idx,
                )
                db.session.add(offering)
                db.session.flush()

                for day_index, service_day in enumerate(base_dates):
                    for time_index, time_label in enumerate(time_points):
                        hour, minute = [int(part) for part in time_label.split(":")]
                        appointment_at = datetime.combine(service_day, time(hour, minute))
                        slot = ServiceSlot(
                            id=f"{offering.id}-{service_day.isoformat()}-{time_label.replace(':', '')}",
                            provider_id=provider.id,
                            offering_id=offering.id,
                            service_type=service_item["serviceType"],
                            service_date=service_day,
                            time_label=time_label,
                            appointment_at=appointment_at,
                            capacity=3,
                            reserved_count=0,
                            status="active",
                        )
                        db.session.add(slot)
    db.session.commit()


def ensure_service_booking_schema() -> None:
    db.create_all()
    _ensure_service_appointment_columns()
    _seed_service_booking_data()
    _ensure_service_provider_cover_images()


def _media_path(filename: str) -> str:
    return f"/media/{quote(filename)}"


def _ensure_service_provider_cover_images() -> None:
    if not _has_table("service_providers"):
        return

    mapping = {
        "provider-vaccine-1": _media_path("宠物医院1.jpg"),
        "provider-vaccine-2": _media_path("宠物医院2.jpg"),
        "provider-medical-1": _media_path("宠物医院1.jpg"),
        "provider-medical-2": _media_path("宠物医院2.jpg"),
        "provider-beauty-1": _media_path("门店1.jpg"),
        "provider-beauty-2": _media_path("门店2.jpg"),
        "provider-foster-1": _media_path("门店3.jpg"),
        "provider-foster-2": _media_path("门店4.jpg"),
    }
    default_placeholder = "/assets/images/home/advertise@1x.png"
    changed = False
    for pid, cover in mapping.items():
        provider = ServiceProvider.query.filter_by(id=pid).first()
        if provider is None:
            continue
        current = provider.cover_image or ""
        if (not current) or current == default_placeholder:
            provider.cover_image = cover
            changed = True
    if changed:
        db.session.commit()


def ensure_vaccine_module_schema() -> None:
    db.create_all()
    if VaccineCatalog.query.count() > 0:
        return

    items = [
        ("vax-core-rabies", "core", "狂犬疫苗", "年度加强或按方案接种", 0),
        ("vax-core-dog-4", "core", "犬四联", "犬瘟/细小/传染性肝炎/副流感", 1),
        ("vax-core-dog-8", "core", "犬八联", "按医院方案选择联苗", 2),
        ("vax-core-cat-3", "core", "猫三联", "猫瘟/鼻支/杯状", 3),
        ("vax-core-cat-4", "core", "猫四联", "猫三联 + 猫白血病", 4),
        ("vax-opt-lepto", "optional", "钩端螺旋体疫苗", "高风险环境可选", 0),
        ("vax-opt-influenza", "optional", "犬流感疫苗", "按地区与流行情况选择", 1),
        ("vax-opt-corona", "optional", "犬冠状疫苗", "按医院评估选择", 2),
        ("vax-opt-feLV", "optional", "猫白血病疫苗", "外出猫建议评估", 3),
        ("vax-opt-bordetella", "optional", "犬窝咳疫苗", "寄养/密集接触环境建议", 4),
    ]
    for vid, category, name, description, sort_order in items:
        db.session.add(
            VaccineCatalog(
                id=vid,
                category=category,
                name=name,
                description=description,
                status="active",
                sort_order=sort_order,
            )
        )
    db.session.commit()
