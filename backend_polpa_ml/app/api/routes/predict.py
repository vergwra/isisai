from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
import time
from app.core.config import settings
from app.schemas.predict import PredictRequest, PredictResponse
from app.ml.models.prediction import CustoModel
from app.core.monitoring import add_prediction_metric, add_error_metric

router = APIRouter()
logger = logging.getLogger(__name__)

# Não instanciamos mais o modelo globalmente
# pois agora o modelo é carregado dinamicamente a cada requisição

@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest) -> PredictResponse:
    """
    Realiza previsão de custo logístico com base nos parâmetros informados.
    
    Esta API recebe parâmetros como origem/destino, tipo de produto, volume,
    modal de transporte, especificações de container, índices econômicos, período
    e retorna o custo logístico estimado com detalhamento.
    
    Args:
        request: Dados de entrada para previsão conforme esquema PredictRequest
        
    Returns:
        Previsão de custo e detalhamento
        
    Raises:
        HTTPException: 
            - 503 se o artefato do modelo solicitado não estiver disponível
            - 500 para outros erros de processamento
    """
    start_time = time.time()
    try:
        logger.info(f"Recebida requisição de previsão para modelo '{request.model_name}', origem={request.origem_porto}, destino={request.destino_porto}, modal={request.modal}")
        
        # Instanciar modelo temporário (será descartado após a resposta)
        model = CustoModel()
        
        # Chamar o método predict_request que implementa toda a lógica necessária
        result = await model.predict_request(request)
        
        # Se for uma tupla (erro, status_code), retornar como erro HTTP
        if isinstance(result, tuple) and len(result) == 2:
            error_msg, status_code = result
            
            # Registrar erro nas métricas
            add_error_metric(
                error=f"Prediction failed: {error_msg}",
                where="/predict",
                error_type="artifact_missing" if status_code == 503 else "prediction_error"
            )
            
            return JSONResponse(
                status_code=status_code,
                content={"detail": error_msg}
            )
            
        # Calcular latência
        latency_ms = (time.time() - start_time) * 1000
        
        # Registrar métricas de predição bem-sucedida
        add_prediction_metric(
            model=request.model_name,
            latency_ms=latency_ms,
            ok=True,
            input_size=len(request.model_dump()),
            result_value=result.cost
        )
        
        logger.info(f"Previsão realizada com sucesso: custo={result.cost} {result.currency}")
        return result
        
    except Exception as e:
        # Calcular latência mesmo para erros
        latency_ms = (time.time() - start_time) * 1000
        
        error_msg = f"Erro ao processar previsão: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        # Registrar erro nas métricas
        add_error_metric(
            error=error_msg,
            where="/predict",
            error_type="unhandled_exception"
        )
        
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/debug/model-info")
async def get_model_info(model_name: str = "random_forest"):
    """
    Endpoint de diagnóstico que retorna informações sobre o artefato do modelo.
    
    Args:
        model_name: Nome do modelo a ser consultado (padrão: random_forest)
        
    Returns:
        Informações sobre o modelo como métricas, colunas e unidade do alvo
    """
    try:
        # Instanciar modelo temporário
        model = CustoModel()
        
        # Carregar o modelo para obter informações
        model_instance, artifact_exists, artifact_path = model.load_model(
            model_name=model_name, 
            version=settings.MODEL_VERSION
        )
        
        if not artifact_exists:
            return JSONResponse(
                status_code=404,
                content={"detail": f"Modelo '{model_name}' não está disponível"}
            )
        
        # Extrair informações relevantes do artefato
        info = {
            "name": model_name,
            "version": settings.MODEL_VERSION,
            "artifact_path": artifact_path,
            "metrics": getattr(model_instance, "metrics", {}),
            "target_unit": getattr(model_instance, "metrics", {}).get("target_unit", "eur_total"),
        }
        
        # Adicionar lista de colunas
        if hasattr(model_instance, "feature_columns"):
            info["columns"] = list(model_instance.feature_columns)
        elif hasattr(model_instance.model, "feature_names_in_"):
            info["columns"] = list(model_instance.model.feature_names_in_)
        
        return info
        
    except Exception as e:
        error_msg = f"Erro ao carregar informações do modelo: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": error_msg}
        )