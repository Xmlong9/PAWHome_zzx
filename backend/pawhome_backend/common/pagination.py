from __future__ import annotations

from dataclasses import dataclass


def _maybe_int(value: str | None) -> int | None:
  if value is None:
    return None
  try:
    return int(value)
  except Exception:
    return None


@dataclass(frozen=True)
class Page:
  page: int
  page_size: int
  start: int
  end: int


def to_range(page: int | None, page_size: int | None, *, max_page_size: int = 50) -> Page:
  p = int(page or 1)
  ps = int(page_size or 10)
  if p < 1:
    p = 1
  if ps < 1:
    ps = 1
  if ps > max_page_size:
    ps = max_page_size
  start = (p - 1) * ps
  end = start + ps - 1
  return Page(page=p, page_size=ps, start=start, end=end)


def to_range_query(page: str | None, page_size: str | None, *, max_page_size: int = 50) -> Page:
  return to_range(_maybe_int(page), _maybe_int(page_size), max_page_size=max_page_size)
