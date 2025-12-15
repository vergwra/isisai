from typing import Dict, Any, Optional, Union, Tuple
import pandas as pd
import numpy as np
from pathlib import Path
import logging
import os
from sklearn.linear_model import SGDRegressor, LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor 
from app.core.config import settings
from .base import BaseModel
from ..preprocessing.features import to_features
from app.schemas.predict import PredictRequest, PredictResponse, PredictResponseBreakdown, FxRates
from ..utils.fx import get_rates, convert, build_rates
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)

class ModelNotFoundError(Exception):
    """Exceção lançada quando o modelo solicitado não está disponível."""
    pass

class CustoModel(BaseModel):
    """Modelo para previsão de custos logísticos."""
    
    def __init__(self, model_type: str = settings.DEFAULT_MODEL):
        super().__init__(name=model_type)
        self._initialize_model()
        # Não carregamos automaticamente mais, isso será feito pelo método load_model
        
    def _initialize_model(self):
        """Inicializa o modelo com suporte a treinamento incremental quando possível."""
        if self.name == "linear_regression":
            self.model = SGDRegressor(
                loss='squared_error',
                learning_rate='adaptive',
                eta0=0.01,
                max_iter=1000,
                tol=1e-3
            )
        elif self.name == "linear_regression_sklearn":
            self.model = LinearRegression()
        elif self.name == "random_forest":
            self.model = RandomForestRegressor(**settings.MODEL_PARAMS["random_forest"])
        elif self.name == "gradient_boosting":
            self.model = GradientBoostingRegressor(**settings.MODEL_PARAMS["gradient_boosting"])
        elif self.name == "mlp":  # Nome corrigido para "mlp" conforme enum
            self.model = MLPRegressor(
                **settings.MODEL_PARAMS["mlp"],
                warm_start=True  # Permite treinamento incremental
            )
        else: 
            # Fallback para linear_regression
            logger.warning(f"Modelo '{self.name}' não reconhecido, usando linear_regression como fallback")
            self.name = "linear_regression"
            self.model = SGDRegressor(
                loss='squared_error',
                learning_rate='adaptive',
                eta0=0.01,
                max_iter=1000,
                tol=1e-3
            )
            
    @classmethod
    def load_model(cls, model_name: str, version: str = None) -> Tuple['CustoModel', bool, str]:
        """
        Carrega um modelo pelo nome e versão.
        
        Args:
            model_name: Nome do modelo
            version: Versão do modelo (opcional)
            
        Returns:
            Tupla (instância CustoModel, artifact_exists, artifact_path)
        """
        # Se a versão não for especificada, usamos a padrão das configurações
        if not version:
            version = settings.MODEL_VERSION
        
        # Garantir que model_name seja string (pode ser enum)
        # Verifica primeiro se tem atributo value (para Enums)
        if hasattr(model_name, 'value'):
            model_name_str = model_name.value
        elif isinstance(model_name, str):
            model_name_str = model_name
        else:
            model_name_str = str(model_name)
            
        # Criar instância do modelo
        model_instance = cls(model_type=model_name_str)
        
        # Construir caminho do artefato
        artifact_path = settings.MODELS_DIR / f"modelo_custo_{version}_{model_name_str}.joblib"
        
        # Verificar se o artefato existe
        artifact_exists = artifact_path.exists()
        
        # Tentar carregar o modelo
        if artifact_exists:
            try:
                model_instance.load(artifact_path)
                logger.info(f"Modelo '{model_name}' versão '{version}' carregado com sucesso de {artifact_path}")
            except Exception as e:
                artifact_exists = False
                logger.error(f"Erro ao carregar modelo '{model_name}' versão '{version}': {str(e)}")
                # Não propagamos a exceção, apenas marcamos o artefato como não existente
        else:
            logger.warning(f"Artefato do modelo '{model_name}' versão '{version}' não encontrado em {artifact_path}")
            
        return model_instance, artifact_exists, str(artifact_path)

    async def predict_request(self, payload: PredictRequest) -> Union[PredictResponse, Tuple[str, int]]:
        try:
            # 1) Carrega modelo
            model_instance, artifact_exists, artifact_path = self.load_model(
                model_name=payload.model_name,
                version=settings.MODEL_VERSION
            )
            if not artifact_exists:
                msg = f"Modelo '{payload.model_name}' não está disponível"
                logger.warning(msg)
                return msg, 503

            # 2) Colunas esperadas
            if getattr(model_instance, "feature_columns", None):
                expected_cols = list(model_instance.feature_columns)
            elif hasattr(model_instance.model, "feature_names_in_"):
                expected_cols = list(model_instance.model.feature_names_in_)
            else:
                expected_cols = [
                    "origem_porto","destino_porto","modal","tipo_produto",
                    "tipo_embalagem","container_tipo","container_tamanho",
                    "volume_ton","lead_time_days","taxes_pct","fuel_index",
                ]

            # Log diagnóstico das colunas
            logger.info(f"Expected columns: {expected_cols}")

            # 3) Monta linha exatamente com expected_cols
            row_full = {
                "origem_porto": payload.origem_porto,
                "destino_porto": payload.destino_porto,
                "modal": payload.modal,
                "tipo_produto": payload.tipo_produto,
                "tipo_embalagem": payload.tipo_embalagem,
                "container_tipo": payload.container_tipo,
                "container_tamanho": payload.container_tamanho,
                "volume_ton": payload.volume_ton,
                "lead_time_days": payload.lead_time_days,
                "taxes_pct": payload.taxes_pct,
                "fuel_index": payload.fuel_index,
            }
            X_df = pd.DataFrame([{col: row_full.get(col, None) for col in expected_cols}])
            logger.info(f"Input dataframe columns: {list(X_df.columns)}")

            # 4) Encoding e Predição
            # Se tivermos um processador salvo, usamos ele para transformar os dados
            if model_instance.processor:
                logger.info("Aplicando encoding com processador salvo")
                X_df = model_instance.processor.transform(X_df)
            else:
                logger.warning("Nenhum processador salvo encontrado. Tentando usar FeatureProcessor padrão (pode falhar se houver strings)")
                # Tentar usar um processador novo (fallback perigoso, mas melhor que nada)
                from ..preprocessing.features import FeatureProcessor
                proc = FeatureProcessor()
                # O transform do FeatureProcessor tem um fallback de hash para colunas não treinadas
                X_df = proc.transform(X_df)

            # Garantir que é float
            try:
                X_df = X_df.astype(float)
            except Exception as e:
                logger.error(f"Falha ao converter input para float: {e}")
                # Se falhar, vamos tentar converter apenas o que der
                pass

            pred_value = float(model_instance.model.predict(X_df)[0])

            # 5) Ajuste de unidade do alvo
            target_unit = (model_instance.metrics or {}).get("target_unit", "eur_per_kg")
            logger.debug(f"[predict] target_unit={target_unit}")
            if target_unit == "eur_per_kg":
                pred_value = pred_value * (payload.volume_ton * 1000.0)  # converte para EUR total

            # --- diagnóstico €/kg implícito + guard-rail ---
            try:
                kg = max(float(payload.volume_ton) * 1000.0, 1.0)  # evita div/0
                implied_unit = pred_value / kg  # EUR total / kg => €/kg implícito
            except Exception:
                implied_unit = None

            logger.info(f"[DEBUG] volume_ton from payload: {payload.volume_ton}")
            logger.info(f"[DEBUG] Calculated kg: {kg}")
            logger.info(f"[DEBUG] Raw model prediction (EUR): {pred_value}")
            
            logger.debug(
                f"[predict] total_eur={pred_value:.2f}, volume_ton={payload.volume_ton}, "
                + (f"implied_eur_per_kg={implied_unit:.6f}" if implied_unit is not None else "implied_eur_per_kg=NA")
            )

            # Guard-rail: faixa razoável de €/kg (ajuste conforme domínio)
            LOW, HIGH = 0.2, 20.0

            if implied_unit is not None and (implied_unit < LOW or implied_unit > HIGH):
                logger.warning(
                    f"[predict] €/kg fora do intervalo ({implied_unit:.2f}). Aplicando fallback para baseline."
                )
                baseline_unit = (model_instance.metrics or {}).get("baseline_eur_per_kg", 4.5)
                pred_value = baseline_unit * kg  # corrige o total
            # --- fim do guard-rail ---

            # 6) Evitar dupla contagem de multiplicadores
            cols_set = set(expected_cols)
            includes_multipliers = {"taxes_pct","fuel_index","lead_time_days"}.issubset(cols_set)
            if not includes_multipliers:
                tax_multiplier = 1.0 + (payload.taxes_pct / 100.0)
                lead_time_factor = 1.0 + (max(0, payload.lead_time_days - 30) * 0.01)
                pred_value = pred_value * tax_multiplier * payload.fuel_index * lead_time_factor
            else:
                tax_multiplier = 1.0
                lead_time_factor = 1.0

            # 7) Conversão de moeda (modelo atual está em EUR)
            final_value = pred_value
            if payload.output_currency != "EUR":
                final_value = convert(pred_value, payload.output_currency, "EUR")

            # 8) FX para breakdown (opcional)
            try:
                fx_rates = get_rates() or {}
                brl_eur = float(fx_rates.get("BRL_EUR", 0.0))
                brl_usd = float(fx_rates.get("BRL_USD", 0.0))
            except Exception:
                brl_eur = brl_usd = 0.0

            breakdown = PredictResponseBreakdown(
                model_used=payload.model_name,
                version=settings.MODEL_VERSION,
                tax_multiplier=tax_multiplier,
                fuel_index=payload.fuel_index,
                lead_time_days=payload.lead_time_days,
                fx_used=FxRates(BRL_EUR=brl_eur, BRL_USD=brl_usd),
                artifact_path=artifact_path,
            )

            response = PredictResponse(
                cost=round(final_value, 2),
                currency=payload.output_currency,
                breakdown=breakdown,
            )
            return response

        except Exception as e:
            err = f"Erro na predição: {str(e)}"
            logger.error(err, exc_info=True)
            return err, 500

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Realiza previsão de custo com base nos dados de entrada.
        
        Args:
            input_data: Dicionário com dados de entrada
            
        Returns:
            Dict com previsão e metadados
        """
        # Este método mantido para compatibilidade com código existente
        logger.warning("Usando método predict() legado. Prefira usar predict_request() com schema Pydantic")
        
        # Preprocessar dados
        df_input = pd.DataFrame([input_data])
        
        # Realizar previsão
        custo_brl = float(self.model.predict(df_input)[0])
        
        # Gerar explicações SHAP
        explanations = self.explain(df_input)
        
        # Conversão de moeda
        target_currency = input_data.get("target_currency", "BRL")
        
        # Taxas fixas para compatibilidade com método legado
        rates = {
            "USD_BRL": 5.0,
            "EUR_BRL": 5.5
        }
        
        conversion_rate = 1.0
        
        if target_currency == "USD":
            conversion_rate = 1 / rates["USD_BRL"]
        elif target_currency == "EUR":
            conversion_rate = 1 / rates["EUR_BRL"]
            
        custo_convertido = custo_brl * conversion_rate
        
        return {
            "custo_total_estimado": round(custo_convertido, 2),
            "custo_brl": round(custo_brl, 2),
            "moeda": target_currency,
            "modelo_utilizado": self.name,
            "metricas_modelo": self.metrics,
            "feature_importance": {k: float(v) for k, v in explanations["feature_importance"].items()},
            "timestamp": pd.Timestamp.now().isoformat()
        }
        
    def train(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        """
        Treina o modelo com novos dados.
        
        Args:
            X: Features (DataFrame com colunas categóricas e numéricas)
            y: Target (custo)
            
        Returns:
            Dict com métricas de performance
        """
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
        from ..preprocessing.features import FeatureProcessor
        
        logger.info(f"Iniciando treinamento com {len(X)} amostras")
        logger.info(f"Colunas recebidas: {X.columns.tolist()}")
        logger.info(f"Tipos originais: {X.dtypes.to_dict()}")
        
        # Calcular period_days se as colunas de data existirem
        if 'period_start' in X.columns and 'period_end' in X.columns:
            logger.info("Calculando period_days a partir de period_start e period_end")
            X['period_days'] = (
                pd.to_datetime(X['period_end'], format='%Y/%m/%d') - 
                pd.to_datetime(X['period_start'], format='%Y/%m/%d')
            ).dt.days
            # Remover as colunas de data originais
            X = X.drop(['period_start', 'period_end'], axis=1)
            logger.info(f"period_days calculado. Colunas após remoção de datas: {X.columns.tolist()}")
        
        # Remover outras colunas não utilizadas como features
        cols_to_remove = ['model_name', 'output_currency']
        for col in cols_to_remove:
            if col in X.columns:
                X = X.drop(col, axis=1)
                logger.info(f"Coluna '{col}' removida")
        
        # Aplicar encoding nas colunas categóricas
        processor = FeatureProcessor()
        X_encoded = processor.fit_transform(X)
        self.processor = processor  # Salvar o processador treinado
        
        logger.info(f"Dados após encoding: {X_encoded.shape}")
        logger.info(f"Tipos após encoding: {X_encoded.dtypes.to_dict()}")
        logger.info(f"Amostra dos dados:\n{X_encoded.head()}")
        
        # Converter para float (os dados já devem estar numéricos após o encoding)
        try:
            X_encoded = X_encoded.astype(float)
            logger.info("Conversão para float bem-sucedida")
        except Exception as e:
            logger.error(f"Erro ao converter para float: {str(e)}")
            logger.error(f"Colunas problemáticas: {X_encoded.select_dtypes(include=['object']).columns.tolist()}")
            raise ValueError(f"Erro ao converter dados para numérico: {str(e)}")
        
        # Remover linhas com NaN se houver
        mask = ~(X_encoded.isna().any(axis=1) | y.isna())
        X_encoded = X_encoded[mask]
        y_clean = y[mask]
        
        if len(X_encoded) == 0:
            raise ValueError("Nenhum dado válido após limpeza. Verifique o formato do arquivo.")
        
        logger.info(f"Dados após limpeza: {len(X_encoded)} amostras")
        
        # Ajustar test_size para datasets pequenos
        if len(X_encoded) < 10:
            # Para datasets muito pequenos, usar validação leave-one-out ou treinar com tudo
            logger.warning(f"Dataset pequeno ({len(X_encoded)} amostras). Treinando com todos os dados.")
            X_train = X_encoded
            X_test = X_encoded  # Usar os mesmos dados para teste (não ideal, mas funcional)
            y_train = y_clean
            y_test = y_clean
        else:
            # Para datasets maiores, usar split normal
            test_size = max(0.1, min(0.3, 2 / len(X_encoded)))  # Entre 10-30% ou mínimo 2 amostras
            X_train, X_test, y_train, y_test = train_test_split(
                X_encoded, y_clean, test_size=test_size, random_state=42
            )
            logger.info(f"Split: {len(X_train)} treino, {len(X_test)} teste")
        
        self.model.fit(X_train, y_train)
        self.feature_columns = X_encoded.columns.tolist()
        
        y_pred = self.model.predict(X_test)
        self.metrics = {
            "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
            "mae": float(mean_absolute_error(y_test, y_pred)),
            "r2": float(r2_score(y_test, y_pred))
        }
        
        return self.metrics

    def partial_fit(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        """
        Treina o modelo incrementalmente com novos dados.
        
        Args:
            X: Novas features para treinamento
            y: Novos valores target
            
        Returns:
            Dict com métricas atualizadas
        """
        if not hasattr(self.model, 'partial_fit') and not hasattr(self.model, 'warm_start'):
            raise ValueError(f"Modelo {self.name} não suporta treinamento incremental")
            
        # Garantir que as colunas estão corretas
        if not self.feature_columns:
            self.feature_columns = X.columns.tolist()
        else:
            X = X[self.feature_columns]
            
        # Treinar incrementalmente
        if hasattr(self.model, 'partial_fit'):
            self.model.partial_fit(X, y)
        else:
            # Para modelos com warm_start
            self.model.fit(X, y)
            
        # Atualizar métricas com os novos dados
        y_pred = self.model.predict(X)
        
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
        
        # Atualizar métricas considerando apenas os novos dados
        new_metrics = {
            "rmse": float(np.sqrt(mean_squared_error(y, y_pred))),
            "mae": float(mean_absolute_error(y, y_pred)),
            "r2": float(r2_score(y, y_pred))
        }
        
        # Atualizar contagem de amostras
        self.metrics["samples_seen"] = self.metrics.get("samples_seen", 0) + len(X)
        
        # Atualizar métricas gerais (média ponderada)
        alpha = len(X) / self.metrics["samples_seen"]  # Peso para as novas métricas
        for metric in ["rmse", "mae", "r2"]:
            self.metrics[metric] = (1 - alpha) * self.metrics.get(metric, 0) + alpha * new_metrics[metric]
        
        # Salvar modelo atualizado
        self.save()
        
        return self.metrics

    def train_from_file(
        self,
        data_path: str,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, float]:
        """
        Treina o modelo a partir de um arquivo CSV.
        
        Args:
            data_path: Caminho para o arquivo CSV
            test_size: Proporção dos dados para teste
            random_state: Seed para reprodutibilidade
            
        Returns:
            Dict com métricas de performance
        """
        logger.info(f"[train_from_file] Carregando dados de {data_path}")
        
        try:
            # Carregar dados
            df = pd.read_csv(data_path)
            self.n_samples = len(df)
            logger.info(f"[train_from_file] Dados carregados: {self.n_samples} amostras, colunas: {df.columns.tolist()}")
            logger.info(f"[train_from_file] Primeiras linhas:\n{df.head()}")
            
            # Separar features e target
            if "custo_total_logistico_brl" not in df.columns:
                raise ValueError("Coluna target 'custo_total_logistico_brl' não encontrada")
                
            # 1. Verificar colunas necessárias
            required_cols = ["custo_total_logistico_brl", "volume_ton"]
            missing = [c for c in required_cols if c not in df.columns]
            if missing:
                raise ValueError(f"Colunas obrigatórias faltando: {missing}")

            # 2. Garantir fx_brl_eur (se não existir, usar fallback ou erro?)
            # O usuário disse que fx_brl_eur ≈ 5.5, vamos tentar usar coluna se existir, senão 5.5
            if "fx_brl_eur" not in df.columns:
                logger.warning("Coluna 'fx_brl_eur' não encontrada. Usando valor fixo 5.5 para conversão.")
                df["fx_brl_eur"] = 5.5
            
            # 3. Calcular Target Unitário (EUR/kg)
            # volume_kg = volume_ton * 1000
            df["volume_kg"] = df["volume_ton"] * 1000.0
            
            # custo_total_eur = custo_total_logistico_brl / fx_brl_eur
            df["custo_total_eur"] = df["custo_total_logistico_brl"] / df["fx_brl_eur"]
            
            # custo_eur_por_kg = custo_total_eur / volume_kg
            # Evitar divisão por zero
            df["custo_eur_por_kg"] = df["custo_total_eur"] / df["volume_kg"].replace(0, 1)
            
            # 4. Filtragem e Limpeza
            initial_len = len(df)
            
            # Filtro de volume mínimo (500kg = 0.5 ton)
            df = df[df["volume_kg"] >= 500].copy()
            logger.info(f"Filtragem por volume (>= 500kg): {initial_len} -> {len(df)} registros")
            
            # Clipping do target [0.2, 25.0]
            df["custo_eur_por_kg"] = df["custo_eur_por_kg"].clip(lower=0.2, upper=25.0)
            logger.info("Target 'custo_eur_por_kg' limitado entre 0.2 e 25.0 EUR/kg")
            
            # 5. Preparar X e y
            # Remover colunas auxiliares e o target original
            cols_to_drop = [
                "custo_total_logistico_brl", "custo_total_eur", 
                "custo_eur_por_kg", "volume_kg"
            ]
            # Manter volume_ton em X pois é feature importante
            
            X = df.drop([c for c in cols_to_drop if c in df.columns], axis=1)
            y = df["custo_eur_por_kg"]
            
            logger.info(f"[train_from_file] Features shape: {X.shape}, Target shape: {y.shape}")
            logger.info(f"[train_from_file] Target stats: min={y.min()}, max={y.max()}, mean={y.mean()}")
            logger.info(f"[train_from_file] Tipos de dados em X:\n{X.dtypes}")
            
            # Treinar modelo (o método train() aplicará o encoding)
            metrics = self.train(X, y)
            
            # 6. Atualizar métricas com a unidade correta
            metrics["target_unit"] = "eur_per_kg"
            metrics["baseline_eur_per_kg"] = float(y.mean()) # Atualizar baseline com a média do treino
            self.metrics = metrics
            
            # Salvar modelo
            self.save()
            
            return metrics
            
        except Exception as e:
            logger.error(f"Erro ao treinar modelo a partir do arquivo: {str(e)}")
            raise Exception(f"Erro no treinamento: {str(e)}")
            
    def get_feature_importance(self) -> Dict[str, float]:
        """Retorna importância das features."""
        if self.model is None:
            raise ValueError("Modelo não treinado")
        if hasattr(self.model, "feature_importances_"):
            importance = self.model.feature_importances_
        elif hasattr(self.model, "coef_"):
            importance = np.abs(self.model.coef_)
        else:
            importance = np.ones(len(self.feature_columns)) / len(self.feature_columns)
        return dict(zip(self.feature_columns, importance))
