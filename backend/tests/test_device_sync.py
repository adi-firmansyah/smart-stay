"""Test untuk fitur cache perangkat dan sinkronisasi access log."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient


def _create_resident(client: TestClient, room_number: int = 101) -> dict:
    response = client.post(
        "/residents/",
        json={
            "name": f"Resident {room_number}",
            "phone": "08123456789",
            "room_number": room_number,
            "rfid_code": f"{room_number:04X}ABCD",
            "pin": f"{room_number % 10000:04d}",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_export_residents_device_cache(client: TestClient):
    """Cache penghuni untuk perangkat harus berisi data dasar yang bisa diparsing ESP32."""
    resident = _create_resident(client, room_number=201)

    response = client.get("/residents/device/cache")

    assert response.status_code == 200
    body = response.text.strip()
    assert resident["id"] in body
    assert "00C9ABCD" in body
    assert "0201" in body


def test_sync_access_logs_inserts_and_skips_duplicates(client: TestClient):
    """Sinkronisasi batch harus insert log baru dan skip log yang sudah pernah dikirim."""
    resident = _create_resident(client, room_number=202)
    timestamp = datetime.now(timezone.utc).isoformat()

    payload = {
        "items": [
            {
                "source_device_id": "esp32-01",
                "source_log_id": 1,
                "resident_id": resident["id"],
                "method": "RFID",
                "granted": True,
                "similarity": 100,
                "image_path": None,
                "created_at": timestamp,
            },
            {
                "source_device_id": "esp32-01",
                "source_log_id": 1,
                "resident_id": resident["id"],
                "method": "RFID",
                "granted": True,
                "similarity": 100,
                "image_path": None,
                "created_at": timestamp,
            },
        ]
    }

    response = client.post("/access-logs/sync", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["total_processed"] == 2
    assert data["total_inserted"] == 1
    assert data["total_skipped"] == 1
    assert data["total_failed"] == 0
    assert data["results"][0]["status"] == "inserted"
    assert data["results"][1]["status"] == "skipped"
