from fastapi import APIRouter, HTTPException
from typing import List, Dict
import os
import shutil
from datetime import datetime
from app.core.config import settings

router = APIRouter()

def _create_backup_filename():
    """Cria um nome de arquivo de backup com timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"backup_{timestamp}"

@router.post("/backup/create")
async def create_backup():
    """
    Cria um backup de todos os modelos treinados.
    """
    try:
        if not os.path.exists(settings.MODELS_DIR):
            raise HTTPException(status_code=404, detail="Diretório de modelos não encontrado")
        
        backup_name = _create_backup_filename()
        backup_path = os.path.join(settings.BACKUP_DIR, backup_name)
        
        # Criar diretório de backup
        os.makedirs(backup_path, exist_ok=True)
        
        # Copiar todos os arquivos .joblib
        files_copied = 0
        for filename in os.listdir(settings.MODELS_DIR):
            if filename.endswith(".joblib"):
                src = os.path.join(settings.MODELS_DIR, filename)
                dst = os.path.join(backup_path, filename)
                shutil.copy2(src, dst)
                files_copied += 1
        
        # Criar arquivo de metadados
        metadata = {
            "timestamp": datetime.now().isoformat(),
            "files_count": files_copied,
            "backup_name": backup_name
        }
        
        return {
            "message": "Backup criado com sucesso",
            "backup_name": backup_name,
            "files_backed_up": files_copied,
            "metadata": metadata
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar backup: {str(e)}")

@router.get("/backup/list", response_model=List[Dict])
async def list_backups():
    """
    Lista todos os backups disponíveis.
    """
    try:
        if not os.path.exists(settings.BACKUP_DIR):
            return []
        
        backups = []
        for dirname in os.listdir(settings.BACKUP_DIR):
            backup_path = os.path.join(settings.BACKUP_DIR, dirname)
            if os.path.isdir(backup_path) and dirname.startswith("backup_"):
                # Contar arquivos .joblib no backup
                files = [f for f in os.listdir(backup_path) if f.endswith(".joblib")]
                
                backups.append({
                    "name": dirname,
                    "created_at": datetime.strptime(dirname.split("_")[1], "%Y%m%d_%H%M%S").isoformat(),
                    "files_count": len(files),
                    "size_bytes": sum(os.path.getsize(os.path.join(backup_path, f)) for f in files)
                })
        
        return sorted(backups, key=lambda x: x["created_at"], reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar backups: {str(e)}")

@router.post("/backup/{backup_name}/restore")
async def restore_backup(backup_name: str):
    """
    Restaura um backup específico.
    """
    try:
        backup_path = os.path.join(settings.BACKUP_DIR, backup_name)
        if not os.path.exists(backup_path):
            raise HTTPException(status_code=404, detail=f"Backup {backup_name} não encontrado")
        
        # Limpar diretório de modelos atual
        for filename in os.listdir(settings.MODELS_DIR):
            if filename.endswith(".joblib"):
                os.remove(os.path.join(settings.MODELS_DIR, filename))
        
        # Restaurar arquivos do backup
        files_restored = 0
        for filename in os.listdir(backup_path):
            if filename.endswith(".joblib"):
                src = os.path.join(backup_path, filename)
                dst = os.path.join(settings.MODELS_DIR, filename)
                shutil.copy2(src, dst)
                files_restored += 1
        
        return {
            "message": f"Backup {backup_name} restaurado com sucesso",
            "files_restored": files_restored
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao restaurar backup: {str(e)}")

@router.delete("/backup/{backup_name}")
async def delete_backup(backup_name: str):
    """
    Remove um backup específico.
    """
    try:
        backup_path = os.path.join(settings.BACKUP_DIR, backup_name)
        if not os.path.exists(backup_path):
            raise HTTPException(status_code=404, detail=f"Backup {backup_name} não encontrado")
        
        shutil.rmtree(backup_path)
        return {"message": f"Backup {backup_name} removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover backup: {str(e)}")

@router.delete("/backup/cleanup/{days}")
async def cleanup_old_backups(days: int):
    """
    Remove backups mais antigos que o número de dias especificado.
    """
    try:
        if days < 1:
            raise HTTPException(status_code=400, detail="Número de dias deve ser maior que 0")
        
        cutoff_date = datetime.now().timestamp() - (days * 24 * 60 * 60)
        removed = 0
        
        for dirname in os.listdir(settings.BACKUP_DIR):
            backup_path = os.path.join(settings.BACKUP_DIR, dirname)
            if os.path.isdir(backup_path) and dirname.startswith("backup_"):
                created_at = os.path.getctime(backup_path)
                if created_at < cutoff_date:
                    shutil.rmtree(backup_path)
                    removed += 1
        
        return {
            "message": f"{removed} backups antigos removidos com sucesso",
            "backups_removed": removed
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar backups: {str(e)}")
