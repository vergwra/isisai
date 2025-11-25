# app/core/config.py
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Dict, Any

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=True,   # usa exatamente o nome do campo
        extra="ignore",        # opcional
    )

    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    MODELS_DIR: Path = DATA_DIR / "models"
    LOG_DIR: Path = DATA_DIR / "logs"
    BACKUP_DIR: Path = DATA_DIR / "backups"

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "API de Custos Logísticos - Polpa de Frutas"

    DEFAULT_MODEL: str = "linear_regression"
    AVAILABLE_MODELS: list[str] = ["linear_regression", "random_forest", "gradient_boosting", "mlp"]

    DATABASE_URL: str = Field(default="postgresql://usuario:senha@localhost:5432/nome_do_banco")
    MODEL_VERSION: str = Field(default="0.1.0")
    
    MODEL_PARAMS: Dict[str, Dict[str, Any]] = Field(
        default_factory=lambda: {
            "linear_regression": {},
            "random_forest": {"n_estimators": 200, "random_state": 42},
            "gradient_boosting": {"random_state": 42},
            "mlp": {"hidden_layer_sizes": (64, 64), "max_iter": 500, "random_state": 42},
        }
    )

    # ❗ Sem validation_alias em tupla
    API_CAMBIO: str = Field(
        default="https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL"
    )

settings = Settings()
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.LOG_DIR.mkdir(parents=True, exist_ok=True)
settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
