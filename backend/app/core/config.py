from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Garments POS API"
    app_env: str = "development"
    app_debug: bool = True

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/garments_pos"
    )

    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    clerk_audience: str = ""

    allow_negative_stock: bool = False
    auto_create_tables: bool = False


settings = Settings()
