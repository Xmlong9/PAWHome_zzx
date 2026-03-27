def test_register_conflict(client, user1_token):
    r = client.post(
        "/api/v1/auth/register",
        json={"phone": "13800000001", "password": "pass-1", "nickname": "用户1"},
    )
    assert r.status_code == 409
    body = r.get_json()
    assert body["ok"] is False
    assert body["error"]["code"] == "ALREADY_EXISTS"
    assert "已存在" in body["error"]["message"]


def test_login_password_wrong_message(client, user1_token):
    r = client.post(
        "/api/v1/auth/login/password",
        json={"account": "13800000001", "password": "wrong"},
    )
    assert r.status_code == 400
    body = r.get_json()
    assert body["error"]["code"] == "INVALID_CREDENTIALS"
    assert body["error"]["message"] == "账号或密码错误"


def test_sms_login_flow(client):
    r = client.post("/api/v1/auth/sms/send", json={"phone": "13800000003"})
    assert r.status_code == 200

    r = client.post("/api/v1/auth/login/sms", json={"phone": "13800000003", "code": "123456"})
    assert r.status_code == 200
    token = r.get_json()["data"]["token"]
    assert isinstance(token, str) and token

    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    me = r.get_json()["data"]
    assert me["id"]


def test_login_password_when_password_not_set(client):
    r = client.post("/api/v1/auth/sms/send", json={"phone": "13800000009"})
    assert r.status_code == 200

    r = client.post("/api/v1/auth/login/sms", json={"phone": "13800000009", "code": "123456"})
    assert r.status_code == 200

    r = client.post(
        "/api/v1/auth/login/password",
        json={"account": "13800000009", "password": "any"},
    )
    assert r.status_code == 400
    body = r.get_json()
    assert body["error"]["code"] == "PASSWORD_NOT_SET"
