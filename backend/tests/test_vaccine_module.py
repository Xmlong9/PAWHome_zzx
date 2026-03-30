from __future__ import annotations

from datetime import datetime, timedelta


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


def test_vaccine_catalog_and_status_initial(client, user1_token):
    headers = _auth(user1_token)
    pet_id = _create_pet(client, headers)

    r = client.get("/api/v1/vaccines/catalog?category=core", headers=headers)
    assert r.status_code == 200
    core = r.get_json()["data"]["list"]
    assert len(core) >= 1
    assert core[0]["category"] == "core"

    r = client.get(f"/api/v1/vaccines/status?petId={pet_id}&category=core", headers=headers)
    assert r.status_code == 200
    status_items = r.get_json()["data"]["list"]
    assert len(status_items) == len(core)
    assert all(item["vaccinated"] is False for item in status_items)


def test_vaccine_reminder_flow(client, user1_token):
    headers = _auth(user1_token)
    pet_id = _create_pet(client, headers)

    r = client.get("/api/v1/services/providers?serviceType=vaccine", headers=headers)
    provider = r.get_json()["data"]["list"][0]
    r = client.get(
        f"/api/v1/services/offerings?serviceType=vaccine&providerId={provider['id']}",
        headers=headers,
    )
    offering = r.get_json()["data"]["list"][0]
    date_value = offering["availableDates"][-1]
    r = client.get(
        f"/api/v1/services/slots?offeringId={offering['id']}&date={date_value}",
        headers=headers,
    )
    slot = r.get_json()["data"]["list"][0]

    r = client.get("/api/v1/vaccines/catalog?category=core", headers=headers)
    vaccine = r.get_json()["data"]["list"][0]

    appointment_at = datetime.fromisoformat(slot["appointmentAt"])
    remind_at = appointment_at - timedelta(days=1)

    r = client.post(
        "/api/v1/services/appointments",
        headers=headers,
        json={
            "serviceType": "vaccine",
            "petId": pet_id,
            "providerId": provider["id"],
            "offeringId": offering["id"],
            "slotId": slot["id"],
            "appointmentAt": slot["appointmentAt"],
            "vaccineId": vaccine["id"],
            "notes": "需要提前准备",
        },
    )
    assert r.status_code == 201
    appointment = r.get_json()["data"]

    r = client.get(
        f"/api/v1/vaccines/reminders/by-appointment?appointmentId={appointment['id']}",
        headers=headers,
    )
    assert r.status_code == 200
    payload = r.get_json()["data"]
    assert payload["exists"] is False

    r = client.post(
        "/api/v1/vaccines/reminders",
        headers=headers,
        json={
            "appointmentId": appointment["id"],
            "aheadDays": 1,
            "channel": "push",
            "remark": "",
            "addToCalendar": False,
        },
    )
    assert r.status_code == 201
    created = r.get_json()["data"]
    assert created["petId"] == pet_id
    assert created["vaccineId"] == vaccine["id"]
    assert created["vaccineName"] == vaccine["name"]
    assert created["appointmentId"] == appointment["id"]
    assert created["channel"] == "push"
    assert created["aheadDays"] == 1
    assert datetime.fromisoformat(created["remindAt"]) == remind_at

    r = client.get(f"/api/v1/vaccines/reminders/upcoming?petId={pet_id}", headers=headers)
    assert r.status_code == 200
    upcoming = r.get_json()["data"]["reminder"]
    assert upcoming["petId"] == pet_id
