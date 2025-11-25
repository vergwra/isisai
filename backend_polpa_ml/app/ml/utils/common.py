# ml/utils/common.py

import os
import shutil
from datetime import datetime
import joblib
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

def save_model_with_backup(model, columns, metrics, model_name, model_dir="models/"):
    """
    Salva o modelo em .joblib com backup da versão anterior (se existir).
    """
    os.makedirs(model_dir, exist_ok=True)
    model_filename = f"{model_dir}modelo_custo_v5_{model_name}.joblib"

    # Backup do modelo antigo
    if os.path.exists(model_filename):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{model_dir}backup_{model_name}_{timestamp}.joblib"
        shutil.copy2(model_filename, backup_name)
        print(f"🔁 Backup criado: {backup_name}")

    # Salvar modelo novo
    model_data = {
        "model": model,
        "columns": columns,
        "metrics": metrics
    }
    joblib.dump(model_data, model_filename)
    print(f"✅ Novo modelo salvo em: {model_filename}")

def get_exchange_rates(base_currency: str = "BRL") -> Dict[str, float]:
    """
    Retorna as taxas de câmbio para conversão entre moedas.
    Por enquanto, usando valores fixos para demonstração.
    Em produção, isso deveria buscar taxas atualizadas de uma API.
    
    Args:
        base_currency (str): Moeda base para conversão (default: BRL)
    
    Returns:
        Dict[str, float]: Dicionário com taxas de câmbio
    """
    # Taxas fixas para demonstração (BRL como base)
    FIXED_RATES = {
        "BRL": 1.0,
        "USD": 0.20,  # 1 BRL = 0.20 USD
        "EUR": 0.19,  # 1 BRL = 0.19 EUR
    }
    
    if base_currency not in FIXED_RATES:
        logger.warning(f"Moeda base {base_currency} não suportada. Usando BRL.")
        return FIXED_RATES
    
    # Se a moeda base não for BRL, recalcular as taxas
    if base_currency != "BRL":
        base_rate = FIXED_RATES[base_currency]
        return {
            currency: rate / base_rate
            for currency, rate in FIXED_RATES.items()
        }
    
    return FIXED_RATES

def format_currency(value: float, currency: str = "BRL") -> str:
    """
    Formata um valor monetário de acordo com a moeda.
    
    Args:
        value (float): Valor a ser formatado
        currency (str): Código da moeda (default: BRL)
    
    Returns:
        str: Valor formatado com símbolo da moeda
    """
    CURRENCY_SYMBOLS = {
        "BRL": "R$",
        "USD": "$",
        "EUR": "€"
    }
    
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    return f"{symbol} {value:,.2f}"
