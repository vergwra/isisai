from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from app.schemas.predict import PredictRequest

class FeatureProcessor:
    """Processador de features para o modelo de custos."""
    
    def __init__(self):
        self.label_encoders = {}
        self.categorical_columns = [
            "origem_porto",
            "destino_porto",
            "modal",
            "tipo_produto",
            "tipo_embalagem",
            "container_tipo",
            "container_tamanho"
        ]
        
    def fit(self, df: pd.DataFrame) -> None:
        """
        Treina os encoders com os dados.
        
        Args:
            df: DataFrame com os dados
        """
        for col in self.categorical_columns:
            if col in df.columns:
                self.label_encoders[col] = LabelEncoder()
                self.label_encoders[col].fit(df[col].astype(str))
                
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transforma os dados aplicando os encoders.
        
        Args:
            df: DataFrame com os dados
            
        Returns:
            DataFrame transformado
        """
        df_transformed = df.copy()
        
        # Encoding categórico
        for col in self.categorical_columns:
            if col in df.columns:
                if col not in self.label_encoders:
                    # Quando o encoder não foi treinado, usamos o método determinístico
                    df_transformed[col] = df[col].astype(str).apply(lambda x: hash(x) % 100)  # Hash módulo 100
                else:
                    df_transformed[col] = self.label_encoders[col].transform(df[col].astype(str))
                
        return df_transformed
        
    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Treina os encoders e transforma os dados.
        
        Args:
            df: DataFrame com os dados
            
        Returns:
            DataFrame transformado
        """
        self.fit(df)
        return self.transform(df)

def preprocess_input(input_data: Dict[str, Any], feature_columns: List[str]) -> pd.DataFrame:
    """
    Preprocessa dados de entrada para previsão.
    
    Args:
        input_data: Dicionário com dados de entrada
        feature_columns: Lista de colunas esperadas pelo modelo
        
    Returns:
        DataFrame preprocessado
    """
    # Converter para DataFrame
    df = pd.DataFrame([input_data])
    
    # Remover colunas não usadas no modelo
    model_columns = [col for col in feature_columns if col in df.columns]
    df = df[model_columns]
    
    # Verificar colunas faltantes
    missing_cols = set(feature_columns) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Colunas ausentes: {missing_cols}")
    
    # Aplicar transformações
    processor = FeatureProcessor()
    df_processed = processor.fit_transform(df)
    
    return df_processed[feature_columns]

def to_features(payload: PredictRequest) -> np.ndarray:
    """
    Converte o payload de PredictRequest em features para o modelo.
    
    Args:
        payload: Objeto PredictRequest validado
        
    Returns:
        Array numpy com as features no formato esperado pelo modelo
    """
    # Ordem fixa de features para treino e inferência
    # Esta ordem deve ser mantida consistente entre treino e inferência
    feature_order = [
        "origem_porto",              # Categórico (encode)
        "destino_porto",             # Categórico (encode)
        "modal",                     # Categórico (encode)
        "volume_ton",                # Numérico
        "tipo_produto",              # Categórico (encode)
        "tipo_embalagem",            # Categórico (encode)
        "container_tipo",            # Categórico (encode)
        "container_tamanho",         # Categórico (encode)
        "fuel_index",                # Numérico
        "taxes_pct",                 # Numérico
        "fx_brl_eur",                # Numérico
        "lead_time_days",            # Numérico
        "period_days"                # Numérico (calculado de period_start e period_end)
    ]
    
    # Converter o payload para dicionário
    data_dict = payload.model_dump()
    
    # Calcular features derivadas
    if "period_start" in data_dict and "period_end" in data_dict:
        start_date = pd.to_datetime(data_dict["period_start"], format="%Y/%m/%d")
        end_date = pd.to_datetime(data_dict["period_end"], format="%Y/%m/%d")
        data_dict["period_days"] = (end_date - start_date).days
    else:
        data_dict["period_days"] = 30  # Valor padrão
    
    # Criar DataFrame com uma linha
    df = pd.DataFrame([data_dict])
    
    # Remover colunas não utilizadas como features
    cols_to_remove = ["period_start", "period_end", "model_name", "output_currency"]
    for col in cols_to_remove:
        if col in df:
            df = df.drop(columns=[col])
    
    # Aplicar encoding categórico
    processor = FeatureProcessor()
    
    # Encoding determinístico para valores categóricos
    for col in processor.categorical_columns:
        if col in df.columns:
            # Modal
            if col == "modal":
                modal_map = {"maritimo": 0, "aereo": 1, "rodoviario": 2}
                df[col] = df[col].map(modal_map).fillna(0)
            # Container tamanho
            elif col == "container_tamanho":
                tamanho_map = {"20ft": 0, "40ft": 1}
                df[col] = df[col].map(tamanho_map).fillna(0)
            # Tipo de container
            elif col == "container_tipo":
                container_map = {"dry": 0, "reefer": 1, "open_top": 2, "flat_rack": 3}
                df[col] = df[col].map(container_map).fillna(0)
            # Tipo de embalagem
            elif col == "tipo_embalagem":
                embalagem_map = {"containerizado": 0, "paletizado": 1, "caixas": 2, "bags": 3}
                df[col] = df[col].map(embalagem_map).fillna(0)
            # Para outros campos, usamos hash módulo 100
            else:
                df[col] = df[col].astype(str).apply(lambda x: hash(x) % 100)
    
    # Garantir que todas as colunas necessárias estejam presentes
    for col in feature_order:
        if col not in df.columns:
            raise ValueError(f"Coluna obrigatória ausente: {col}")
    
    # Reordenar colunas na ordem esperada pelo modelo
    df = df[feature_order]
    
    # Converter para array numpy
    return df.values.astype(np.float32)

def get_feature_order() -> List[str]:
    """
    Retorna a ordem padrão das features usadas pelo modelo.
    
    Returns:
        Lista de nomes de features na ordem correta
    """
    return [
        "origem_porto",
        "destino_porto",
        "modal",
        "volume_ton",
        "tipo_produto",
        "tipo_embalagem",
        "container_tipo",
        "container_tamanho",
        "fuel_index",
        "taxes_pct",
        "fx_brl_eur",
        "lead_time_days",
        "period_days"
    ]
