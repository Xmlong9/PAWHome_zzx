from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_appointments_unauthorized(client):
    r = client.get("/api/v1/services/appointments")
    assert r.status_code == 401
    body = r.get_json()
    assert body["ok"] is False
    assert body["error"]["code"] == "UNAUTHORIZED"
    assert isinstance(body.get("requestId"), str)


def test_appointments_crud_flow(client, app, user1_token):
    from app.models import Pet

    headers = _auth(user1_token)

    r = client.post(
        "/api/v1/users/me/pets",
        headers=headers,
        json={
            "name": "小黑",
            "avatarUrl": "",
            "type": "猫",
            "breed": "",
            "gender": "帅哥",
            "weight": "3kg",
            "isSterilized": "否",
            "birthday": "2022-05-20",
        },
    )
    assert r.status_code == 200
    pet_id = r.get_json()["data"]["data"]["id"]
    assert pet_id

    r = client.post(
        "/api/v1/services/appointments",
        headers=headers,
        json={"appointmentAt": "2026-01-01T10:00:00+08:00"},
    )
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "BAD_REQUEST"

    r = client.post(
        "/api/v1/services/appointments",
        headers=headers,
        json={
            "serviceType": "疫苗",
            "appointmentAt": "2026-01-01T10:00:00+08:00",
            "petId": pet_id,
            "contactPhone": "13800000000",
            "address": "杭州",
            "notes": "备注",
        },
    )
    assert r.status_code == 201
    created = r.get_json()["data"]
    assert created["status"] == "scheduled"
    appt_id = created["id"]

    r = client.get("/api/v1/services/appointments", headers=headers)
    assert r.status_code == 200
    payload = r.get_json()["data"]
    assert payload["total"] == 1
    assert payload["list"][0]["id"] == appt_id

    r = client.get(f"/api/v1/services/appointments/{appt_id}", headers=headers)
    assert r.status_code == 200
    assert r.get_json()["data"]["id"] == appt_id

    r = client.put(
        f"/api/v1/services/appointments/{appt_id}",
        headers=headers,
        json={"notes": "更新备注"},
    )
    assert r.status_code == 200
    assert r.get_json()["data"]["notes"] == "更新备注"

    r = client.post(f"/api/v1/services/appointments/{appt_id}/cancel", headers=headers)
    assert r.status_code == 200
    assert r.get_json()["data"]["ok"] is True

    r = client.post(f"/api/v1/services/appointments/{appt_id}/cancel", headers=headers)
    assert r.status_code == 200

    r = client.put(
        f"/api/v1/services/appointments/{appt_id}",
        headers=headers,
        json={"notes": "should fail"},
    )
    assert r.status_code == 409
    assert r.get_json()["error"]["code"] == "CONFLICT"

    with app.app_context():
        assert Pet.query.count() == 1
