from __future__ import annotations

import uuid
import random
from datetime import datetime

from sqlalchemy import Index, UniqueConstraint, event

from .extensions import db


def _uuid() -> str:
    return str(uuid.uuid4())


def _public_id() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(8))


def _pinyin_full_and_initials(text: str) -> tuple[str, str]:
    if not text:
        return "", ""
    from .pinyin import to_pinyin_full_and_initials

    return to_pinyin_full_and_initials(text)


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    public_id = db.Column(db.String(8), unique=True, index=True, nullable=False, default=_public_id)
    phone = db.Column(db.String(32), unique=True, index=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    wechat_openid = db.Column(db.String(64), unique=True, index=True, nullable=True)

    nickname = db.Column(db.String(64), nullable=True)
    avatar_url = db.Column(db.String(512), nullable=True)
    location = db.Column(db.String(128), nullable=True)
    gender = db.Column(db.String(16), nullable=True)
    birthday = db.Column(db.Date, nullable=True)
    bio = db.Column(db.String(512), nullable=True)


class Session(db.Model, TimestampMixin):
    __tablename__ = "sessions"

    token = db.Column(db.String(64), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)


class SmsCode(db.Model, TimestampMixin):
    __tablename__ = "sms_codes"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    phone = db.Column(db.String(32), index=True, nullable=False)
    code = db.Column(db.String(16), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)


class UserSettings(db.Model, TimestampMixin):
    __tablename__ = "user_settings"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    notification_enabled = db.Column(db.Boolean, default=True, nullable=False)
    profile_visibility = db.Column(db.String(32), default="public", nullable=False)
    comment_permission = db.Column(db.String(32), default="all", nullable=False)


class Pet(db.Model, TimestampMixin):
    __tablename__ = "pets"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)

    name = db.Column(db.String(64), nullable=False)
    pet_type = db.Column(db.String(32), nullable=False)
    breed = db.Column(db.String(64), nullable=True)
    gender = db.Column(db.String(16), nullable=True)
    weight = db.Column(db.String(32), nullable=True)
    is_neutered = db.Column(db.Boolean, default=False, nullable=False)
    birthday = db.Column(db.Date, nullable=True)
    avatar_url = db.Column(db.String(512), nullable=True)


class ServiceProvider(db.Model, TimestampMixin):
    __tablename__ = "service_providers"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    service_type = db.Column(db.String(64), index=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(512), nullable=True)
    distance_text = db.Column(db.String(64), nullable=True)
    rating_text = db.Column(db.String(32), nullable=True)
    business_hours = db.Column(db.String(64), nullable=True)
    address = db.Column(db.String(256), nullable=True)
    cover_image = db.Column(db.String(512), nullable=True)
    status = db.Column(db.String(32), default="active", nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    __table_args__ = (
        Index("ix_service_providers_type_sort", "service_type", "sort_order"),
    )


class ServiceOffering(db.Model, TimestampMixin):
    __tablename__ = "service_offerings"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    provider_id = db.Column(db.String(36), db.ForeignKey("service_providers.id"), index=True, nullable=False)
    service_type = db.Column(db.String(64), index=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    summary = db.Column(db.String(256), nullable=True)
    description_json = db.Column(db.Text, nullable=True)
    price = db.Column(db.Integer, default=0, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60, nullable=False)
    status = db.Column(db.String(32), default="active", nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    __table_args__ = (
        Index("ix_service_offerings_provider_sort", "provider_id", "sort_order"),
    )


class ServiceSlot(db.Model, TimestampMixin):
    __tablename__ = "service_slots"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    provider_id = db.Column(db.String(36), db.ForeignKey("service_providers.id"), index=True, nullable=False)
    offering_id = db.Column(db.String(36), db.ForeignKey("service_offerings.id"), index=True, nullable=False)
    service_type = db.Column(db.String(64), index=True, nullable=False)
    service_date = db.Column(db.Date, index=True, nullable=False)
    time_label = db.Column(db.String(32), nullable=False)
    appointment_at = db.Column(db.DateTime, index=True, nullable=False)
    capacity = db.Column(db.Integer, default=1, nullable=False)
    reserved_count = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(db.String(32), default="active", nullable=False)

    __table_args__ = (
        UniqueConstraint("offering_id", "service_date", "time_label", name="uq_service_slots_offering_date_time"),
        Index("ix_service_slots_offering_date", "offering_id", "service_date"),
    )


class ServiceAppointment(db.Model, TimestampMixin):
    __tablename__ = "service_appointments"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    pet_id = db.Column(db.String(36), db.ForeignKey("pets.id"), index=True, nullable=True)
    provider_id = db.Column(db.String(36), db.ForeignKey("service_providers.id"), index=True, nullable=True)
    offering_id = db.Column(db.String(36), db.ForeignKey("service_offerings.id"), index=True, nullable=True)
    slot_id = db.Column(db.String(36), db.ForeignKey("service_slots.id"), index=True, nullable=True)

    service_type = db.Column(db.String(64), nullable=False)
    service_date = db.Column(db.Date, index=True, nullable=True)
    time_label = db.Column(db.String(32), nullable=True)
    appointment_at = db.Column(db.DateTime, index=True, nullable=False)
    price = db.Column(db.Integer, nullable=True)
    contact_phone = db.Column(db.String(32), nullable=True)
    address = db.Column(db.String(256), nullable=True)
    notes = db.Column(db.String(512), nullable=True)
    snapshot_json = db.Column(db.Text, nullable=True)

    status = db.Column(db.String(32), default="scheduled", nullable=False)

    __table_args__ = (
        Index("ix_service_appointments_user_appt", "user_id", "appointment_at"),
    )


class Follow(db.Model, TimestampMixin):
    __tablename__ = "follows"

    follower_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    followee_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)


class Post(db.Model, TimestampMixin):
    __tablename__ = "posts"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    author_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)

    content = db.Column(db.Text, nullable=False)
    media_json = db.Column(db.Text, nullable=True)
    location_name = db.Column(db.String(128), nullable=True)
    visibility = db.Column(db.String(32), default="public", nullable=False)
    post_type = db.Column(db.String(32), default="all", nullable=False)

    like_count = db.Column(db.Integer, default=0, nullable=False)
    favorite_count = db.Column(db.Integer, default=0, nullable=False)
    comment_count = db.Column(db.Integer, default=0, nullable=False)


class PostLike(db.Model, TimestampMixin):
    __tablename__ = "post_likes"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), primary_key=True)


class PostFavorite(db.Model, TimestampMixin):
    __tablename__ = "post_favorites"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), primary_key=True)


class PostHistory(db.Model, TimestampMixin):
    __tablename__ = "post_history"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), primary_key=True)
    last_viewed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class PostPin(db.Model, TimestampMixin):
    __tablename__ = "post_pins"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), primary_key=True)


class Comment(db.Model, TimestampMixin):
    __tablename__ = "comments"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), index=True, nullable=False)
    author_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    parent_id = db.Column(db.String(36), db.ForeignKey("comments.id"), index=True, nullable=True)

    content = db.Column(db.Text, nullable=False)
    like_count = db.Column(db.Integer, default=0, nullable=False)


class CommentLike(db.Model, TimestampMixin):
    __tablename__ = "comment_likes"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    comment_id = db.Column(db.String(36), db.ForeignKey("comments.id"), primary_key=True)


class CommentPin(db.Model, TimestampMixin):
    __tablename__ = "comment_pins"

    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), primary_key=True)
    comment_id = db.Column(db.String(36), db.ForeignKey("comments.id"), nullable=False, unique=True)


class Notification(db.Model, TimestampMixin):
    __tablename__ = "notifications"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    actor_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=True)
    notif_type = db.Column(db.String(32), index=True, nullable=False)

    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), index=True, nullable=True)
    comment_id = db.Column(db.String(36), db.ForeignKey("comments.id"), index=True, nullable=True)
    text = db.Column(db.String(256), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)


class Banner(db.Model, TimestampMixin):
    __tablename__ = "banners"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    slot = db.Column(db.String(64), index=True, nullable=False)
    title = db.Column(db.String(128), nullable=True)
    image_url = db.Column(db.String(512), nullable=False)
    link_url = db.Column(db.String(512), nullable=True)
    sort = db.Column(db.Integer, default=0, nullable=False)


class ShopProduct(db.Model, TimestampMixin):
    __tablename__ = "shop_products"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    title = db.Column(db.String(128), nullable=False)
    title_pinyin = db.Column(db.String(512), index=True, nullable=True)
    title_initials = db.Column(db.String(256), index=True, nullable=True)
    description = db.Column(db.Text, nullable=True)
    price_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(8), default="CNY", nullable=False)
    images_json = db.Column(db.Text, nullable=True)
    stock = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)


@event.listens_for(ShopProduct, "before_insert")
def _shop_product_before_insert(mapper, connection, target):
    full, initials = _pinyin_full_and_initials(getattr(target, "title", "") or "")
    if full:
        target.title_pinyin = full
    if initials:
        target.title_initials = initials


@event.listens_for(ShopProduct, "before_update")
def _shop_product_before_update(mapper, connection, target):
    full, initials = _pinyin_full_and_initials(getattr(target, "title", "") or "")
    if full:
        target.title_pinyin = full
    if initials:
        target.title_initials = initials


class ShopFavorite(db.Model, TimestampMixin):
    __tablename__ = "shop_favorites"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    product_id = db.Column(db.String(36), db.ForeignKey("shop_products.id"), primary_key=True)


class CartItem(db.Model, TimestampMixin):
    __tablename__ = "cart_items"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    product_id = db.Column(db.String(36), db.ForeignKey("shop_products.id"), primary_key=True)

    quantity = db.Column(db.Integer, default=1, nullable=False)
    checked = db.Column(db.Boolean, default=True, nullable=False)
    variant_json = db.Column(db.Text, nullable=True)
    is_valid = db.Column(db.Boolean, default=True, nullable=False)


class Address(db.Model, TimestampMixin):
    __tablename__ = "addresses"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)

    receiver_name = db.Column(db.String(64), nullable=False)
    phone = db.Column(db.String(32), nullable=False)
    province = db.Column(db.String(64), nullable=True)
    city = db.Column(db.String(64), nullable=True)
    district = db.Column(db.String(64), nullable=True)
    address_line = db.Column(db.String(256), nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False)

    __table_args__ = (
        Index(
            "ix_addresses_user_default_true",
            "user_id",
            unique=True,
            sqlite_where=(is_default.is_(True)),
        ),
    )


class Wallet(db.Model, TimestampMixin):
    __tablename__ = "wallets"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    balance_cents = db.Column(db.Integer, default=0, nullable=False)


class RechargeOption(db.Model, TimestampMixin):
    __tablename__ = "recharge_options"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    amount_cents = db.Column(db.Integer, nullable=False)
    bonus_cents = db.Column(db.Integer, default=0, nullable=False)
    label = db.Column(db.String(64), nullable=True)
    sort = db.Column(db.Integer, default=0, nullable=False)


class CustomerServiceFaq(db.Model, TimestampMixin):
    __tablename__ = "customer_service_faqs"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    question = db.Column(db.String(256), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    sort = db.Column(db.Integer, default=0, nullable=False)


class SupportConversation(db.Model, TimestampMixin):
    __tablename__ = "support_conversations"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    channel = db.Column(db.String(32), default="shop", nullable=False)
    mode = db.Column(db.String(16), default="smart", nullable=False)
    status = db.Column(db.String(16), default="open", nullable=False)
    last_message_at = db.Column(db.DateTime, nullable=True)


class SupportMessage(db.Model, TimestampMixin):
    __tablename__ = "support_messages"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    conversation_id = db.Column(
        db.String(36), db.ForeignKey("support_conversations.id"), index=True, nullable=False
    )
    sender_role = db.Column(db.String(16), default="user", nullable=False)
    message_type = db.Column(db.String(16), default="text", nullable=False)
    content = db.Column(db.Text, nullable=False)

    __table_args__ = (
        Index("ix_support_messages_conv_created", "conversation_id", "created_at"),
    )


class ShopOrder(db.Model, TimestampMixin):
    __tablename__ = "shop_orders"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)

    status = db.Column(db.String(32), default="pending_pay", nullable=False)
    pay_method = db.Column(db.String(32), nullable=True)

    subtotal_cents = db.Column(db.Integer, default=0, nullable=False)
    shipping_cents = db.Column(db.Integer, default=0, nullable=False)
    discount_cents = db.Column(db.Integer, default=0, nullable=False)
    total_cents = db.Column(db.Integer, default=0, nullable=False)

    receiver_name = db.Column(db.String(64), nullable=True)
    receiver_phone = db.Column(db.String(32), nullable=True)
    receiver_address = db.Column(db.String(256), nullable=True)


class ShopOrderItem(db.Model, TimestampMixin):
    __tablename__ = "shop_order_items"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    order_id = db.Column(db.String(36), db.ForeignKey("shop_orders.id"), index=True, nullable=False)
    product_id = db.Column(db.String(36), db.ForeignKey("shop_products.id"), index=True, nullable=False)

    title_snapshot = db.Column(db.String(128), nullable=False)
    price_cents = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    variant_json = db.Column(db.Text, nullable=True)


class ShopOrderEvent(db.Model, TimestampMixin):
    __tablename__ = "shop_order_events"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    order_id = db.Column(db.String(36), db.ForeignKey("shop_orders.id"), index=True, nullable=False)
    event_type = db.Column(db.String(32), index=True, nullable=False)
    at = db.Column(db.DateTime, nullable=False)
    message = db.Column(db.String(256), nullable=True)

    __table_args__ = (
        Index("ix_shop_order_events_order_at", "order_id", "at"),
    )


class IMConversation(db.Model, TimestampMixin):
    __tablename__ = "im_conversations"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_a_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    user_b_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    last_message_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_a_id", "user_b_id", name="uq_conversation_pair"),
    )


class IMConversationRead(db.Model, TimestampMixin):
    __tablename__ = "im_conversation_reads"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    conversation_id = db.Column(
        db.String(36), db.ForeignKey("im_conversations.id"), index=True, nullable=False
    )
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    last_read_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_im_conversation_read"),
        Index("ix_im_conversation_reads_conv_user", "conversation_id", "user_id"),
    )


class IMMessage(db.Model, TimestampMixin):
    __tablename__ = "im_messages"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    conversation_id = db.Column(
        db.String(36), db.ForeignKey("im_conversations.id"), index=True, nullable=False
    )
    sender_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True, nullable=False)
    message_type = db.Column(db.String(32), default="text", nullable=False)
    content = db.Column(db.Text, nullable=False)
