from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, status
from typing import Dict, Any
import pandas as pd
from pathlib import Path

from app.core.config import settings
from app.schemas.requests import TrainingRequest, IncrementalTrainingRequest
from app.schemas.responses import TrainingResponse
from app.ml.models.prediction import CustoModel
from app.ml.exceptions import ModelTrainingError

router = APIRouter(
    prefix="/train",
    tags=["treinamento"],
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Erro interno durante o treinamento",
            "content": {
                "application/json": {
                    "example": {"detail": "Erro no treinamento: dados inválidos"}
                }
            }
        }
    }
)

@router.post(
    "",
    response_model=TrainingResponse,
    status_code=status.HTTP_200_OK,
    summary="Treinar modelo com dados em lote",
    description="""
    Treina um novo modelo usando um arquivo CSV com dados históricos.
    
    O arquivo CSV deve conter as seguintes colunas:
    - peso_kg: Peso da carga em kg
    - distancia_km: Distância do transporte em km
    - tipo_transporte: Tipo de transporte (rodoviário, marítimo, etc)
    - tipo_carga: Tipo de polpa
    - regiao_origem: Região de origem
    - regiao_destino: Região de destino
    - custo_total_logistico_brl: Custo total em BRL
    
    O modelo treinado será salvo e usado para previsões futuras.
    """
)
async def train_model(
    file: UploadFile = File(..., description="Arquivo CSV com dados de treinamento"),
    model_type: str = settings.DEFAULT_MODEL,
    background_tasks: BackgroundTasks = None
) -> Dict[str, Any]:
    """
    Treina um novo modelo com dados completos.
    
    Args:
        file: Arquivo CSV com dados de treinamento
        model_type: Tipo de modelo a ser treinado
        background_tasks: Tarefas em background (opcional)
        
    Returns:
        Dict com informações sobre o treinamento e métricas
        
    Raises:
        HTTPException: Se houver erro no treinamento
    """
    try:
        temp_path = Path("temp_data.csv")
        with temp_path.open("wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        model = CustoModel(model_type=model_type)
        
        import time
        start_time = time.time()
        metrics = model.train_from_file(str(temp_path))
        training_time = time.time() - start_time
        
        temp_path.unlink()
        
        # Substituir NaN por None para JSON
        clean_metrics = {}
        for key, value in metrics.items():
            if pd.isna(value):
                clean_metrics[key] = None
            else:
                clean_metrics[key] = value
        
        return {
            "message": "Modelo treinado com sucesso",
            "model_type": model_type,
            "model_version": settings.MODEL_VERSION,
            "metrics": clean_metrics,
            "n_samples": model.n_samples,
            "training_time": round(training_time, 2),
            "feature_importance": model.get_feature_importance() if hasattr(model, 'get_feature_importance') else {},
            "timestamp": pd.Timestamp.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no treinamento: {str(e)}"
        )

@router.post(
    "/incremental",
    status_code=status.HTTP_200_OK,
    summary="Treinar modelo incrementalmente",
    description="""
    Atualiza o modelo existente com novos dados de forma incremental.
    
    Este endpoint permite adicionar novos dados ao modelo sem perder o conhecimento anterior.
    Ideal para:
    - Adicionar novos registros de custos
    - Atualizar o modelo com dados recentes
    - Melhorar a precisão do modelo gradualmente
    
    O treinamento incremental está disponível para:
    - Linear Regression (usando SGDRegressor)
    - MLP (usando warm_start)
    """
)
async def train_incremental(
    request: IncrementalTrainingRequest,
    model_type: str = settings.DEFAULT_MODEL
) -> Dict[str, Any]:
    """
    Treina o modelo incrementalmente com novos dados.
    
    Args:
        request: Dados para treinamento incremental
        model_type: Tipo de modelo a ser atualizado
        
    Returns:
        Dict com informações sobre o treinamento e métricas atualizadas
        
    Raises:
        HTTPException: Se o modelo não suportar treinamento incremental ou houver erro
    """
    try:
        model = CustoModel(model_type=model_type)
        
        # Converter dados de entrada em DataFrame
        new_data = pd.DataFrame([request.dict()])
        
        # Treinar incrementalmente
        metrics = model.partial_fit(
            X=new_data.drop("custo_total_logistico_brl", axis=1),
            y=pd.Series([request.custo_total_logistico_brl])
        )
        
        return {
            "message": "Modelo atualizado incrementalmente com sucesso",
            "model_type": model_type,
            "metrics": metrics,
            "samples_seen": metrics.get("samples_seen", 0),
            "timestamp": pd.Timestamp.now().isoformat()
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro de validação: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no treinamento incremental: {str(e)}"
        )