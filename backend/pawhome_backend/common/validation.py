from __future__ import annotations

from typing import TypeVar

from flask import request
from pydantic import BaseModel, ValidationError

from pawhome_backend.common.errors import AppError


TModel = TypeVar("TModel", bound=BaseModel)


def parse_json(model_cls: type[TModel]) -> TModel:
  payload = request.get_json(silent=True)
  if payload is None:
    raise AppError(code="bad_request", message="请求体必须为 JSON", status_code=400)
  try:
    return model_cls.model_validate(payload)
  except ValidationError as e:
    raise AppError(
      code="validation_error",
      message="参数校验失败",
      status_code=422,
      details=e.errors(include_url=False),
    ) from e

