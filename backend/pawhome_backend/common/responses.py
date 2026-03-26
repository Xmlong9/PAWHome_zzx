from __future__ import annotations

from typing import Any

from flask import Response, jsonify


def ok(data: Any = None, *, request_id: str | None = None, status_code: int = 200) -> Response:
  payload: dict[str, Any] = {"ok": True, "data": data, "error": None}
  if request_id:
    payload["request_id"] = request_id
  res = jsonify(payload)
  res.status_code = status_code
  return res


def fail(
  *,
  code: str,
  message: str,
  details: Any = None,
  request_id: str | None = None,
  status_code: int = 400,
) -> Response:
  payload: dict[str, Any] = {
    "ok": False,
    "data": None,
    "error": {"code": code, "message": message, "details": details},
  }
  if request_id:
    payload["request_id"] = request_id
  res = jsonify(payload)
  res.status_code = status_code
  return res
