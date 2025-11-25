"""
TODOs para Implementação da Rota /train e Pipeline de Treinamento
================================================================

Este documento lista as próximas etapas necessárias para implementar um pipeline 
completo de treinamento de modelos quando dados reais estiverem disponíveis.

## Pré-requisitos

1. Dataset real de custos logísticos com features alinhadas ao schema PredictRequest
2. Definição clara das métricas de avaliação dos modelos
3. Requisitos de performance (tempo de treinamento, uso de recursos)
4. Requisitos de segurança para acesso à rota de treinamento

## Implementação da Rota /train

1. Criar schema TrainRequest em `app/schemas/train.py`:
   - Parâmetros para configuração de treinamento (hiperparâmetros)
   - Flag para treinamento incremental vs. completo
   - Seleção de modelo a ser treinado
   - Controle de versão para o modelo resultante

2. Criar schema TrainResponse em `app/schemas/train.py`:
   - Métricas do modelo treinado (RMSE, MAE, R²)
   - Tempo de treinamento
   - Versão do modelo gerado
   - Caminhos para artefatos salvos

3. Implementar rota em `app/api/routes/train.py`:
   - Endpoint POST /train protegido por autenticação
   - Validação dos parâmetros de treinamento
   - Delegação para o serviço de treinamento
   - Tratamento de erros e logging
   - Integração com sistema de monitoramento

4. Configurar autenticação para a rota:
   - Implementar middleware de autenticação
   - Definir políticas de acesso (quem pode treinar modelos)

## Pipeline de Treinamento

1. Criar módulo `app/ml/training/pipeline.py`:
   - Implementar classe `TrainingPipeline`
   - Método para carregar e preparar dados
   - Método para pré-processamento consistente com `features.py`
   - Método para treinamento com validação cruzada
   - Método para avaliação e geração de métricas
   - Método para persistência do modelo com versionamento
   - Integração com sistema de explicabilidade SHAP

2. Implementar validação de dados em `app/ml/training/validation.py`:
   - Detecção de outliers
   - Verificação de distribuição das features
   - Alerta para dados faltantes ou mal formados
   - Verificação de drift de dados

3. Implementar serviço de treinamento em `app/services/training.py`:
   - Orquestração do processo completo de treinamento
   - Registro de métricas e artefatos
   - Notificação de conclusão
   - Implementação de backups automáticos

4. Criar CLI para treinamento em `scripts/train_model.py`:
   - Interface para treinar modelos via linha de comando
   - Parâmetros equivalentes ao endpoint /train
   - Opções de debug e logging verboso
   - Suporte para ambiente de CI/CD

## Sistema de Versionamento

1. Estender `app/ml/utils/versioning.py`:
   - Implementar controle de versão semântico
   - Registro de alterações entre versões
   - Histórico de modelos treinados
   - Mecanismos para comparação de modelos

2. Implementar rotação e expiração de modelos:
   - Política de retenção de modelos antigos
   - Arquivamento de modelos não utilizados
   - Recuperação de modelos arquivados quando necessário

## Monitoramento e Feedback Loop

1. Estender sistema de monitoramento para treinamento:
   - Métricas de uso de recursos durante treinamento
   - Tempo de execução por etapa do pipeline
   - Alertas para degradação de performance

2. Implementar coleta de feedback:
   - Mecanismo para registrar acurácia das previsões
   - Feedback de usuários sobre qualidade das previsões
   - Incorporação de feedback no próximo ciclo de treinamento

## Testes

1. Criar testes para rota /train em `tests/test_train.py`:
   - Teste de aceitação da rota
   - Validação de permissões
   - Verificação de resposta de sucesso e erro

2. Criar testes para pipeline em `tests/ml/test_pipeline.py`:
   - Teste unitário para cada componente do pipeline
   - Teste de integração com dados sintéticos
   - Benchmarks de performance

## Documentação

1. Atualizar documentação da API para incluir rota /train:
   - Descrição completa dos parâmetros
   - Exemplos de uso com curl e Python
   - Explicação do processo de treinamento

2. Criar documentação do pipeline:
   - Arquitetura e fluxo de dados
   - Instruções para configuração de ambiente
   - Guia para adição de novos modelos

## CI/CD

1. Configurar pipeline CI/CD para treinamento:
   - Treinamento automático com novos dados
   - Validação automática de modelos treinados
   - Implantação apenas se métricas forem melhores
   - Rollback automatizado em caso de degradação de performance

## Priorização Sugerida

1. Esquemas TrainRequest/TrainResponse
2. Implementação básica da TrainingPipeline
3. Serviço de orquestração de treinamento
4. Rota /train com autenticação básica
5. Testes unitários e de integração
6. Monitoramento e logging
7. Versionamento avançado e rotação
8. Feedback loop
9. CI/CD para treinamento automático
"""
