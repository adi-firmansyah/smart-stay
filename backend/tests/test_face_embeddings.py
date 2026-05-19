"""Test suite untuk fitur embedding data wajah penghuni."""

import io
from fastapi.testclient import TestClient
from PIL import Image
import numpy as np


def create_test_image(width=100, height=100, format="PNG"):
    """Membuat test image dalam memory."""
    # Buat image random
    img_array = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(img_array)

    # Simpan ke bytes buffer
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    return buffer


class TestFaceEmbeddings:
    """Test cases untuk face embeddings."""

    def test_upload_face_embedding_success(self, client: TestClient):
        """Test upload face embedding untuk penghuni."""
        # Buat penghuni terlebih dahulu
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]

        # Membuat gambar uji
        image_buffer = create_test_image()

        # Mengunggah embedding wajah
        response = client.post(
            f"/residents/{resident_id}/face-embeddings/",
            files={"files": ("test_face.png", image_buffer, "image/png")},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["total_processed"] == 1
        assert data["total_success"] == 1
        assert data["total_failed"] == 0
        assert len(data["results"]) == 1
        assert data["results"][0]["filename"] == "test_face.png"
        assert data["results"][0]["status"] == "berhasil"
        assert "image_path" in data["results"][0]

    def test_upload_multiple_face_embeddings(self, client: TestClient):
        """Test upload multiple face embeddings untuk penghuni."""
        # Buat penghuni terlebih dahulu
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]

        # Membuat beberapa gambar uji
        images = [
            ("face1.png", create_test_image()),
            ("face2.png", create_test_image()),
            ("face3.png", create_test_image()),
        ]

        # Mengunggah beberapa embedding wajah
        files = [("files", (name, img, "image/png")) for name, img in images]
        response = client.post(
            f"/residents/{resident_id}/face-embeddings/",
            files=files,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["total_processed"] == 3
        assert data["total_success"] == 3
        assert data["total_failed"] == 0

    def test_upload_face_embedding_resident_not_found(self, client: TestClient):
        """Test upload face embedding untuk penghuni yang tidak ada."""
        fake_id = "550e8400-e29b-41d4-a716-446655440000"
        image_buffer = create_test_image()

        response = client.post(
            f"/residents/{fake_id}/face-embeddings/",
            files={"files": ("test_face.png", image_buffer, "image/png")},
        )

        # Endpoint mungkin mengembalikan 404 atau 400, tergantung implementasi
        assert response.status_code in [404, 400]

    def test_upload_face_embedding_no_files(self, client: TestClient):
        """Test upload face embedding tanpa file."""
        # Buat penghuni terlebih dahulu
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]

        # Mengunggah tanpa file
        response = client.post(
            f"/residents/{resident_id}/face-embeddings/",
            files={},
        )

        # Seharusnya mengembalikan 422 (validasi gagal)
        assert response.status_code == 422

    def test_get_face_embeddings_list(self, client: TestClient):
        """Test mendapatkan daftar face embeddings untuk penghuni."""
        # Buat penghuni terlebih dahulu
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]

        # Mengunggah 2 embedding wajah
        for i in range(2):
            image_buffer = create_test_image()
            client.post(
                f"/residents/{resident_id}/face-embeddings/",
                files={"files": (f"face{i}.png", image_buffer, "image/png")},
            )

        # Dapatkan daftar embeddings
        response = client.get(f"/residents/{resident_id}/face-embeddings/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all("id" in item for item in data)
        assert all("resident_id" in item for item in data)
        assert all("embedding" in item for item in data)
        assert all("image_path" in item for item in data)

    def test_get_face_embeddings_empty_list(self, client: TestClient):
        """Test mendapatkan daftar face embeddings saat belum ada data."""
        # Buat penghuni terlebih dahulu
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]

        # Dapatkan daftar embeddings
        response = client.get(f"/residents/{resident_id}/face-embeddings/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_get_face_embeddings_resident_not_found(self, client: TestClient):
        """Test mendapatkan face embeddings untuk penghuni yang tidak ada."""
        fake_id = "550e8400-e29b-41d4-a716-446655440000"

        response = client.get(f"/residents/{fake_id}/face-embeddings/")

        assert response.status_code == 404

    def test_delete_face_embedding_success(self, client: TestClient):
        """Test menghapus face embedding."""
        # Buat penghuni
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]

        # Mengunggah embedding wajah
        image_buffer = create_test_image()
        upload_response = client.post(
            f"/residents/{resident_id}/face-embeddings/",
            files={"files": ("test_face.png", image_buffer, "image/png")},
        )
        embedding_id = upload_response.json()["results"][0]["image_path"]

        # Dapatkan list embeddings
        response = client.get(f"/residents/{resident_id}/face-embeddings/")
        embeddings = response.json()
        embedding_id = embeddings[0]["id"]

        # Menghapus embedding
        response = client.delete(
            f"/residents/{resident_id}/face-embeddings/{embedding_id}"
        )

        assert response.status_code == 204

        # Verifikasi embedding sudah dihapus
        response = client.get(f"/residents/{resident_id}/face-embeddings/")
        assert len(response.json()) == 0

    def test_face_embedding_contains_vector_data(self, client: TestClient):
        """Test bahwa face embedding berisi data vector embedding."""
        # Buat penghuni
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]

        # Mengunggah embedding wajah
        image_buffer = create_test_image()
        client.post(
            f"/residents/{resident_id}/face-embeddings/",
            files={"files": ("test_face.png", image_buffer, "image/png")},
        )

        # Dapatkan embedding data
        response = client.get(f"/residents/{resident_id}/face-embeddings/")
        data = response.json()

        assert len(data) > 0
        embedding = data[0]
        assert "embedding" in embedding
        assert isinstance(embedding["embedding"], list)
        assert len(embedding["embedding"]) > 0
        # Vector embedding biasanya berupa list of floats
        assert all(isinstance(x, (int, float)) for x in embedding["embedding"][:5])

    def test_upload_face_embedding_preserves_resident_data(self, client: TestClient):
        """Test bahwa upload embedding tidak mengubah data penghuni."""
        # Buat penghuni
        resident_response = client.post(
            "/residents/",
            json={
                "name": "John Doe",
                "phone": "08123456789",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1234",
            },
        )
        resident_id = resident_response.json()["id"]
        original_name = resident_response.json()["name"]

        # Mengunggah embedding wajah
        image_buffer = create_test_image()
        client.post(
            f"/residents/{resident_id}/face-embeddings/",
            files={"files": ("test_face.png", image_buffer, "image/png")},
        )

        # Verifikasi data penghuni tetap sama
        response = client.get(f"/residents/{resident_id}")
        assert response.json()["name"] == original_name
        assert response.json()["id"] == resident_id

    def test_multiple_residents_embeddings_separate(self, client: TestClient):
        """Test bahwa embeddings dari berbeda residents terpisah."""
        # Buat 2 penghuni
        resident1_response = client.post(
            "/residents/",
            json={
                "name": "Resident 1",
                "phone": "08111111111",
                "room_number": 101,
                "rfid_code": "1A2B3C4D",
                "pin": "1111",
            },
        )
        resident1_id = resident1_response.json()["id"]

        resident2_response = client.post(
            "/residents/",
            json={
                "name": "Resident 2",
                "phone": "08222222222",
                "room_number": 102,
                "rfid_code": "5E6F7A8B",
                "pin": "2222",
            },
        )
        resident2_id = resident2_response.json()["id"]

        # Mengunggah embedding untuk penghuni 1
        image_buffer1 = create_test_image()
        client.post(
            f"/residents/{resident1_id}/face-embeddings/",
            files={"files": ("face1.png", image_buffer1, "image/png")},
        )

        # Mengunggah embedding untuk penghuni 2
        image_buffer2 = create_test_image()
        client.post(
            f"/residents/{resident2_id}/face-embeddings/",
            files={"files": ("face2.png", image_buffer2, "image/png")},
        )

        # Verifikasi embeddings terpisah
        response1 = client.get(f"/residents/{resident1_id}/face-embeddings/")
        response2 = client.get(f"/residents/{resident2_id}/face-embeddings/")

        assert len(response1.json()) == 1
        assert len(response2.json()) == 1
        assert response1.json()[0]["resident_id"] == str(resident1_id)
        assert response2.json()[0]["resident_id"] == str(resident2_id)
