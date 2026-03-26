def test_require_auth_missing_token(client):
  res = client.get("/api/v1/users/me")
  assert res.status_code == 401
  body = res.get_json()
  assert body["ok"] is False
  assert body["error"]["code"] == "unauthorized"

