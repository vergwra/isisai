#!/usr/bin/env python3
"""
Script para criar modelos stub (básicos) para testes da API.

Gera modelos com funcionalidade mínima para que a API possa funcionar,
simulando previsões de acordo com o esquema esperado.
"""
import sys
import os
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import SGDRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.ensemble import GradientBoostingRegressor

# Garantir que o pacote da aplicação esteja disponível no path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.ml.preprocessing.features import get_feature_order

def create_stub_model(model_name, version="0.1.0"):
    """
    Cria e salva um modelo stub para testes.
    
    Args:
        model_name: Nome do modelo (linear_regression, random_forest, gradient_boosting, mlp)
        version: Versão do modelo
    """
    print(f"Criando modelo stub {model_name} versão {version}...")
    
    # Garantir que o diretório de modelos existe
    models_dir = settings.MODELS_DIR
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # Definir caminho do modelo
    model_path = models_dir / f"modelo_custo_{version}_{model_name}.joblib"
    
    # Definir feature columns na ordem correta
    feature_columns = get_feature_order()
    
    # Criar modelo de acordo com o tipo
    if model_name == "linear_regression":
        model = SGDRegressor(
            loss='squared_error',
            learning_rate='adaptive',
            eta0=0.01,
            max_iter=1000,
            tol=1e-3
        )
    elif model_name == "random_forest":
        model = RandomForestRegressor(n_estimators=10, max_depth=3)
    elif model_name == "gradient_boosting":
        model = GradientBoostingRegressor(n_estimators=10, max_depth=3)
    elif model_name == "mlp":
        model = MLPRegressor(hidden_layer_sizes=(10,), max_iter=500)
    else:
        raise ValueError(f"Tipo de modelo não suportado: {model_name}")
    
    # Gerar dados de treino fake para treinar o modelo
    n_samples = 100
    np.random.seed(42)
    X = np.random.rand(n_samples, len(feature_columns))
    y = 1000 * np.random.rand(n_samples) + 5000  # Valores de 5000 a 6000
    
    # Treinar o modelo
    model.fit(X, y)
    
    # Criar dicionário com dados do modelo
    model_data = {
        "model": model,
        "columns": feature_columns,
        "metrics": {
            "rmse": 500.0,
            "mae": 400.0,
            "r2": 0.7,
        },
        "version": version,
        "name": model_name,
        "timestamp": pd.Timestamp.now().isoformat()
    }
    
    # Salvar o modelo
    joblib.dump(model_data, model_path)
    print(f"Modelo salvo em: {model_path}")
    return model_path

def main():
    """Função principal do script."""
    # Criar modelo para cada tipo
    model_types = ["linear_regression", "random_forest", "gradient_boosting", "mlp"]
    version = settings.MODEL_VERSION
    
    for model_type in model_types:
        try:
            path = create_stub_model(model_type, version)
            print(f"✅ Modelo {model_type} criado com sucesso em {path}")
        except Exception as e:
            print(f"❌ Erro ao criar modelo {model_type}: {str(e)}")
    
    print("\nInstruções para teste:")
    print("1. Execute a API: uvicorn app.main:app --reload")
    print("2. Teste a API com o seguinte comando curl:")
    print("""
curl -X 'POST' \\
  'http://localhost:8000/predict' \\
  -H 'accept: application/json' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "origem_porto": "Santos",
    "destino_porto": "Rotterdam",
    "modal": "maritimo",
    "volume_ton": 20.0,
    "tipo_produto": "polpa_de_goiaba",
    "tipo_embalagem": "containerizado",
    "container_tipo": "reefer",
    "container_tamanho": "40ft",
    "fuel_index": 1.5,
    "taxes_pct": 15.0,
    "fx_brl_eur": 5.5,
    "lead_time_days": 56,
    "period_start": "2025/09/16",
    "period_end": "2025/10/16",
    "model_name": "random_forest",
    "output_currency": "EUR"
}'
    """)

if __name__ == "__main__":
    main()
