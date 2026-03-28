from __future__ import annotations

from datetime import datetime, timedelta, timezone

BJ_TZ = timezone(timedelta(hours=8), name="Asia/Shanghai")


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def dt_to_bj(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return _as_utc(dt).astimezone(BJ_TZ)


def dt_to_bj_iso(dt: datetime | None) -> str | None:
    v = dt_to_bj(dt)
    if v is None:
        return None
    return v.isoformat(timespec="seconds")


def dt_to_bj_ms(dt: datetime | None) -> int:
    v = dt_to_bj(dt)
    if v is None:
        return 0
    return int(v.timestamp() * 1000)

