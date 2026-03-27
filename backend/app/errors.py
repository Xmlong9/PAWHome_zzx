from __future__ import annotations

from typing import Any

from flask import Flask, current_app, g
from werkzeug.exceptions import HTTPException

from .responses import fail


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_exception(e: HTTPException):
        details: Any | None = None
        if getattr(e, "description", None) and isinstance(e.description, (dict, list, str)):
            details = e.description if isinstance(e.description, (dict, list)) else None
        try:
            current_app.logger.warning(
                "HTTPException",
                extra={
                    "status": e.code,
                    "code": f"HTTP_{e.code}",
                    "request_id": getattr(g, "request_id", None),
                },
            )
        except Exception:
            pass
        return fail(
            code=f"HTTP_{e.code}",
            message=e.name,
            status_code=e.code or 500,
            details=details,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e: Exception):
        try:
            current_app.logger.exception(
                "Unhandled exception",
                extra={"request_id": getattr(g, "request_id", None)},
            )
        except Exception:
            pass
        return fail(code="INTERNAL_ERROR", message="Internal Server Error", status_code=500)
