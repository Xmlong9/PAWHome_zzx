from __future__ import annotations

import os
import uuid
from typing import Final

from flask import g, request
from flask import current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ...auth import require_auth
from ...responses import fail, ok


_ALLOWED_MIME: Final[dict[str, str]] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
}


def _save_upload(file: FileStorage, upload_dir: str) -> str:
    filename = secure_filename(file.filename or "")
    _, ext = os.path.splitext(filename)
    ext = ext.lower().strip()
    if ext and ext.startswith("."):
        ext = ext
    else:
        ext = ""

    mime = (file.mimetype or "").lower().strip()
    mapped_ext = _ALLOWED_MIME.get(mime)
    if mapped_ext is None:
        raise ValueError("unsupported file type")

    final_ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov") else mapped_ext
    if final_ext == ".jpeg":
        final_ext = ".jpg"

    os.makedirs(upload_dir, exist_ok=True)
    final_name = f"{uuid.uuid4().hex}{final_ext}"
    path = os.path.join(upload_dir, final_name)
    file.save(path)
    return final_name


def register_routes(bp) -> None:
    @bp.post("/uploads")
    @require_auth
    def upload():
        _ = g.current_user
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
