from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from datetime import datetime
import logging

# Create a logger
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.api.routes.predict import router as predict_router
from app.api.routes.train import router as train_router
from app.api.routes.versions import router as versions_router
from app.api.routes.monitoring import router as monitoring_router
from app.api.routes.backup import router as backup_router

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
        
    openapi_schema = get_openapi(
        title="API de Custos Logísticos - Polpa de Frutas",
        version="1.0.0",
        description="""
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
        * Random Forest
        * Gradient Boosting
        * MLP (Neural Network)
        
        ## Como Usar
        
        1. Use o endpoint `/api/v1/predict` para fazer previsões
        2. Use `/api/v1/train` para treinar com novos dados em lote
        3. Use `/api/v1/train/incremental` para adicionar dados incrementalmente
        4. Use `/api/v1/versions` para gerenciar versões dos modelos
        5. Use `/api/v1/monitoring` para acompanhar performance
        6. Use `/api/v1/backup` para gerenciar backups dos modelos
        """,
        routes=app.routes,
    )
    
    # Customizar tags
    openapi_schema["tags"] = [
        {
            "name": "predição",
            "description": "Operações de previsão de custos logísticos",
        },
        {
            "name": "treinamento",
            "description": "Operações de treinamento e atualização dos modelos",
        },
        {
            "name": "versões",
            "description": "Gerenciamento de versões dos modelos",
        },
        {
            "name": "monitoramento",
            "description": "Monitoramento de performance dos modelos",
        },
        {
            "name": "backup",
            "description": "Backup e restauração dos modelos",
        }
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app = FastAPI(
    title="API de Custos Logísticos - Polpa de Frutas",
    description="API para previsão de custos logísticos na cadeia de suprimentos de polpa de frutas",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configurar CORS
# Lista de origens permitidas, com suporte a env vars
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Se existe variável de ambiente, substituir a lista acima
import os
if os.environ.get("ALLOWED_ORIGINS"):
    ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS").split(",")
    logger.info(f"Usando origens permitidas da variável de ambiente: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Customizar OpenAPI
app.openapi = custom_openapi

# Incluir rotas
app.include_router(predict_router, prefix="/api/v1", tags=["predição"])
app.include_router(train_router, prefix="/api/v1", tags=["treinamento"])
app.include_router(versions_router, prefix="/api/v1", tags=["versões"])
app.include_router(monitoring_router, prefix="/api/v1", tags=["monitoramento"])
app.include_router(backup_router, prefix="/api/v1", tags=["backup"])

@app.get("/", tags=["monitoramento"])
async def root():
    """
    Retorna informações básicas sobre a API.
    
    Returns:
        dict: Informações sobre a API, incluindo versão e links para documentação
    """
    return {
        "name": "API de Custos Logísticos - Polpa de Frutas",
        "version": "1.0.0",
        "description": "API para previsão de custos logísticos na cadeia de suprimentos de polpa de frutas",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json"
    }

@app.get("/health", tags=["monitoramento"])
async def health_check():
    """
    Verifica a saúde da API.
    
    Returns:
        dict: Status atual da API e sua versão
    
    Raises:
        HTTPException: Se houver algum problema com a API
    """
    try:
        return {
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))