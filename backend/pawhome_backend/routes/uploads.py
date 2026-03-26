from __future__ import annotations

import mimetypes
import os
import uuid

from storage3.types import FileOptions

from flask import Blueprint, g, request

from pawhome_backend.common.auth import require_auth
from pawhome_backend.common.errors import AppError
from pawhome_backend.common.responses import ok
from pawhome_backend.config import get_settings
from pawhome_backend.integrations.supabase_client import get_supabase_admin


bp = Blueprint("uploads", __name__)


@bp.post("/uploads")
@require_auth
def upload_file():
  if "file" not in request.files:
    raise AppError(code="bad_request", message="缺少 file", status_code=400)

  f = request.files["file"]
  if not f or not f.filename:
    raise AppError(code="bad_request", message="空文件", status_code=400)

  bucket = request.form.get("bucket", "media")
  folder = request.form.get("folder", "uploads")
  filename = os.path.basename(f.filename)
  ext = os.path.splitext(filename)[1]
  key = f"{folder}/{g.user_id}/{uuid.uuid4().hex}{ext}"

  content_type = f.mimetype or mimetypes.guess_type(filename)[0] or "application/octet-stream"
  data = f.read()

  admin = get_supabase_admin()
  options: FileOptions = {"content-type": content_type, "x-upsert": "false"}
  try:
    admin.storage.from_(bucket).upload(key, data, options)
  except Exception as e:
    print(
      f"[uploads.upload_file] request_id={getattr(g, 'request_id', None)} user_id={getattr(g, 'user_id', None)} bucket={bucket} path={key} content_type={content_type} bytes={len(data)} error_type={type(e).__name__} error={e}"
    )
    raise AppError(
      code="upload_failed",
      message=str(e) or "上传失败",
      status_code=500,
      details={
        "bucket": bucket,
        "path": key,
        "content_type": content_type,
        "bytes": len(data),
        "type": type(e).__name__,
      },
    ) from e

  s = get_settings()
  public_url = f"{s.supabase_url}/storage/v1/object/public/{bucket}/{key}"
  return ok({"bucket": bucket, "path": key, "publicUrl": public_url}, status_code=201)
