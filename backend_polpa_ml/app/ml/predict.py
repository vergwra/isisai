# ml/predict.py

from typing import Dict, Any
import logging
from pathlib import Path

import joblib
import pandas as pd
import shap

from .preprocess import preprocessar_input
from .utils import get_exchange_rates
from .exceptions import ModelNotFoundError, InvalidInputError

logger = logging.getLogger(__name__)

def prever_custo(input_data: Dict[str, Any], model_type: str = "random_forest") -> Dict[str, Any]:
    """
    Realiza previsão de custo logístico com base nos dados de entrada.
    
    Args:
        input_data: Dicionário com dados de entrada
        model_type: Tipo de modelo a ser usado (default: random_forest)
        
    Returns:
        Dict contendo previsão e metadados
        
    Raises:
        ModelNotFoundError: Se o modelo não for encontrado
        InvalidInputError: Se os dados de entrada forem inválidos
    """
    try:
        model_path = Path(f"models/modelo_custo_v5_{model_type}.joblib")
        if not model_path.exists():
            raise ModelNotFoundError(f"Modelo {model_type} não encontrado")

        logger.info(f"Carregando modelo {model_type}")
        saved_model_data = joblib.load(model_path)
        model = saved_model_data["model"]
        model_columns = saved_model_data["columns"]
        metrics = saved_model_data["metrics"]

        # Preprocessar dados
        logger.debug("Preprocessando dados de entrada")
        df_input = preprocessar_input(input_data, model_columns)

        # Realizar previsão
        custo_brl = float(model.predict(df_input)[0])
        logger.info(f"Previsão realizada: R$ {custo_brl:.2f}")

        # Calcular valores SHAP
        explainer = shap.TreeExplainer(model) if hasattr(model, "feature_importances_") else shap.KernelExplainer(model.predict, df_input)
        shap_values = explainer.shap_values(df_input)
        feature_importance = dict(zip(model_columns, shap_values[0] if isinstance(shap_values, list) else shap_values))

        # Conversão de moeda
        target_currency = input_data.get("target_currency", "BRL")
        exchange = get_exchange_rates()
        conversion_rate = 1.0
        
        if target_currency == "USD":
            conversion_rate = 1 / exchange["USD_BRL"]
        elif target_currency == "EUR":
            conversion_rate = 1 / exchange["EUR_BRL"]

        custo_convertido = custo_brl * conversion_rate

        return {
            "custo_total_estimado": round(custo_convertido, 2),
            "custo_brl": round(custo_brl, 2),
            "moeda": target_currency,
            "modelo_utilizado": model_type,
            "metricas_modelo": metrics,
            "feature_importance": {k: float(v) for k, v in feature_importance.items()},
            "timestamp": pd.Timestamp.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Erro ao realizar previsão: {str(e)}")
        raise
