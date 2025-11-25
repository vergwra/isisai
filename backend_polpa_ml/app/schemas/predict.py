from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Dict, Optional, Literal
from enum import Enum
from datetime import datetime, date

# Definição dos Enums para validação
class Modal(str, Enum):
    MARITIMO = "maritimo"
    AEREO = "aereo"
    RODOVIARIO = "rodoviario"

class TipoEmbalagem(str, Enum):
    CONTAINERIZADO = "containerizado"
    PALETIZADO = "paletizado"
    CAIXAS = "caixas"
    BAGS = "bags"

class ContainerTipo(str, Enum):
    REEFER = "reefer"
    DRY = "dry"
    OPEN_TOP = "open_top"
    FLAT_RACK = "flat_rack"

class ContainerTamanho(str, Enum):
    VINTE = "20ft"
    QUARENTA = "40ft"

class ModelName(str, Enum):
    LINEAR_REGRESSION = "linear_regression"
    LINEAR_REGRESSION_SKLEARN = "linear_regression_sklearn"
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    MLP = "mlp"

class Currency(str, Enum):
    BRL = "BRL"
    EUR = "EUR"
    USD = "USD"

class PredictRequest(BaseModel):
    """
    Dados de entrada para previsão de custo logístico.
    """
    origem_porto: str = Field(..., description="Porto de origem", min_length=1, max_length=100)
    destino_porto: str = Field(..., description="Porto de destino", min_length=1, max_length=100)
    modal: str = Field(..., description="Modo de transporte: marítimo, aéreo ou rodoviário")
    volume_ton: float = Field(..., description="Volume em toneladas", ge=0)
    tipo_produto: str = Field(..., description="Tipo de produto (ex: polpa de acerola)", min_length=1, max_length=100)
    tipo_embalagem: str = Field(..., description="Tipo de embalagem")
    container_tipo: str = Field(..., description="Tipo de container")
    container_tamanho: str = Field(..., description="Tamanho do container: 20ft ou 40ft")
    fuel_index: float = Field(..., description="Índice de combustível", ge=0.5, le=3.0)
    taxes_pct: float = Field(..., description="Percentual de taxas", ge=0, le=100)
    fx_brl_eur: float = Field(..., description="Taxa de câmbio EUR_BRL (BRL por EUR)", ge=4.0, le=8.0)
    lead_time_days: int = Field(..., description="Tempo de entrega em dias", ge=5, le=365)
    period_start: date = Field(..., description="Data inicial")
    period_end: date = Field(..., description="Data final")
    model_name: ModelName = Field(default=ModelName.RANDOM_FOREST, description="Nome do modelo a ser utilizado")
    output_currency: Currency = Field(default=Currency.BRL, description="Moeda de saída")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "origem_porto": "Paranaguá",
                "destino_porto": "Rotterdam",
                "modal": "marítimo",
                "volume_ton": 1000.0,
                "tipo_produto": "polpa de acerola",
                "tipo_embalagem": "containerizado",
                "container_tipo": "Reefer",
                "container_tamanho": "20ft",
                "fuel_index": 1.5,
                "taxes_pct": 15.0,
                "fx_brl_eur": 4.95,
                "lead_time_days": 56,
                "period_start": "2025/09/16",
                "period_end": "2025/10/16",
                "model_name": "random_forest",
                "output_currency": "BRL"
            }
        }
    )

    @field_validator("period_start", "period_end", mode="before")
    def parse_dates(cls, value):
        """Converter string para date se necessário"""
        if isinstance(value, str):
            try:
                return datetime.strptime(value, "%Y/%m/%d").date()
            except ValueError:
                raise ValueError(f"Formato de data inválido. Use YYYY/MM/DD")
        return value

    @field_validator("period_end")
    def validate_dates(cls, v, info):
        """Valida que period_end é maior ou igual a period_start"""
        period_start = info.data.get("period_start")
        if period_start and v < period_start:
            raise ValueError("A data final deve ser maior ou igual à data inicial")
        return v

class FxRates(BaseModel):
    """Taxas de câmbio utilizadas na conversão"""
    BRL_EUR: float
    BRL_USD: float

class PredictResponseBreakdown(BaseModel):
    """Detalhamento da previsão de custo"""
    model_used: str
    version: str
    tax_multiplier: float
    fuel_index: float
    lead_time_days: int
    fx_used: FxRates
    artifact_path: str

class PredictResponse(BaseModel):
    """
    Resposta da previsão de custo logístico.
    """
    cost: float = Field(..., description="Custo total estimado na moeda solicitada")
    currency: Currency = Field(..., description="Moeda da previsão")
    breakdown: PredictResponseBreakdown = Field(..., description="Detalhamento da previsão")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "cost": 12345.67,
                "currency": "EUR",
                "breakdown": {
                    "model_used": "random_forest",
                    "version": "0.1.0",
                    "tax_multiplier": 1.15,
                    "fuel_index": 1.5,
                    "lead_time_days": 56,
                    "fx_used": {
                        "BRL_EUR": 5.5,
                        "BRL_USD": 5.1
                    },
                    "artifact_path": "data/models/modelo_custo_0.1.0_random_forest.joblib"
                }
            }
        }
    )
