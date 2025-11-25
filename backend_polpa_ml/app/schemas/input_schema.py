from pydantic import BaseModel, ConfigDict
from typing import Literal

class PrevisaoRequest(BaseModel):
    porto_origem: str
    porto_destino: str
    modal_logistico: str
    volume_carga_ton: float
    tipo_produto: str
    tipo_embalagem: str
    container_type: str
    container_size: str
    preco_combustivel_indice: float
    taxas_impostos_percent: float
    cambio_brl_eur_estimado: float
    prazo_entrega_dias: int
    data_previsao_inicio: str
    data_previsao_fim: str
    target_currency: Literal["BRL", "USD", "EUR"] = "BRL"
    model_type: Literal["linear_regression", "random_forest", "gradient_boosting", "mlp_regressor"] = "random_forest"