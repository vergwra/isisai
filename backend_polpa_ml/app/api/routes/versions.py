from fastapi import APIRouter, HTTPException
from typing import List, Dict
import os
from datetime import datetime
from app.core.config import settings

router = APIRouter()

@router.get("/versions", response_model=List[Dict])
async def list_versions():
    """
    Lista todas as versões disponíveis dos modelos.
    """
    try:
        versions = []
        for filename in os.listdir(settings.MODELS_DIR):
            if filename.endswith(".joblib"):
                file_path = os.path.join(settings.MODELS_DIR, filename)
                versions.append({
                    "version": filename.replace(".joblib", ""),
                    "created_at": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                    "size": os.path.getsize(file_path)
                })
        return sorted(versions, key=lambda x: x["created_at"], reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar versões: {str(e)}")

@router.get("/versions/latest")
async def get_latest_version():
    """
    Retorna a versão mais recente do modelo.
    """
    try:
        versions = await list_versions()
        if not versions:
            raise HTTPException(status_code=404, detail="Nenhuma versão encontrada")
        return versions[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter última versão: {str(e)}")

@router.delete("/versions/{version}")
async def delete_version(version: str):
    """
    Remove uma versão específica do modelo.
    """
    try:
        file_path = os.path.join(settings.MODELS_DIR, f"{version}.joblib")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Versão {version} não encontrada")
        
        os.remove(file_path)
        return {"message": f"Versão {version} removida com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover versão: {str(e)}")
