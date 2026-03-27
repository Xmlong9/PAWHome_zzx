from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint

from pawhome_backend.common.responses import ok


bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
  return ok({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})

