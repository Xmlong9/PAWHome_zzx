from __future__ import annotations

from functools import lru_cache

from flask import g
from supabase import Client, create_client

from pawhome_backend.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
  s = get_settings()
  return create_client(s.supabase_url, s.supabase_service_role_key)


def get_supabase_user() -> Client:
  s = get_settings()
  client = create_client(s.supabase_url, s.supabase_anon_key)
  token = getattr(g, "access_token", None)
  if token:
    try:
      client.postgrest.auth(token)
    except Exception:
      pass
  return client

