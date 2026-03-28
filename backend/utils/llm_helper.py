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

import os
import pandas as pd
from utils.sensitive_detector import (
    SensitiveAttributeDetector,
    _detect_target_column,
)

def _detect_target_groq(df: pd.DataFrame, dataset_name: str) -> str:
    from groq import Groq
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not found. Skipping LLM target detection.")
        return None
        
    try:
        client = Groq(api_key=api_key)
        prompt = f"""You are an expert AI data scientist. 
Your ONLY task is to identify the TARGET COLUMN (the dependent variable being predicted) in a machine learning dataset.

Dataset Name: {dataset_name}
First 5 rows of data:
{df.head(5).to_csv(index=False)}

Rules:
1. Examine the column names and data to logically infer which column is the target (e.g. loan_approved, default, churn).
2. You MUST return ONLY the exact column name as it appears in the header.
3. No quotes, no markdown, no explanation, no punctuation! Just the exact string matching one of the column names.
"""
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=20,
        )
        response = completion.choices[0].message.content.strip()
        response = response.replace('`', '').replace('"', '').replace("'", "").strip()
        
        if response in df.columns:
            print(f"Groq successfully detected target column: {response}")
            return response
        else:
            print(f"Groq hallucinated column: {response}. Falling back to heuristic.")
            return None
    except Exception as e:
        print(f"Groq API error during target detection: {str(e)}")
        return None


def detect_columns(df: pd.DataFrame, dataset_name: str = "", threshold: float = 20.0) -> dict:
    """
    Detect the target column (via Groq/LLM) and sensitive attribute(s) from a DataFrame.

    Parameters
    ----------
    df        : The dataset to inspect.
    dataset_name : Filename or context for the LLM to understand the data.
    threshold : Sensitivity score threshold (0–100). Default 20.

    Returns
    -------
    dict with keys:
    """
    # Step 1: Detect the target column using Groq context, fallback to heuristics
    target_col = None
    if dataset_name:
        target_col = _detect_target_groq(df, dataset_name)
        
    if not target_col:
        target_col = _detect_target_column(df)

    # Step 2: run the sensitive attribute detector on all columns
    detector = SensitiveAttributeDetector(threshold=threshold)
    report = detector.analyse(df)
    # Limit to top 2 sensitive attributes as requested
    sensitive_cols = report.sensitive_columns[:2]
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
