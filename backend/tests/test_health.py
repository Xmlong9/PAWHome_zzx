def test_health_ok(client):
  res = client.get("/api/v1/health")
  assert res.status_code == 200
  body = res.get_json()
  assert body["ok"] is True
  assert body["error"] is None
  assert body["data"]["status"] == "ok"

