"""
FairAI · Column Detection Helper
=================================
Replaces the previous Groq/LLM-based detection with a fully local,
heuristic approach using the SensitiveAttributeDetector.

Returns the same JSON shape as before so the rest of the app is unaffected:
    {
        "target_column":    "loan_status",
        "sensitive_column": "gender",          # highest-scoring sensitive col
        "sensitive_columns": [...],            # ALL flagged sensitive cols
        "detection_report": { ... }            # full structured report
    }
"""

import pandas as pd
from utils.sensitive_detector import (
    SensitiveAttributeDetector,
    _detect_target_column,
)


def detect_columns(df: pd.DataFrame, threshold: float = 20.0) -> dict:
    """
    Locally detect the target column and sensitive attribute(s) from a DataFrame.

    Parameters
    ----------
    df        : The dataset to inspect.
    threshold : Sensitivity score threshold (0–100). Default 20.

    Returns
    -------
    dict with keys:
        target_column    – heuristically detected prediction target
        sensitive_column – top-scoring sensitive attribute (or None)
        sensitive_columns – all columns flagged as sensitive
        detection_report  – full structured output from DetectionReport.to_dict()
    """
    # Step 1: detect the target column (heuristic, no LLM needed)
    target_col = _detect_target_column(df)

    # Step 2: run the sensitive attribute detector on all columns
    detector = SensitiveAttributeDetector(threshold=threshold)
    report = detector.analyse(df)

    sensitive_cols = report.sensitive_columns

    # Step 3: pick the single "best" sensitive column
    # Prefer columns that are not the target, ranked by score
    best_sensitive = None
    for r in report.sensitive_results:
        if r.column != target_col:
            best_sensitive = r.column
            break

    # If every sensitive column happens to be the target, just take the top one
    if best_sensitive is None and sensitive_cols:
        best_sensitive = sensitive_cols[0]

    return {
        "target_column":    target_col,
        "sensitive_column": best_sensitive,
        "sensitive_columns": sensitive_cols,
        "detection_report": report.to_dict(),
    }


# ---------------------------------------------------------------------------
# Backward-compat shim — old import in upload.py was detect_columns_with_groq
# ---------------------------------------------------------------------------
def detect_columns_with_groq(df: pd.DataFrame) -> dict:
    """Alias kept for backward compatibility — calls detect_columns() locally."""
    return detect_columns(df)
