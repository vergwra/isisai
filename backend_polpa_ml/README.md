# API de Custos Logísticos - Polpa de Frutas

API para previsão de custos logísticos na cadeia de suprimentos de polpa de frutas.

## Funcionalidades

* Previsão de custos logísticos usando múltiplos modelos de ML
* Treinamento incremental de modelos
* Suporte a múltiplas moedas (BRL, USD, EUR)
* Explicabilidade com SHAP
* Versionamento de modelos com histórico
* Monitoramento de performance em tempo real
* Sistema de backup e restauração de modelos

## Modelos Disponíveis

* Linear Regression (com SGD para treinamento incremental)
* Linear Regression (implementação padrão do scikit-learn para treinamento em lote)
* Random Forest
* Gradient Boosting
* MLP (Neural Network)

## Requisitos

- Python 3.8+
- FastAPI
- Uvicorn
- pandas
- scikit-learn
- joblib
- shap

## Instalação

1. Clone o repositório
2. Instale as dependências:

```bash
pip install -r requirements.txt
```

## Configuração

### Variáveis de Ambiente

A API suporta as seguintes variáveis de ambiente:

| Variável | Descrição | Valor Padrão |
| --- | --- | --- |
| ALLOWED_ORIGINS | Lista de origens permitidas para CORS, separadas por vírgula | http://localhost:3000,http://127.0.0.1:3000 |
| MODEL_DIR | Diretório onde os modelos são salvos | data/models |
| LOG_LEVEL | Nível de logging | INFO |

### Exemplo de arquivo .env

```
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://meu-frontend.com
MODEL_DIR=data/models
LOG_LEVEL=DEBUG
```

## Executando a API

Para executar a API localmente:

```bash
uvicorn app.main:app --reload
```

A API estará disponível em http://localhost:8000

## Endpoints Principais

- `GET /`: Informações sobre a API
- `GET /health`: Verificação de saúde da API
- `POST /api/v1/predict`: Previsão de custo logístico
- `POST /api/v1/train`: Treina modelos com novos dados
- `POST /api/v1/train/incremental`: Adiciona dados de treinamento incrementalmente
- `GET /api/v1/versions`: Lista versões disponíveis dos modelos
- `GET /api/v1/monitoring`: Métricas de monitoramento

## Testando CORS

Para testar se o CORS está corretamente configurado, você pode executar:

```bash
curl -i -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type,authorization" http://127.0.0.1:8000/api/v1/predict
```

O resultado esperado deve incluir:
```
HTTP/1.1 200 OK
access-control-allow-origin: http://localhost:3000
access-control-allow-methods: POST
access-control-allow-headers: content-type,authorization
access-control-max-age: 600
```

## Exemplo de Payload para /api/v1/predict

```json
{
  "container_tamanho": "20ft",
  "container_tipo": "Reefer",
  "destino_porto": "Rotterdam",
  "fuel_index": 1.5,
  "fx_brl_eur": 4.95,
  "lead_time_days": 56,
  "modal": "marítimo",
  "model_name": "random_forest",
  "origem_porto": "Paranaguá",
  "output_currency": "BRL",
  "period_end": "2025/10/16",
  "period_start": "2025/09/16",
  "taxes_pct": 15,
  "tipo_embalagem": "containerizado",
  "tipo_produto": "polpa de acerola",
  "volume_ton": 1000
}
```
