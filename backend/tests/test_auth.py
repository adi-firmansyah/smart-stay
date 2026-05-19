"""Test suite untuk fitur login admin."""

from fastapi.testclient import TestClient


class TestAdminLogin:
    """Test cases untuk endpoint login admin."""

    def test_login_success(self, client: TestClient, setup_admin):
        """Test login admin dengan credentials yang benar."""
        response = client.post(
            "/auth/login",
            json={
                "username": "admin_test",
                "password": "password123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["admin"]["username"] == "admin_test"
        assert data["admin"]["name"] == "Admin Test"

    def test_login_invalid_username(self, client: TestClient):
        """Test login dengan username yang tidak ada."""
        response = client.post(
            "/auth/login",
            json={
                "username": "invalid_user",
                "password": "password123",
            },
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Username atau password salah."

    def test_login_invalid_password(self, client: TestClient, setup_admin):
        """Test login dengan password yang salah."""
        response = client.post(
            "/auth/login",
            json={
                "username": "admin_test",
                "password": "wrong_password",
            },
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Username atau password salah."

    def test_login_missing_username(self, client: TestClient):
        """Test login tanpa username."""
        response = client.post(
            "/auth/login",
            json={
                "password": "password123",
            },
        )

        assert response.status_code == 422  # Validasi gagal

    def test_login_missing_password(self, client: TestClient):
        """Test login tanpa password."""
        response = client.post(
            "/auth/login",
            json={
                "username": "admin_test",
            },
        )

        assert response.status_code == 422  # Validasi gagal

    def test_get_current_admin_info(self, client: TestClient, setup_admin):
        """Test mendapatkan informasi admin yang sedang login."""
        # Masuk terlebih dahulu untuk mendapatkan token
        login_response = client.post(
            "/auth/login",
            json={
                "username": "admin_test",
                "password": "password123",
            },
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        response = client.get(
            "/auth/me",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin_test"
        assert data["name"] == "Admin Test"

    def test_get_current_admin_without_token(self, client: TestClient):
        """Test mendapatkan info admin tanpa token."""
        response = client.get("/auth/me")

        assert response.status_code == 401

    def test_get_current_admin_with_invalid_token(self, client: TestClient):
        """Test mendapatkan info admin dengan token invalid."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401
