from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_request_id_in_ok_and_fail(client, user1_token):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    ok_body = r.get_json()
    assert ok_body["ok"] is True
    assert isinstance(ok_body.get("requestId"), str)

    r = client.get("/api/v1/users/me")
    assert r.status_code == 401
    fail_body = r.get_json()
    assert fail_body["ok"] is False
    assert isinstance(fail_body.get("requestId"), str)


def test_shop_recharge_option_contract(client, app, user1_token):
    from app.extensions import db
    from app.models import RechargeOption

    with app.app_context():
        RechargeOption.query.delete()
        db.session.add(
            RechargeOption(id="r_test", amount_cents=6800, bonus_cents=800, label="¥68+8", sort=0)
        )
        db.session.commit()

    r = client.get("/api/v1/shop/recharge/options", headers=_auth(user1_token))
    assert r.status_code == 200
    items = r.get_json()["data"]["list"]
    found = [x for x in items if x["id"] == "r_test"][0]
    assert found["amount"] == 68.0
    assert found["bonus"] == 8.0
    assert found["label"] == "¥68+8"

    r = client.post(
        "/api/v1/shop/recharge",
        headers=_auth(user1_token),
        json={"optionId": "r_test"},
    )
    assert r.status_code == 200
    assert r.get_json()["data"]["balance"] >= 76.0

