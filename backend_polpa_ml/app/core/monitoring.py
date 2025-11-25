# app/core/monitoring.py
from __future__ import annotations
from typing import Any, Dict, Optional
import logging
import time

_logger = logging.getLogger("monitoring")

# Contadores simples em memória (opcional)
COUNTERS: Dict[str, int] = {"predictions": 0, "errors": 0}

def add_prediction_metric(
    model: str,
    latency_ms: float,
    ok: bool = True,
    **extra: Any,
) -> None:
    """Registra uma métrica de predição (no-op seguro)."""
    COUNTERS["predictions"] += 1
    _logger.info(
        "pred_metric model=%s latency_ms=%.1f ok=%s extra=%s",
        model, latency_ms, ok, extra,
    )

def add_error_metric(
    error: str,
    where: Optional[str] = None,
    **extra: Any,
) -> None:
    """Registra uma métrica de erro (no-op seguro)."""
    COUNTERS["errors"] += 1
    _logger.error("error_metric where=%s error=%s extra=%s", where, error, extra)
