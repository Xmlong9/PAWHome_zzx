import os
import sys
from pathlib import Path

import pytest


@pytest.fixture(scope="session")
def app():
  backend_root = str(Path(__file__).resolve().parents[1])
  if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

  os.environ.setdefault("APP_ENV", "test")
  os.environ.setdefault("FLASK_DEBUG", "0")
  os.environ.setdefault("API_PREFIX", "/api/v1")
  os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
  os.environ.setdefault("SUPABASE_ANON_KEY", "anon_test_key")
  os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service_role_test_key")

  from pawhome_backend.app import create_app

  app = create_app()
  app.config.update(TESTING=True)
  return app


@pytest.fixture()
def client(app):
  return app.test_client()
