from __future__ import annotations

from typing import Any

from flask import Response, jsonify


def ok(data: Any = None, message: str = "ok", status_code: int = 200) -> Response:
    payload: dict[str, Any] = {"ok": True, "message": message}
    try:
        from flask import g

        rid = getattr(g, "request_id", None)
        if isinstance(rid, str) and rid:
            payload["requestId"] = rid
    except Exception:
        pass
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def fail(code: str, message: str, status_code: int, details: Any | None = None) -> Response:
    payload: dict[str, Any] = {"ok": False, "error": {"code": code, "message": message}}
    try:
        from flask import g

        rid = getattr(g, "request_id", None)
        if isinstance(rid, str) and rid:
            payload["requestId"] = rid
    except Exception:
        pass
    if details is not None:
        payload["error"]["details"] = details
    return jsonify(payload), status_code
