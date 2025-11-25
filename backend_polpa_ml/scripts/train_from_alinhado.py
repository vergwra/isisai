# scripts/train_from_alinhado.py
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from joblib import dump

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.compose import TransformedTargetRegressor
from sklearn.model_selection import GroupKFold, KFold, train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error

from app.core.config import settings  # usa suas pastas/versão

# =========
# DADOS
# =========
# 1) se for UM arquivo:
CSV = Path("data/datasets/dataset_api_alinhado_franca.csv")

# 2) (opcional) se tiver vários CSVs, descomente este bloco para mesclar tudo:
# import glob
# files = glob.glob("data/datasets/dataset_api_alinhado_franca*.csv")
# df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)

df = pd.read_csv(CSV)

# alvo total em EUR (igual o transform gerou)
TARGET = "target_couts_eur"

# colunas no padrão da sua API (iguais às que o transform escreve)
CATS = [
    "origem_porto","destino_porto","modal","tipo_produto",
    "tipo_embalagem","container_tipo","container_tamanho"
]
NUMS = ["volume_ton","lead_time_days","taxes_pct","fuel_index"]
# OBS: se futuramente treinar "alvo base", você pode tirar taxes/fuel de NUMS.

# limpeza básica
df = df.dropna(subset=[TARGET]).copy()
for c in NUMS:
    if c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="coerce")

# =========
# PIPELINE
# =========
num_pipe = Pipeline([
    ("imp", SimpleImputer(strategy="median")),
    ("sc", RobustScaler()),
])
cat_pipe = Pipeline([
    ("imp", SimpleImputer(strategy="most_frequent")),
    ("ohe", OneHotEncoder(handle_unknown="ignore")),
])

pre = ColumnTransformer([
    ("num", num_pipe, [c for c in NUMS if c in df.columns]),
    ("cat", cat_pipe, [c for c in CATS if c in df.columns]),
])

rf = RandomForestRegressor(
    n_estimators=400,
    max_depth=12,
    min_samples_leaf=2,
    n_jobs=-1,
    random_state=42,
)

model = TransformedTargetRegressor(
    regressor=Pipeline([("pre", pre), ("rf", rf)]),
    func=np.log1p, inverse_func=np.expm1
)

X_cols = [c for c in CATS + NUMS if c in df.columns]
X = df[X_cols]
y = df[TARGET].astype(float)

# agrupamento por rota (evita vazamento)
groups = (df["origem_porto"].astype(str) + "_" + df["destino_porto"].astype(str))
n_groups = groups.nunique()

rmse, mae = [], []

if n_groups >= 3:
    n_splits = min(5, n_groups)
    splitter = GroupKFold(n_splits=n_splits).split(X, y, groups=groups)
    cv_name = f"GroupKFold(n_splits={n_splits})"

elif len(df) >= 4:
    # fallback: KFold quando não há grupos suficientes
    n_splits = min(3, len(df))
    n_splits = max(2, n_splits)  # KFold precisa de pelo menos 2
    splitter = KFold(n_splits=n_splits, shuffle=True, random_state=42).split(X, y)
    cv_name = f"KFold(shuffle, n_splits={n_splits})"

elif len(df) >= 3:
    # fallback: holdout 80/20
    cv_name = "Holdout 80/20"
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    rmse.append(float(np.sqrt(mean_squared_error(yte, pred))))
    mae.append(float(mean_absolute_error(yte, pred)))
    splitter = None
else:
    cv_name = "Sem CV (dados insuficientes)"
    splitter = None

if splitter is not None:
    for tr, te in splitter:
        model.fit(X.iloc[tr], y.iloc[tr])
        pred = model.predict(X.iloc[te])
        rmse.append(float(np.sqrt(mean_squared_error(y.iloc[te], pred))))
        mae.append(float(mean_absolute_error(y.iloc[te], pred)))

metrics = {
    "cv_strategy": cv_name,
    "rmse_cv_mean": float(np.mean(rmse)) if rmse else None,
    "rmse_cv_std": float(np.std(rmse)) if rmse else None,
    "mae_cv_mean": float(np.mean(mae)) if mae else None,
    "mae_cv_std": float(np.std(mae)) if mae else None,
    "n_samples": int(len(df)),
    "n_groups": int(n_groups),
    "target_unit": "eur_total",  # Explicitamente indica que o alvo é EUR total (não EUR/kg)
}

# treino final em 100% dos dados
model.fit(X, y)

# =========
# SALVAR ARTEFATO (formato compatível com sua API)
# =========
payload = {
    "model": model,                # Pipeline completo
    "columns": X_cols,             # colunas que o pipeline espera
    "metrics": metrics,
    "version": settings.MODEL_VERSION,
    "name": "random_forest",       # renomeie se quiser diferenciar (ex.: random_forest_france_total)
    "timestamp": datetime.utcnow().isoformat(),
}

out = settings.MODELS_DIR / f"modelo_custo_{settings.MODEL_VERSION}_random_forest.joblib"
out.parent.mkdir(parents=True, exist_ok=True)
dump(payload, out)

print("✅ Artefato salvo em:", out.resolve())
print("📊 Métricas:", metrics)
