# scripts/train_and_save.py  (rode a partir da raiz do repo)
from pathlib import Path
import pandas as pd
from joblib import dump
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from app.core.config import settings

# 🔧 ajuste para seu caminho real
DATASET = settings.DATA_DIR / "datasets" / "train.csv"
TARGET = "custo"  # 🔧 coluna alvo

if not DATASET.exists():
    raise FileNotFoundError(f"Dataset não encontrado: {DATASET}")

df = pd.read_csv(DATASET)
if TARGET not in df.columns:
    raise ValueError(f"Alvo '{TARGET}' não encontrado. Colunas: {list(df.columns)}")

X = df.drop(columns=[TARGET])
y = df[TARGET].values

def make_model(name: str):
    if name == "linear_regression":
        return Pipeline([("scaler", StandardScaler()), ("reg", LinearRegression())])
    elif name == "random_forest":
        return RandomForestRegressor(n_estimators=300, random_state=42)
    elif name == "gradient_boosting":
        return GradientBoostingRegressor(random_state=42)
    elif name == "mlp":
        return Pipeline([("scaler", StandardScaler()),
                         ("reg", MLPRegressor(hidden_layer_sizes=(64,64),
                                              max_iter=500, random_state=42))])
    else:
        raise ValueError(f"Modelo desconhecido: {name}")

name = settings.DEFAULT_MODEL
model = make_model(name)
model.fit(X, y)

out = settings.MODELS_DIR / f"modelo_custo_{settings.MODEL_VERSION}_{name}.joblib"
out.parent.mkdir(parents=True, exist_ok=True)
dump(model, out)
print("✅ Modelo salvo em:", out.resolve())
