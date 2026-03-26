from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AppError(Exception):
  code: str
  message: str
  status_code: int = 400
  details: object | None = None

