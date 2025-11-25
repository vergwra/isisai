import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from ml.utils import save_model_with_backup
from ml.preprocess import preprocessar_dados

MODEL_TYPES = ["linear_regression", "random_forest", "gradient_boosting", "mlp_regressor"]

def treinar_modelos(df: pd.DataFrame, model_types=MODEL_TYPES):
    """Treina e salva modelos com backup, retornando métricas."""
    if "custo_total_logistico_brl" not in df.columns:
        raise ValueError("Coluna alvo 'custo_total_logistico_brl' não encontrada.")

    df_processed = preprocessar_dados(df)
    X = df_processed.drop("custo_total_logistico_brl", axis=1)
    y = df_processed["custo_total_logistico_brl"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    modelos_treinados = {}

    for model_type in model_types:
        print(f"\n🔧 Treinando modelo: {model_type}")
        if model_type == "linear_regression":
            model = LinearRegression()
        elif model_type == "random_forest":
            model = RandomForestRegressor(n_estimators=180, random_state=42, n_jobs=-1, max_depth=22, min_samples_split=6)
        elif model_type == "gradient_boosting":
            model = GradientBoostingRegressor(n_estimators=150, learning_rate=0.1, max_depth=5, random_state=42)
        elif model_type == "mlp_regressor":
            model = MLPRegressor(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42, early_stopping=True)
        else:
            print(f"⚠️ Modelo não reconhecido: {model_type}")
            continue

        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        metrics = {
            "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 2),
            "mae": round(mean_absolute_error(y_test, y_pred), 2),
            "r2": round(r2_score(y_test, y_pred), 2)
        }

        save_model_with_backup(model, X_train.columns.tolist(), metrics, model_type)
        modelos_treinados[model_type] = metrics

    return modelos_treinados
