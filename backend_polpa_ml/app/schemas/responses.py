from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List
from datetime import datetime
from .requests import Currency

class ModelMetrics(BaseModel):
    """Métricas de performance do modelo."""
    rmse: float
    mae: float
    r2: float

class PredictionResponse(BaseModel):
    """Resposta da previsão de custo."""
    
    custo_total_estimado: float = Field(..., description="Custo total estimado na moeda solicitada")
    custo_brl: float = Field(..., description="Custo total em BRL")
    moeda: Currency = Field(..., description="Moeda da previsão")
    modelo_utilizado: str = Field(..., description="Modelo utilizado para previsão")
    metricas_modelo: ModelMetrics = Field(..., description="Métricas de performance do modelo")
    feature_importance: Dict[str, float] = Field(..., description="Importância das features (SHAP values)")
    timestamp: datetime = Field(..., description="Timestamp da previsão")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "custo_total_estimado": 15234.56,
                "custo_brl": 82345.67,
                "moeda": "EUR",
                "modelo_utilizado": "random_forest",
                "metricas_modelo": {
                    "rmse": 234.56,
                    "mae": 189.23,
                    "r2": 0.89
                },
                "feature_importance": {
                    "volume_m3": 0.35,
                    "peso_kg": 0.25,
                    "prazo_dias": 0.20
                },
                "timestamp": "2025-07-14T14:33:55"
            }
        }
    )

class TrainingResponse(BaseModel):
    """Resposta do treinamento do modelo."""
    
    model_type: str = Field(..., description="Tipo de modelo treinado")
    model_version: str = Field(..., description="Versão do modelo")
    training_time: float = Field(..., description="Tempo de treinamento em segundos")
    n_samples: int = Field(..., description="Número de amostras usadas")
    metrics: ModelMetrics = Field(..., description="Métricas de performance")
    feature_importance: Dict[str, float] = Field(
        ..., 
        description="Importância das features no modelo"
    )
    timestamp: datetime = Field(..., description="Data/hora do treinamento")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "model_type": "random_forest",
                "model_version": "v5",
                "training_time": 45.67,
                "n_samples": 1500,
                "metrics": {
                    "rmse": 234.56,
                    "mae": 189.23,
                    "r2": 0.89
                },
                "feature_importance": {
                    "volume_m3": 0.35,
                    "peso_kg": 0.25,
                    "prazo_dias": 0.20
                },
                "timestamp": "2025-07-14T14:47:18"
            }
        }
    )
