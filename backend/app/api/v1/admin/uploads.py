from __future__ import annotations

import os
from flask import request, current_app
from werkzeug.datastructures import FileStorage

from ....responses import fail, ok
from .auth import admin_required
from ..uploads import _save_upload

def register_admin_upload_routes(bp):
    @bp.post("/admin/uploads")
    @admin_required
    def admin_upload():
        file = request.files.get("file")
        if not isinstance(file, FileStorage):
            return fail(code="BAD_REQUEST", message="file required", status_code=400)

        upload_dir = os.path.join(current_app.instance_path, "uploads")
        try:
            name = _save_upload(file, upload_dir)
        except ValueError as e:
            return fail(code="BAD_REQUEST", message=str(e), status_code=400)

        base = request.host_url.rstrip("/")
        return ok({"url": f"{base}/media/{name}"}, status_code=201)
