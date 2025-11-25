from fastapi import APIRouter
from app.api.routes import predict, train, versions, monitoring, backup

router = APIRouter()

# Incluir todas as sub-rotas
router.include_router(predict.router)
router.include_router(train.router)
router.include_router(versions.router)
router.include_router(monitoring.router)
router.include_router(backup.router)