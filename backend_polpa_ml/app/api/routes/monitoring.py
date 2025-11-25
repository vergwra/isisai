from fastapi import APIRouter, HTTPException
from typing import Dict, List
import numpy as np
from datetime import datetime, timedelta
from app.core.config import settings

router = APIRouter()

# Armazenamento em memória para métricas (em produção, usar um banco de dados)
_metrics_store = {
    "predictions": [],
    "response_times": [],
    "errors": []
}

@router.get("/monitoring/metrics")
async def get_metrics():
    """
    Retorna métricas de performance do modelo.
    """
    try:
        predictions = _metrics_store["predictions"]
        if not predictions:
            return {
                "message": "Nenhuma predição registrada ainda",
                "total_predictions": 0,
                "metrics": {}
            }
        
        # Calcular métricas básicas
        total = len(predictions)
        last_24h = len([p for p in predictions if p["timestamp"] > datetime.now() - timedelta(days=1)])
        
        # Calcular tempos de resposta
        response_times = _metrics_store["response_times"]
        avg_response_time = np.mean(response_times) if response_times else 0
        
        return {
            "total_predictions": total,
            "predictions_last_24h": last_24h,
            "avg_response_time": f"{avg_response_time:.2f}ms",
            "total_errors": len(_metrics_store["errors"]),
            "metrics": {
                "last_prediction": predictions[-1] if predictions else None,
                "error_rate": len(_metrics_store["errors"]) / total if total > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter métricas: {str(e)}")

@router.get("/monitoring/errors")
async def get_errors():
    """
    Retorna os últimos erros registrados.
    """
    try:
        return {
            "total_errors": len(_metrics_store["errors"]),
            "errors": _metrics_store["errors"][-10:]  # Retorna apenas os 10 últimos erros
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter erros: {str(e)}")

@router.post("/monitoring/record")
async def record_prediction(data: Dict):
    """
    Registra uma nova predição para monitoramento.
    """
    try:
        _metrics_store["predictions"].append({
            **data,
            "timestamp": datetime.now().isoformat()
        })
        return {"message": "Predição registrada com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar predição: {str(e)}")

@router.post("/monitoring/record_error")
async def record_error(error: Dict):
    """
    Registra um novo erro para monitoramento.
    """
    try:
        _metrics_store["errors"].append({
            **error,
            "timestamp": datetime.now().isoformat()
        })
        return {"message": "Erro registrado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar erro: {str(e)}")

@router.delete("/monitoring/clear")
async def clear_metrics():
    """
    Limpa todas as métricas armazenadas (útil para testes).
    """
    try:
        global _metrics_store
        _metrics_store = {
            "predictions": [],
            "response_times": [],
            "errors": []
        }
        return {"message": "Métricas limpas com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar métricas: {str(e)}")
