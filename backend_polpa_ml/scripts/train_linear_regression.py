#!/usr/bin/env python3
# scripts/train_linear_regression.py
"""
Script para treinamento e avaliação do modelo LinearRegression (sklearn)
Use: python -m scripts.train_linear_regression
"""
import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import logging
import json
from datetime import datetime

# Garantir que o módulo app possa ser importado
sys.path.insert(0, os.path.abspath("."))

from app.ml.models.prediction import CustoModel
from app.core.config import settings
from app.ml.utils.common import save_model_with_backup

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Caminho para o dataset
DATASET = settings.DATA_DIR / "datasets" / "dataset_api_alinhado_franca.csv"
TARGET_COL = "target_couts_eur"  # Coluna alvo (corrigido para nome real no dataset)
TARGET_UNIT = "eur_total"  # Unidade do alvo (total em EUR)
MODEL_TYPE = "linear_regression_sklearn"  # Tipo de modelo
MODEL_DIR = settings.MODELS_DIR
TEST_SIZE = 0.2
RANDOM_STATE = 42

def main():
    logger.info(f"🏁 Iniciando treinamento do modelo {MODEL_TYPE}")
    
    # 1. Verificar existência do dataset
    if not DATASET.exists():
        logger.error(f"Dataset não encontrado: {DATASET}")
        sys.exit(1)
    
    # 2. Carregar dataset
    logger.info(f"Carregando dataset: {DATASET}")
    df = pd.read_csv(DATASET)
    if TARGET_COL not in df.columns:
        logger.error(f"Coluna alvo '{TARGET_COL}' não encontrada. Colunas: {list(df.columns)}")
        sys.exit(1)
    
    logger.info(f"Dataset carregado. Formato: {df.shape}")
    
    # 3. Identificar tipos de colunas
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
    numeric_cols = [col for col in numeric_cols if col != TARGET_COL]
    
    logger.info(f"Colunas categóricas: {list(categorical_cols)}")
    logger.info(f"Colunas numéricas: {list(numeric_cols)}")
    
    # 4. Preparar features e target
    X = df.drop(columns=[TARGET_COL])
    y = df[TARGET_COL]
    
    # 5. Criar preprocessador
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
        ])
    
    # 6. Dividir em treino e teste
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    logger.info(f"Split treino/teste: {X_train.shape[0]} / {X_test.shape[0]} amostras")
    
    # 7. Aplicar preprocessamento
    logger.info("Aplicando preprocessamento...")
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    # Criar modelo com o tipo especificado
    logger.info(f"Inicializando modelo {MODEL_TYPE}")
    from sklearn.linear_model import LinearRegression
    model_instance = LinearRegression(fit_intercept=True, n_jobs=-1)
    
    # Treinar modelo
    logger.info("Treinando modelo...")
    model_instance.fit(X_train_processed, y_train)
    
    # 8. Calcular métricas com o modelo treinado
    y_train_pred = model_instance.predict(X_train_processed)
    y_test_pred = model_instance.predict(X_test_processed)
    
    # Calcular métricas
    metrics = {
        "r2": r2_score(y_train, y_train_pred),
        "rmse": np.sqrt(mean_squared_error(y_train, y_train_pred)),
        "mae": mean_absolute_error(y_train, y_train_pred),
    }
    
    test_metrics = {
        "r2": r2_score(y_test, y_test_pred),
        "rmse": np.sqrt(mean_squared_error(y_test, y_test_pred)),
        "mae": mean_absolute_error(y_test, y_test_pred),
        "test_size": len(y_test),
        "train_size": len(y_train),
    }
    
    # Combinar métricas
    all_metrics = {"train": metrics, "test": test_metrics}
    
    # 9. Salvar modelo e metadados
    logger.info("Salvando modelo final...")
    
    # Preparar metadados adicionais
    model_data = {
        "model": model_instance,
        "preprocessor": preprocessor,  # Importante: salvar o preprocessador
        "columns": X.columns.tolist(),
        "metrics": all_metrics,
        "created_at": datetime.now().isoformat(),
        "target_unit": TARGET_UNIT,  # Importante para a API saber como interpretar o resultado
        "baseline_eur_per_kg": 1.5,  # Valor base para fallback
    }
    
    # Salvar modelo com backup
    model_filename = f"{MODEL_DIR}/modelo_custo_v5_{MODEL_TYPE}.joblib"
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Verificar se já existe modelo anterior e fazer backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if os.path.exists(model_filename):
        backup_name = f"{MODEL_DIR}/backup_{MODEL_TYPE}_{timestamp}.joblib"
        import shutil
        shutil.copy2(model_filename, backup_name)
        logger.info(f"🔁 Backup criado: {backup_name}")
    
    # Salvar novo modelo
    import joblib
    joblib.dump(model_data, model_filename)
    logger.info(f"✅ Modelo salvo em: {model_filename}")
    
    # 8. Mostrar resumo final
    logger.info("📊 Resumo de métricas:")
    logger.info(f"  - R² (treino): {metrics.get('r2', 0):.4f}")
    logger.info(f"  - RMSE (treino): {metrics.get('rmse', 0):.4f}")
    logger.info(f"  - R² (teste): {test_metrics.get('r2', 0):.4f}")
    logger.info(f"  - RMSE (teste): {test_metrics.get('rmse', 0):.4f}")
    logger.info(f"  - MAE (teste): {test_metrics.get('mae', 0):.4f}")
    
    # 9. Salvar métricas separadamente para referência
    metrics_file = f"{MODEL_DIR}/{MODEL_TYPE}_metrics_{timestamp}.json"
    with open(metrics_file, 'w') as f:
        json.dump(all_metrics, f, indent=2)
    logger.info(f"📝 Métricas salvas em: {metrics_file}")
    
    logger.info("Processo de treinamento concluído com sucesso! 🎉")
    
if __name__ == "__main__":
    main()
