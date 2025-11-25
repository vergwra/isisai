from typing import Dict, Optional, Literal
import logging

logger = logging.getLogger(__name__)

def fixed_rates() -> Dict[str, float]:
    """
    Retorna as taxas de câmbio fixas padrão.
    
    Returns:
        Dicionário com taxas de câmbio fixas
    """
    return {
        "BRL_EUR": 0.18,  # 1 BRL = 0.18 EUR
        "BRL_USD": 0.19,  # 1 BRL = 0.19 USD
        "EUR_BRL": 5.56,  # 1 EUR = 5.56 BRL
        "EUR_USD": 1.06,  # 1 EUR = 1.06 USD
        "USD_BRL": 5.25,  # 1 USD = 5.25 BRL
        "USD_EUR": 0.94,  # 1 USD = 0.94 EUR
    }

def build_rates(fx_brl_eur: Optional[float] = None,
                fx_eur_usd: Optional[float] = None) -> Dict[str, float]:
    """
    Constrói um dicionário coerente de taxas de câmbio com override opcional.
    
    Args:
        fx_brl_eur: Taxa EUR_BRL (quantos BRL por 1 EUR), se None usa valor fixo padrão
        fx_eur_usd: Taxa EUR_USD (quantos USD por 1 EUR), se None usa valor fixo padrão
    
    Returns:
        Dicionário com taxas de câmbio
    """
    r = dict(fixed_rates())
    
    # override do slider: EUR_BRL
    if fx_brl_eur is not None and fx_brl_eur > 0:
        r["EUR_BRL"] = fx_brl_eur
        r["BRL_EUR"] = 1.0 / fx_brl_eur
        logger.debug(f"FX override: EUR_BRL={fx_brl_eur}, BRL_EUR={r['BRL_EUR']:.6f}")
    elif fx_brl_eur is not None:
        logger.warning(f"Ignorando fx_brl_eur inválido: {fx_brl_eur}")
    
    # override do EUR_USD (preparação para futuro)
    if fx_eur_usd is not None and fx_eur_usd > 0:
        r["EUR_USD"] = fx_eur_usd
        r["USD_EUR"] = 1.0 / fx_eur_usd
        logger.debug(f"FX override: EUR_USD={fx_eur_usd}, USD_EUR={r['USD_EUR']:.6f}")
    elif fx_eur_usd is not None:
        logger.warning(f"Ignorando fx_eur_usd inválido: {fx_eur_usd}")
    
    # cruzados via pivot EUR
    r["USD_BRL"] = r["USD_EUR"] * r["EUR_BRL"]
    r["BRL_USD"] = 1.0 / r["USD_BRL"]
    
    return r

# Alias para retrocompatibilidade (deprecated)
def get_rates() -> Dict[str, float]:
    """
    DEPRECATED: Use build_rates() para novas implementações.
    Mantido por retrocompatibilidade.
    
    Returns:
        Taxas de câmbio padrão
    """
    return build_rates()

def convert(amount: float, to: str, from_: str = "EUR",
            rates: Optional[Dict[str, float]] = None) -> float:
    """
    Converte um valor entre moedas.
    
    Args:
        amount: Valor a ser convertido
        to: Moeda de destino
        from_: Moeda de origem (padrão: EUR)
        rates: Taxas de câmbio a usar, se None usa build_rates()
    
    Returns:
        Valor convertido
    """
    r = rates or build_rates()
    
    if from_ == to:
        return float(amount)
    
    pair = f"{from_}_{to}"
    if pair in r:
        return float(amount) * r[pair]
    
    # tenta via EUR como pivot
    if from_ != "EUR" and to != "EUR":
        try:
            return float(amount) * r[f"{from_}_EUR"] * r[f"EUR_{to}"] 
        except KeyError:
            pass
    
    raise ValueError(f"Sem rota de conversão para {pair}")

def get_exchange_rate_pair(from_currency: str, to_currency: str, 
                     rates: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    """
    Retorna o par de taxas de câmbio específico para uso no breakdown da resposta.
    
    Args:
        from_currency: Moeda de origem
        to_currency: Moeda de destino
        rates: Taxas de câmbio a usar, se None usa build_rates()
        
    Returns:
        Dicionário com par de taxas relevantes
    """
    r = rates or build_rates()
    
    # Para simplificar, retornamos sempre BRL_EUR e BRL_USD
    result = {
        "BRL_EUR": r.get("BRL_EUR", 0.18),
        "BRL_USD": r.get("BRL_USD", 0.19),
    }
        
    return result

def get_rates() -> dict:
    """Retorna dicionário com taxas agregadas para breakdown."""
    # Para simplificar, retornamos diretamente as taxas fixas
    # em vez de usar o cache e a lógica de refresh
    return {
        "BRL_EUR": 0.18,
        "BRL_USD": 0.20,
        "USD_BRL": 5.05,
        "EUR_BRL": 5.55,
    }
