from __future__ import annotations

import os
from dataclasses import dataclass


def _default_sqlite_uri() -> str:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    instance_dir = os.path.join(base_dir, "instance")
    os.makedirs(instance_dir, exist_ok=True)
    return f"sqlite:///{os.path.join(instance_dir, 'app.db')}"


@dataclass(frozen=True)
class BaseConfig:
    ENV: str = os.getenv("FLASK_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret")

    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", _default_sqlite_uri())
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    JSON_SORT_KEYS: bool = False


@dataclass(frozen=True)
class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True


@dataclass(frozen=True)
class ProductionConfig(BaseConfig):
    DEBUG: bool = False


def get_config(name: str | None) -> type[BaseConfig]:
    key = (name or os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development").lower()
    if key in {"prod", "production"}:
        return ProductionConfig
    return DevelopmentConfig

