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


def create_app(config_name: str | None = None) -> Flask:
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"), override=False)

    app = Flask(__name__, instance_relative_config=True)
    cfg = get_config(config_name)
    app.config.from_object(cfg)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    register_error_handlers(app)

    with app.app_context():
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

    @app.before_request
    def _ensure_instance_upload_dir():
        os.makedirs(os.path.join(app.instance_path, "uploads"), exist_ok=True)

    return app
