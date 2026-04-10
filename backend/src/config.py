from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # Application
    app_name: str = "Smart-Stay API"
    app_env: str = "development"
    app_debug: bool = True

    # Database
    database_host: str = "localhost"
    database_port: int = 5432
    database_username: str = "postgres"
    database_password: str = "postgres"
    database_name: str = "test"
    database_url: str = (
        f"postgresql+psycopg://{database_username}:{database_password}@{database_host}:{database_port}/{database_name}"
    )

    # DeepFace
    deepface_model: str = "Facenet512"
    deepface_detector: str = "opencv"
    deepface_distance: str = "cosine"
    deepface_embedding_size: int = 512
    deepface_threshold: float = 0.60

    # ESP32-CAM
    esp32_cam_url: str = "http://localhost/cam-lo.jpg"

    # File Upload
    max_file_size_mb: int = 5
    allowed_extensions: str = "jpg,jpeg,png,webp"

    # Face Embedding File Upload
    face_embedding_upload_dir: Path = Path("uploads/face_embedding_images")

    # Suspicious Verification File Upload
    suspicious_verification_upload_dir: Path = Path(
        "uploads/suspicious_verification_images"
    )


settings = Settings()
