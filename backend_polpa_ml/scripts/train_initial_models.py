"""
Script para treinar os modelos iniciais com os dados disponíveis.
"""
import sys
from pathlib import Path

# Adicionar o diretório raiz ao path
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

import pandas as pd
from app.ml.models.prediction import CustoModel
from app.core.config import settings

def prepare_dataset():
    """Prepara o dataset para treinamento."""
    # Carregar dataset
    dataset_path = root_dir / "data" / "datasets" / "dataset_api_alinhado_franca.csv"
    
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset não encontrado: {dataset_path}")
    
    print(f"Carregando dataset de {dataset_path}")
    df = pd.read_csv(dataset_path)
    
    print(f"Dataset carregado: {len(df)} registros")
    print(f"Colunas: {df.columns.tolist()}")
    
    # Renomear coluna target para o nome esperado pelo modelo
    if "target_couts_eur" in df.columns:
        df = df.rename(columns={"target_couts_eur": "custo_total_logistico_brl"})
        print("Coluna 'target_couts_eur' renomeada para 'custo_total_logistico_brl'")
    
    # Salvar dataset preparado
    prepared_path = root_dir / "data" / "datasets" / "dataset_prepared.csv"
    df.to_csv(prepared_path, index=False)
    print(f"Dataset preparado salvo em {prepared_path}")
    
    return prepared_path

def train_models():
    """Treina todos os modelos disponíveis."""
    # Preparar dataset
    dataset_path = prepare_dataset()
    
    # Modelos para treinar
    models_to_train = settings.AVAILABLE_MODELS
    
    print(f"\nTreinando {len(models_to_train)} modelos: {models_to_train}")
    
    results = {}
    
    for model_name in models_to_train:
        print(f"\n{'='*60}")
        print(f"Treinando modelo: {model_name}")
        print(f"{'='*60}")
        
        try:
            # Criar e treinar modelo
            model = CustoModel(model_type=model_name)
            metrics = model.train_from_file(str(dataset_path))
            
            results[model_name] = {
                "status": "success",
                "metrics": metrics
            }
            
            print(f"\n✅ Modelo {model_name} treinado com sucesso!")
            print(f"Métricas:")
            for metric, value in metrics.items():
                print(f"  - {metric}: {value:.4f}")
                
        except Exception as e:
            results[model_name] = {
                "status": "error",
                "error": str(e)
            }
            print(f"\n❌ Erro ao treinar modelo {model_name}: {str(e)}")
    
    # Resumo
    print(f"\n{'='*60}")
    print("RESUMO DO TREINAMENTO")
    print(f"{'='*60}")
    
    success_count = sum(1 for r in results.values() if r["status"] == "success")
    error_count = len(results) - success_count
    
    print(f"✅ Modelos treinados com sucesso: {success_count}")
    print(f"❌ Modelos com erro: {error_count}")
    
    if error_count > 0:
        print("\nModelos com erro:")
        for model_name, result in results.items():
            if result["status"] == "error":
                print(f"  - {model_name}: {result['error']}")
    
    return results

if __name__ == "__main__":
    print("Iniciando treinamento dos modelos...")
    print(f"Diretório de modelos: {settings.MODELS_DIR}")
    
    # Garantir que o diretório de modelos existe
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    results = train_models()
    
    print("\n✅ Treinamento concluído!")
