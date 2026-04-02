from __future__ import annotations

import os
import uuid

from dotenv import load_dotenv
from flask import Flask, g, request, send_from_directory

from .api.v1 import api_v1_bp
from .config import get_config
from .errors import register_error_handlers
from .extensions import db
from .schema_ensure import (
    ensure_ai_page_banners,
    ensure_service_booking_schema,
    ensure_shop_product_pinyin_columns,
    ensure_vaccine_module_schema,
)


def _truthy_env(name: str) -> bool | None:
    v = os.getenv(name)
    if v is None:
        return None
    s = str(v).strip().lower()
    if s in {"1", "true", "yes", "y", "on"}:
        return True
    if s in {"0", "false", "no", "n", "off"}:
        return False
    return None


def _should_auto_init_db(app: Flask) -> bool:
    flag = _truthy_env("PAWHOME_DB_AUTO_INIT")
    if flag is not None:
        return flag
    uri = str(app.config.get("SQLALCHEMY_DATABASE_URI") or "")
    if uri.startswith("sqlite:///"):
        path = uri.replace("sqlite:///", "", 1)
        try:
            return not (os.path.exists(path) and os.path.getsize(path) > 0)
        except OSError:
            return True
    return True


def create_app(config_name: str | None = None) -> Flask:
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"), override=False)

    app = Flask(__name__, instance_relative_config=True)
    cfg = get_config(config_name)
    app.config.from_object(cfg)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    register_error_handlers(app)

    with app.app_context():
        if _should_auto_init_db(app):
            db.create_all()
            ensure_shop_product_pinyin_columns()
            ensure_service_booking_schema()
            ensure_vaccine_module_schema()
            ensure_ai_page_banners()

    @app.before_request
    def _attach_request_id():
        rid = request.headers.get("X-Request-ID")
        if not isinstance(rid, str) or not rid.strip():
            rid = uuid.uuid4().hex
        g.request_id = rid

    @app.after_request
    def _set_request_id_header(resp):
        rid = getattr(g, "request_id", None)
        if isinstance(rid, str) and rid:
            resp.headers["X-Request-ID"] = rid
        return resp

    app.register_blueprint(api_v1_bp)

    @app.get("/media/<path:filename>")
    def media(filename: str):
        upload_dir = os.path.join(app.instance_path, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        return send_from_directory(upload_dir, filename)

    @app.get("/assets/images/shop/<path:filename>")
    def shop_assets(filename: str):
        assets_dir = os.path.abspath(
            os.path.join(app.root_path, "..", "..", "PawHome", "miniprogram", "assets", "images", "shop")
        )
        return send_from_directory(assets_dir, filename)

    @app.before_request
    def _ensure_instance_upload_dir():
        os.makedirs(os.path.join(app.instance_path, "uploads"), exist_ok=True)

    return app
