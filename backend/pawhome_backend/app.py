from __future__ import annotations

import uuid
from typing import Any

from flask import Flask, g, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException

from pawhome_backend.common.errors import AppError
from pawhome_backend.common.responses import fail, ok
from pawhome_backend.config import get_settings
from pawhome_backend.routes.auth import bp as auth_bp
from pawhome_backend.routes.health import bp as health_bp
from pawhome_backend.routes.pets import bp as pets_bp
from pawhome_backend.routes.posts import bp as posts_bp
from pawhome_backend.routes.profiles import bp as profiles_bp
from pawhome_backend.routes.services import bp as services_bp
from pawhome_backend.routes.shop import bp as shop_bp
from pawhome_backend.routes.uploads import bp as uploads_bp
from pawhome_backend.routes.users import bp as users_bp


def create_app() -> Flask:
  s = get_settings()

  app = Flask(__name__)
  app.config["ENV"] = s.env
  app.config["DEBUG"] = s.debug

  if s.cors_origins:
    CORS(app, resources={r"/api/*": {"origins": s.cors_origins}})
  else:
    CORS(app, resources={r"/api/*": {"origins": "*"}})

  limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[s.rate_limit_default],
    storage_uri="memory://",
  )

  @app.before_request
  def _request_id() -> None:
    g.request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex

  @app.get("/")
  def root():
    return ok({"name": "pawhome-backend", "api_prefix": s.api_prefix}, request_id=g.request_id)

  api = s.api_prefix.rstrip("/")
  app.register_blueprint(auth_bp, url_prefix=api)
  app.register_blueprint(health_bp, url_prefix=api)
  app.register_blueprint(profiles_bp, url_prefix=api)
  app.register_blueprint(pets_bp, url_prefix=api)
  app.register_blueprint(posts_bp, url_prefix=api)
  app.register_blueprint(shop_bp, url_prefix=api)
  app.register_blueprint(services_bp, url_prefix=api)
  app.register_blueprint(uploads_bp, url_prefix=api)
  app.register_blueprint(users_bp, url_prefix=api)

  @app.errorhandler(AppError)
  def _handle_app_error(e: AppError):
    return fail(
      code=e.code,
      message=e.message,
      details=e.details,
      request_id=getattr(g, "request_id", None),
      status_code=e.status_code,
    )

  @app.errorhandler(HTTPException)
  def _handle_http_error(e: HTTPException):
    return fail(
      code="http_error",
      message=e.name,
      details={"description": e.description},
      request_id=getattr(g, "request_id", None),
      status_code=e.code or 500,
    )

  @app.errorhandler(Exception)
  def _handle_unknown_error(e: Exception):
    return fail(
      code="internal_error",
      message="服务器内部错误",
      details=None if not s.debug else {"type": type(e).__name__, "message": str(e)},
      request_id=getattr(g, "request_id", None),
      status_code=500,
    )

  @limiter.request_filter
  def _skip_rate_limit_for_health() -> bool:
    return request.path.rstrip("/") in {"/", f"{api}/health"}

  return app
