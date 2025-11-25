from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional
from enum import Enum
from datetime import datetime

class Currency(str, Enum):
    BRL = "BRL"
    USD = "USD"
    EUR = "EUR"

class TipoTransporte(str, Enum):
    RODOVIARIO = "rodoviario"
    MARITIMO = "maritimo"
    AEREO = "aereo"
    MULTIMODAL = "multimodal"

class TipoCarga(str, Enum):
    POLPA_ACAI = "polpa_acai"
    POLPA_MANGA = "polpa_manga"
    POLPA_MARACUJA = "polpa_maracuja"
    POLPA_GOIABA = "polpa_goiaba"
    POLPA_ABACAXI = "polpa_abacaxi"
    POLPA_MISTA = "polpa_mista"

class Regiao(str, Enum):
    NORTE = "norte"
    NORDESTE = "nordeste"
    CENTRO_OESTE = "centro_oeste"
    SUDESTE = "sudeste"
    SUL = "sul"
    INTERNACIONAL = "internacional"

class ModelType(str, Enum):
    LINEAR_REGRESSION = "linear_regression"
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    MLP_REGRESSOR = "mlp_regressor"

class PredictionRequest(BaseModel):
    """
    Dados de entrada para previsão de custo logístico.
    
    Attributes:
        peso_kg: Peso da carga em kg (maior que 0)
        distancia_km: Distância do transporte em km (maior que 0)
        tipo_transporte: Tipo de transporte (rodoviário, marítimo, etc)
        tipo_carga: Tipo de polpa de fruta
        regiao_origem: Região de origem do transporte
        regiao_destino: Região de destino do transporte
        target_currency: Moeda para resultado (BRL, USD, EUR)
        model_type: Tipo de modelo para previsão
    """
    peso_kg: float = Field(..., gt=0, le=50000, description="Peso da carga em kg (máx: 50000kg)")
    distancia_km: float = Field(..., gt=0, le=20000, description="Distância do transporte em km (máx: 20000km)")
    tipo_transporte: TipoTransporte = Field(..., description="Tipo de transporte")
    tipo_carga: TipoCarga = Field(..., description="Tipo de polpa")
    regiao_origem: Regiao = Field(..., description="Região de origem")
    regiao_destino: Regiao = Field(..., description="Região de destino")
    target_currency: Currency = Field(default=Currency.BRL, description="Moeda alvo")
    model_type: ModelType = Field(default=ModelType.RANDOM_FOREST, description="Tipo de modelo")

    @validator('regiao_destino')
    def validate_regions(cls, v, values):
        if 'regiao_origem' in values and v == values['regiao_origem']:
            raise ValueError('Região de origem e destino não podem ser iguais')
        return v

    @validator('tipo_transporte')
    def validate_transport_type(cls, v, values):
        if v == TipoTransporte.AEREO and values.get('peso_kg', 0) > 10000:
            raise ValueError('Transporte aéreo limitado a 10000kg')
        return v

    class Config:
        model_config = ConfigDict(
            json_schema_extra={
                "example": {
                    "peso_kg": 1000.0,
                    "distancia_km": 500.0,
                    "tipo_transporte": "rodoviario",
                    "tipo_carga": "polpa_acai",
                    "regiao_origem": "norte",
                    "regiao_destino": "sudeste",
                    "target_currency": "BRL",
                    "model_type": "random_forest"
                }
            }
        )

class IncrementalTrainingRequest(BaseModel):
    """
    Dados para treinamento incremental do modelo.
    
    Attributes:
        peso_kg: Peso da carga em kg (maior que 0)
        distancia_km: Distância do transporte em km (maior que 0)
        tipo_transporte: Tipo de transporte
        tipo_carga: Tipo de polpa
        regiao_origem: Região de origem
        regiao_destino: Região de destino
        custo_total_logistico_brl: Custo real em BRL
        timestamp: Data/hora do registro
    """
    peso_kg: float = Field(..., gt=0, le=50000, description="Peso da carga em kg (máx: 50000kg)")
    distancia_km: float = Field(..., gt=0, le=20000, description="Distância do transporte em km (máx: 20000km)")
    tipo_transporte: TipoTransporte = Field(..., description="Tipo de transporte")
    tipo_carga: TipoCarga = Field(..., description="Tipo de polpa")
    regiao_origem: Regiao = Field(..., description="Região de origem")
    regiao_destino: Regiao = Field(..., description="Região de destino")
    custo_total_logistico_brl: float = Field(..., gt=0, le=1000000, description="Custo total logístico em BRL (máx: 1M)")
    timestamp: datetime = Field(default_factory=datetime.now, description="Data/hora do registro")

    @validator('regiao_destino')
    def validate_regions(cls, v, values):
        if 'regiao_origem' in values and v == values['regiao_origem']:
            raise ValueError('Região de origem e destino não podem ser iguais')
        return v

    @validator('custo_total_logistico_brl')
    def validate_cost(cls, v, values):
        if v < values.get('peso_kg', 0) * 0.5:  # Custo mínimo de 0.50 BRL por kg
            raise ValueError('Custo total parece muito baixo para o peso informado')
        return v

    class Config:
        model_config = ConfigDict(
            json_schema_extra={
                "example": {
                    "peso_kg": 1000.0,
                    "distancia_km": 500.0,
                    "tipo_transporte": "rodoviario",
                    "tipo_carga": "polpa_acai",
                    "regiao_origem": "norte",
                    "regiao_destino": "sudeste",
                    "custo_total_logistico_brl": 2500.0
                }
            }
        )

class TrainingRequest(BaseModel):
    """
    Dados para treinamento do modelo.
    
    Attributes:
        model_type: Tipo de modelo a ser treinado
        data_path: Caminho para o arquivo CSV com dados de treinamento
        test_size: Proporção dos dados para teste
        random_state: Seed para reprodutibilidade
    """
    model_type: ModelType = Field(
        default=ModelType.RANDOM_FOREST,
        description="Tipo de modelo a ser treinado"
    )
    data_path: str = Field(
        ...,
        description="Caminho para o arquivo CSV com dados de treinamento"
    )
    test_size: float = Field(
        default=0.2,
        gt=0,
        lt=1,
        description="Proporção dos dados para teste"
    )
    random_state: int = Field(
        default=42,
        description="Seed para reprodutibilidade"
    )
    
    class Config:
        model_config = ConfigDict(
            json_schema_extra={
                "example": {
                    "model_type": "random_forest",
                    "data_path": "dados/custos_logisticos.csv",
                    "test_size": 0.2,
                    "random_state": 42
                }
            }
        )
