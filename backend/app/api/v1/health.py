from flask import current_app

from ...responses import ok
from . import api_v1_bp


@api_v1_bp.get("/health")
def health_check():
    return ok(
        {
            "status": "ok",
            "env": current_app.config.get("ENV"),
        }
    )

