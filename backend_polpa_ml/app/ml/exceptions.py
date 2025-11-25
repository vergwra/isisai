class ModelNotFoundError(Exception):
    """Exceção lançada quando um modelo não é encontrado."""
    pass

class InvalidInputError(Exception):
    """Exceção lançada quando os dados de entrada são inválidos."""
    pass

class ModelTrainingError(Exception):
    """Exceção lançada quando há erro no treinamento do modelo."""
    pass

class FeatureEncodingError(Exception):
    """Exceção lançada quando há erro no encoding das features."""
    pass

class ExchangeRateError(Exception):
    """Exceção lançada quando há erro na obtenção de taxas de câmbio."""
    pass
