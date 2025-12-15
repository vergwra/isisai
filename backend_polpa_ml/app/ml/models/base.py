from abc import ABC, abstractmethod
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import shap

from app.core.config import settings

class BaseModel(ABC):
    """Classe base para todos os modelos de previsão."""
    
    def __init__(self, name: str):
        self.name = name
        self.model = None
        self.processor = None  # Adicionado para persistência do encoder
        self.feature_columns: List[str] = []
        self.metrics: Dict[str, float] = {}
        self.version = settings.MODEL_VERSION
        
    @abstractmethod
    def train(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        """Treina o modelo e retorna métricas."""
        pass
        
    def save(self, path: Path = None) -> None:
        """Salva o modelo treinado com seus metadados (formato dict compatível)."""
        if not path:
            # Garantir que self.name seja string (pode ser enum)
            if hasattr(self.name, 'value'):
                model_name_str = self.name.value
            elif isinstance(self.name, str):
                model_name_str = self.name
            else:
                model_name_str = str(self.name)
            path = settings.MODELS_DIR / f"modelo_custo_{self.version}_{model_name_str}.joblib"

        path.parent.mkdir(parents=True, exist_ok=True)

        model_data = {
            "model": self.model,
            "processor": self.processor,  # Salvando o processador
            "columns": self.feature_columns,   # mantemos a chave 'columns' por compatibilidade
            "metrics": self.metrics,
            "version": self.version,
            "name": self.name,
            "timestamp": pd.Timestamp.now().isoformat(),
        }
        joblib.dump(model_data, path)

    def load(self, path: Path = None) -> None:
        """Carrega um modelo salvo. Aceita artefato em dict ou estimador puro."""
        if not path:
            # Garantir que self.name seja string (pode ser enum)
            if hasattr(self.name, 'value'):
                model_name_str = self.name.value
            elif isinstance(self.name, str):
                model_name_str = self.name
            else:
                model_name_str = str(self.name)
            path = settings.MODELS_DIR / f"modelo_custo_{self.version}_{model_name_str}.joblib"

        if not path.exists():
            raise FileNotFoundError(f"Modelo não encontrado: {path}")

        obj = joblib.load(path)

        if isinstance(obj, dict):
            # Formato novo/compatível (o que você já tem no disco)
            self.model = obj.get("model", None)
            self.processor = obj.get("processor", None)  # Carregando o processador
            # aceitar tanto 'columns' quanto 'feature_columns'
            self.feature_columns = obj.get("columns", obj.get("feature_columns", []))
            self.metrics = obj.get("metrics", {})
            self.version = obj.get("version", self.version)
            self.name = obj.get("name", self.name)
        else:
            # Artefato antigo: estimador puro
            self.model = obj
            # tentar inferir colunas se o estimador tiver isso salvo
            cols = getattr(self.model, "feature_names_in_", None)
            self.feature_columns = list(cols) if cols is not None else []

        if self.model is None:
            raise ValueError(f"Artefato inválido em {path}: não encontrei 'model'.")

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Realiza previsões de forma robusta a falta de 'feature_columns'."""
        if self.model is None:
            raise ValueError("Modelo não treinado/carregado")

        # Se X não for DataFrame, tenta converter
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        if self.feature_columns:
            missing_cols = set(self.feature_columns) - set(X.columns)
            if missing_cols:
                raise ValueError(f"Colunas ausentes: {missing_cols}")
            X_in = X[self.feature_columns]
        else:
            # Sem colunas salvas → usar tudo que veio
            X_in = X

        return self.model.predict(X_in)  
             
    def explain(self, X: pd.DataFrame) -> Dict[str, Any]:
        """Gera explicações SHAP para as previsões."""
        if hasattr(self.model, "feature_importances_"):
            explainer = shap.TreeExplainer(self.model)
        else:
            explainer = shap.KernelExplainer(self.model.predict, X[self.feature_columns])
            
        shap_values = explainer.shap_values(X[self.feature_columns])
        
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
            
        return {
            "feature_importance": dict(zip(self.feature_columns, shap_values)),
            "base_value": explainer.expected_value if isinstance(explainer.expected_value, float) 
                         else explainer.expected_value[0]
        }
