from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


def _split_csv(value: str | None) -> list[str]:
  if not value:
    return []
  return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
  env: str
  debug: bool
  api_prefix: str
  cors_origins: list[str]
  rate_limit_default: str
  supabase_url: str
  supabase_anon_key: str
  supabase_service_role_key: str


def get_settings() -> Settings:
  env = os.getenv("APP_ENV", "dev")
  debug = os.getenv("FLASK_DEBUG", "0") == "1" or env == "dev"
  api_prefix = os.getenv("API_PREFIX", "/api/v1")
  cors_origins = _split_csv(os.getenv("CORS_ORIGINS"))
  rate_limit_default = os.getenv("RATE_LIMIT_DEFAULT", "200 per hour")

  supabase_url = os.getenv("SUPABASE_URL", "").strip()
  supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
  supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

  if not supabase_url:
    raise RuntimeError("Missing env: SUPABASE_URL")
  if not supabase_anon_key:
    raise RuntimeError("Missing env: SUPABASE_ANON_KEY")
  if not supabase_service_role_key:
    raise RuntimeError("Missing env: SUPABASE_SERVICE_ROLE_KEY")

  return Settings(
    env=env,
    debug=debug,
    api_prefix=api_prefix,
    cors_origins=cors_origins,
    rate_limit_default=rate_limit_default,
    supabase_url=supabase_url,
    supabase_anon_key=supabase_anon_key,
    supabase_service_role_key=supabase_service_role_key,
  )

