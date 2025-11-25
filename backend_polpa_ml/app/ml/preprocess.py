import pandas as pd
from datetime import datetime

# Colunas categóricas que devem virar dummies
CATEGORICAL_COLS = [
    "porto_origem", "porto_destino", "modal_logistico", "tipo_produto",
    "tipo_embalagem", "container_type", "container_size"
]

def preprocessar_dados(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pré-processa o DataFrame de treino, convertendo categóricas em dummies.
    """
    df = df.copy()
    
    # Garantir que colunas categóricas existem
    for col in CATEGORICAL_COLS:
        if col not in df.columns:
            raise ValueError(f"Coluna categórica esperada não encontrada: {col}")
    
    df = pd.get_dummies(df, columns=CATEGORICAL_COLS, drop_first=True)
    return df

def preprocessar_input(input_data: dict, model_columns: list) -> pd.DataFrame:
    """
    Pré-processa os dados de entrada (único input) para fazer previsão.
    Garante que as colunas estejam alinhadas com o modelo treinado.
    """
    df = pd.DataFrame([input_data])

    # Processa datas para gerar features temporais
    try:
        data_inicio = pd.to_datetime(df["data_previsao_inicio"].iloc[0])
        data_fim = pd.to_datetime(df["data_previsao_fim"].iloc[0])
        data_media = data_inicio + (data_fim - data_inicio) / 2
    except Exception as e:
        raise ValueError(f"Erro ao processar datas: {e}")

    df["ano"] = data_media.year
    df["mes"] = data_media.month
    df["dia_do_ano"] = data_media.dayofyear
    df["dia_da_semana"] = data_media.dayofweek
    df["semana_do_ano"] = data_media.isocalendar().week

    # Remove as datas originais
    df = df.drop(columns=["data_previsao_inicio", "data_previsao_fim"], errors="ignore")

    # Dummies
    df = pd.get_dummies(df, columns=CATEGORICAL_COLS, drop_first=True)

    # Adiciona colunas ausentes
    for col in model_columns:
        if col not in df.columns:
            df[col] = 0

    # Remove colunas extras
    df = df.reindex(columns=model_columns, fill_value=0)

    return df
