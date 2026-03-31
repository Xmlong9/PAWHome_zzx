from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_pet(client, headers: dict) -> str:
    r = client.post(
        "/api/v1/users/me/pets",
        headers=headers,
        json={
            "name": "团子",
            "avatarUrl": "",
            "type": "猫",
            "breed": "英短",
            "gender": "美女",
            "weight": "4kg",
            "isSterilized": "是",
            "birthday": "2022-05-20",
        },
    )
    assert r.status_code == 200
    return r.get_json()["data"]["data"]["id"]


def test_service_catalog_and_appointment_flow(client, user1_token):
    headers = _auth(user1_token)
    pet_id = _create_pet(client, headers)

    r = client.get("/api/v1/services/providers?serviceType=beauty", headers=headers)
    assert r.status_code == 200
    providers = r.get_json()["data"]["list"]
    assert len(providers) >= 1
    provider = providers[0]
    assert provider["serviceType"] == "beauty"

    r = client.get(
        f"/api/v1/services/offerings?serviceType=beauty&providerId={provider['id']}",
        headers=headers,
    )
    assert r.status_code == 200
    offerings = r.get_json()["data"]["list"]
    assert len(offerings) >= 1
    offering = offerings[0]
    assert offering["providerId"] == provider["id"]

    r = client.get(
        f"/api/v1/services/slots?offeringId={offering['id']}&date={offering['availableDates'][0]}",
        headers=headers,
    )
    assert r.status_code == 200
    slots = r.get_json()["data"]["list"]
    assert len(slots) >= 1
    slot = slots[0]
    assert slot["remaining"] >= 1

    r = client.post(
        "/api/v1/services/appointments",
        headers=headers,
        json={
            "serviceType": "beauty",
            "petId": pet_id,
            "providerId": provider["id"],
            "offeringId": offering["id"],
            "slotId": slot["id"],
            "appointmentAt": slot["appointmentAt"],
            "notes": "请温柔一点",
        },
    )
    assert r.status_code == 201
    created = r.get_json()["data"]
    assert created["provider"]["id"] == provider["id"]
    assert created["offering"]["id"] == offering["id"]
    assert created["slot"]["id"] == slot["id"]
    assert created["price"] == offering["price"]

    r = client.get("/api/v1/services/appointments", headers=headers)
    assert r.status_code == 200
    payload = r.get_json()["data"]
    assert payload["total"] == 1
    assert payload["list"][0]["provider"]["id"] == provider["id"]
    assert payload["list"][0]["offering"]["id"] == offering["id"]
