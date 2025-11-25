#!/usr/bin/env python3
"""
Testes para o endpoint /predict da API.

Este módulo testa:
1. Chamada bem-sucedida ao endpoint /predict
2. Comportamento quando o modelo solicitado não está disponível
3. Validação de entrada
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock

# Adicionar o diretório raiz do projeto ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.config import settings
from app.schemas.predict import ModelName, Currency, Modal, TipoEmbalagem, ContainerTipo, ContainerTamanho

# Cliente para testes
client = TestClient(app)

# Dados válidos para teste
valid_payload = {
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
}

def setup_module(module):
    """Prepara ambiente para os testes."""
    # Criar diretório de modelos se não existir
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Diretório de modelos: {settings.MODELS_DIR}")

def create_mock_model(model_name: str, version: str = "0.1.0"):
    """
    Cria um modelo mock para teste.
    
    Args:
        model_name: Nome do modelo
        version: Versão do modelo
    """
    # Definir caminho do modelo
    model_path = settings.MODELS_DIR / f"modelo_custo_{version}_{model_name}.joblib"
    
    # Criar modelo mock que sempre retorna o mesmo valor
    model = MagicMock()
    model.predict.return_value = np.array([5000.0])
    
    # Criar dicionário com dados do modelo
    model_data = {
        "model": model,
        "columns": ["origem_porto", "destino_porto", "modal", "volume_ton", 
                   "tipo_produto", "tipo_embalagem", "container_tipo", 
                   "container_tamanho", "fuel_index", "taxes_pct", "fx_brl_eur",
                   "lead_time_days", "period_days"],
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
    print(f"Modelo mock '{model_name}' salvo em: {model_path}")
    
    return model_path

def delete_mock_model(model_name: str, version: str = "0.1.0"):
    """Exclui um modelo mock após o teste."""
    model_path = settings.MODELS_DIR / f"modelo_custo_{version}_{model_name}.joblib"
    if model_path.exists():
        model_path.unlink()
        print(f"Modelo mock '{model_name}' excluído: {model_path}")

@pytest.fixture
def mock_random_forest_model():
    """Fixture que cria um modelo random_forest mock para teste."""
    model_path = create_mock_model("random_forest")
    yield model_path
    delete_mock_model("random_forest")

@pytest.fixture
def mock_fx_rates():
    """Fixture que mocka as taxas de câmbio para teste."""
    with patch("app.ml.utils.fx.get_exchange_rate_pair") as mock_rates:
        mock_rates.return_value = {"BRL_EUR": 0.18, "BRL_USD": 0.20}
        yield mock_rates

@pytest.fixture
def mock_convert():
    """Fixture que mocka a conversão de moeda para teste."""
    with patch("app.ml.utils.fx.convert") as mock_convert:
        # Mock para retornar o valor convertido (20% do valor original para EUR)
        mock_convert.return_value = 1000.0
        yield mock_convert

def test_predict_success(mock_random_forest_model, mock_fx_rates, mock_convert):
    """Testa uma requisição válida com modelo disponível."""
    response = client.post("/predict", json=valid_payload)
    
    # Verificar resposta
    assert response.status_code == 200
    data = response.json()
    
    # Validar estrutura da resposta
    assert "cost" in data
    assert "currency" in data
    assert "breakdown" in data
    assert data["currency"] == "EUR"
    
    # Validar breakdown
    breakdown = data["breakdown"]
    assert breakdown["model_used"] == "random_forest"
    assert "version" in breakdown
    assert "tax_multiplier" in breakdown
    assert "fuel_index" in breakdown
    assert "lead_time_days" in breakdown
    assert "fx_used" in breakdown
    assert "artifact_path" in breakdown
    
    # Verificar que as taxas de câmbio estão corretas
    assert "BRL_EUR" in breakdown["fx_used"]
    assert "BRL_USD" in breakdown["fx_used"]
    
    # Verificar multiplicadores
    assert breakdown["tax_multiplier"] == 1.15  # 15%
    assert breakdown["fuel_index"] == 1.5

def test_predict_model_not_found():
    """Testa requisição para um modelo que não existe."""
    # Modificar payload para usar um modelo que não existe
    payload = valid_payload.copy()
    payload["model_name"] = "model_that_does_not_exist"
    
    response = client.post("/predict", json=payload)
    
    # Verificar que o código de status é 503 (Service Unavailable)
    assert response.status_code == 503
    assert "não está disponível" in response.json()["detail"]

def test_predict_validation_error():
    """Testa validação de dados de entrada."""
    # Payload com valores inválidos
    invalid_payload = valid_payload.copy()
    invalid_payload["volume_ton"] = -10.0  # Volume negativo (deve ser >= 0)
    
    response = client.post("/predict", json=invalid_payload)
    
    # Verificar que o código de status é 422 (Unprocessable Entity)
    assert response.status_code == 422
    
    # Verificar mensagem de erro
    errors = response.json()["detail"]
    assert any("volume_ton" in e["loc"] for e in errors)

def test_predict_date_validation():
    """Testa validação de datas."""
    # Payload com data final anterior à data inicial
    invalid_dates_payload = valid_payload.copy()
    invalid_dates_payload["period_start"] = "2025/10/20"
    invalid_dates_payload["period_end"] = "2025/10/01"
    
    response = client.post("/predict", json=invalid_dates_payload)
    
    # Verificar que o código de status é 422 (Unprocessable Entity)
    assert response.status_code == 422
    
    # Verificar mensagem de erro
    errors = response.json()["detail"]
    assert any("period_end" in e["loc"] for e in errors)

# Comandos curl para testes manuais
"""
# Teste com modelo disponível (após executar scripts/save_stub_model.py)
curl -X 'POST' \
  'http://localhost:8000/predict' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
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

# Teste com modelo inexistente
curl -X 'POST' \
  'http://localhost:8000/predict' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
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
    "model_name": "modelo_inexistente",
    "output_currency": "EUR"
}'

# Teste com dados inválidos (volume negativo)
curl -X 'POST' \
  'http://localhost:8000/predict' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "origem_porto": "Santos",
    "destino_porto": "Rotterdam",
    "modal": "maritimo",
    "volume_ton": -10.0,
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
"""

if __name__ == "__main__":
    pytest.main(["-xvs", __file__])
