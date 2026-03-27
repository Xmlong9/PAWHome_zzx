from __future__ import annotations

from datetime import datetime, timedelta

from flask import request
from werkzeug.security import check_password_hash, generate_password_hash

from ...auth import create_session, revoke_session, require_auth
from ...extensions import db
from ...models import SmsCode, User, UserSettings, Wallet
from ...responses import fail, ok


def _json() -> dict:
    return request.get_json(silent=True) or {}


def _require_str(data: dict, key: str):
    v = data.get(key)
    if not isinstance(v, str) or not v.strip():
        return None
    return v.strip()


def register_routes(bp) -> None:
    @bp.post("/auth/sms/send")
    def send_sms():
        data = _json()
        phone = _require_str(data, "phone")
        if phone is None:
            return fail(code="BAD_REQUEST", message="phone required", status_code=400)
        code = "123456"
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        db.session.add(SmsCode(phone=phone, code=code, expires_at=expires_at))
        db.session.commit()
        return ok({"ok": True})

    @bp.post("/auth/login/sms")
    def login_sms():
        data = _json()
        phone = _require_str(data, "phone")
        code = _require_str(data, "code")
        if phone is None or code is None:
            return fail(code="BAD_REQUEST", message="phone/code required", status_code=400)

        row = (
            SmsCode.query.filter_by(phone=phone, code=code)
            .order_by(SmsCode.created_at.desc())
            .first()
        )
        if row is None or row.expires_at <= datetime.utcnow():
            return fail(code="INVALID_CODE", message="Invalid code", status_code=400)

        user = User.query.filter_by(phone=phone).first()
        if user is None:
            user = User(phone=phone)
            db.session.add(user)
            db.session.flush()
            db.session.add(UserSettings(user_id=user.id))
            db.session.add(Wallet(user_id=user.id))
            db.session.commit()

        token = create_session(user.id)
        return ok({"token": token})

    @bp.post("/auth/login/password")
    def login_password():
        data = _json()
        account = _require_str(data, "account")
        password = _require_str(data, "password")
        if account is None or password is None:
            return fail(code="BAD_REQUEST", message="account/password required", status_code=400)

        user = User.query.filter_by(phone=account).first()
        if user is None:
            return fail(code="INVALID_CREDENTIALS", message="账号或密码错误", status_code=400)
        if not user.password_hash:
            return fail(code="PASSWORD_NOT_SET", message="该账号未设置密码，请使用验证码登录", status_code=400)
        if not check_password_hash(user.password_hash, password):
            return fail(code="INVALID_CREDENTIALS", message="账号或密码错误", status_code=400)

        token = create_session(user.id)
        return ok({"token": token})

    @bp.post("/auth/register")
    def register_user():
        data = _json()
        phone = _require_str(data, "phone")
        password = _require_str(data, "password")
        nickname = _require_str(data, "nickname")
        if phone is None or password is None:
            return fail(code="BAD_REQUEST", message="phone/password required", status_code=400)
        if User.query.filter_by(phone=phone).first() is not None:
            return fail(code="ALREADY_EXISTS", message="用户已存在，请直接登录", status_code=409)
        user = User(phone=phone, password_hash=generate_password_hash(password, method="pbkdf2:sha256"))
        if nickname is not None:
            user.nickname = nickname
        db.session.add(user)
        db.session.flush()
        db.session.add(UserSettings(user_id=user.id))
        db.session.add(Wallet(user_id=user.id))
        db.session.commit()
        token = create_session(user.id)
        return ok({"token": token})

    @bp.post("/auth/code2session")
    def code2session():
        data = _json()
        code = _require_str(data, "code")
        if code is None:
            return fail(code="BAD_REQUEST", message="code required", status_code=400)
        openid = f"wx_{code}"
        user = User.query.filter_by(wechat_openid=openid).first()
        if user is None:
            user = User(wechat_openid=openid)
            db.session.add(user)
            db.session.flush()
            db.session.add(UserSettings(user_id=user.id))
            db.session.add(Wallet(user_id=user.id))
            db.session.commit()
        token = create_session(user.id)
        return ok({"token": token, "openid": openid})

    @bp.post("/auth/logout")
    @require_auth
    def logout():
        token = getattr(request, "headers").get("Authorization") or ""
        if token.startswith("Bearer "):
            revoke_session(token.removeprefix("Bearer ").strip())
        return ok({"ok": True})
