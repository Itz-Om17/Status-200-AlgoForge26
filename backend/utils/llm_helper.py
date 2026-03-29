"""
FairAI · Column Detection & Audit Explanation Helper
=====================================================
Handles:
  1. Target/sensitive column detection (local + Groq)
  2. Audit explanation generation (classification + regression)
"""

import os
import time
import pandas as pd
from utils.sensitive_detector import (
    SensitiveAttributeDetector,
    _detect_target_column,
)
from groq import Groq

# Initialize Groq client
_groq_client = None
if os.getenv("GROQ_API_KEY"):
    _groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def generate_audit_explanation(
    metrics: dict,
    is_baseline: bool = True,
    is_combined: bool = False,
    model_type: str = "classification",
) -> str:
    """
    Calls Groq LLaMA 70B to generate a 2-sentence plain-English summary.
    Handles both classification and regression metrics.
    """
    if not _groq_client:
        return "AI Insight currently unavailable (Missing API Key)."

    score = metrics.get('fairness_score') or metrics.get('overall_fairness_score', 0)

    # ── Build prompt based on model type ──────────────────────────────────
    if model_type == "clustering":
        prompt = _build_clustering_prompt(metrics, score, is_baseline, is_combined)
    elif model_type == "regression":
        prompt = _build_regression_prompt(metrics, score, is_baseline, is_combined)
    else:
        prompt = _build_classification_prompt(metrics, score, is_baseline, is_combined)

    try:
        for attempt in range(5):
            try:
                completion = _groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=150
                )
                return completion.choices[0].message.content.strip()
            except Exception as inner_e:
                inner_msg = str(inner_e)
                print(f"[Groq Diagnostic] Attempt {attempt + 1}/5 failed: {inner_msg}")
                if "rate_limit" in inner_msg.lower() or "429" in inner_msg:
                    wait = 3 * (2 ** attempt)  # 3s, 6s, 12s, 24s, 48s
                    print(f"[Groq] Rate limited. Waiting {wait}s before retry...")
                    time.sleep(wait)
                else:
                    raise  # Non-rate-limit errors fail immediately
        return "AI Insight could not be generated at this moment."
    except Exception as e:
        error_msg = str(e)
        print(f"[Groq Diagnostic] AI Generation failed: {error_msg}")
        return "AI Insight could not be generated at this moment."


def _build_clustering_prompt(metrics, score, is_baseline, is_combined) -> str:
    """Build prompt for clustering model explanations."""
    tvd_score = metrics.get('disparate_impact') or metrics.get('worst_disparate_impact') or 1.0
    cf = metrics.get('counterfactual_flips') or metrics.get('max_counterfactual_flips') or 0.0
    sil_parity = metrics.get('worst_error_ratio') or metrics.get('worst_error_ratio') or 1.0
    
    shap_data = metrics.get('shap_values', [])
    top_features = [s['name'] for s in shap_data[:3]] if shap_data else ["None"]
    
    if is_combined:
        return f"""You are an AI fairness auditor evaluating an Unsupervised Clustering system. Write exactly 2 sentences explaining the FINAL COMBINED audit.
Overall Demographic Parity: {score}%. Worst Cluster Distribution Parity (TVD score): {tvd_score}. Max Counterfactual Cluster Flips: {cf}%. Worst Silhouette Parity (Fit equality): {sil_parity}.
Give a verdict on the system's unsupervised demographic parity. If the score is 100%, emphasize that the underlying dataset naturally formed balanced clusters across demographics, meaning the clustering algorithm found no intrinsic bias in the feature space."""

    elif is_baseline:
        return f"""You are an AI fairness auditor evaluating an Unsupervised Clustering model. Write exactly 2 sentences explaining the baseline audit results.
Demographic Parity Score: {score}%. Distribution Parity (TVD score): {tvd_score}. Counterfactual Cluster Flips: {cf}%. Silhouette Parity: {sil_parity}.
Top features driving clusters: {', '.join(top_features)}.
If the TVD score is perfect (1.0) and flips are near 0%, explicitly state that the sensitive attribute does not influence cluster assignment, meaning the dataset naturally balanced itself without implicit bias."""

    else:
        return f"""You are an AI fairness auditor evaluating a mitigated Unsupervised Clustering model. Write exactly 2 sentences explaining the results.
Demographic Parity Score: {score}%. Distribution Parity (TVD score): {tvd_score}. Counterfactual Flips: {cf}%.
Explain that the clustering distribution between demographic groups is now more mathematically balanced and robust."""

def _build_classification_prompt(metrics, score, is_baseline, is_combined) -> str:
    """Build prompt for classification model explanations."""
    di = metrics.get('disparate_impact') or metrics.get('worst_disparate_impact', 1.0)
    cf = metrics.get('counterfactual_flips') or metrics.get('max_counterfactual_flips', 0)
    shap_data = metrics.get('shap_values', [])
    top_features = [s['name'] for s in shap_data[:3]] if shap_data else ["None"]

    if is_combined:
        return f"""You are an AI fairness auditor. Write exactly 2 sentences in plain-English to explain the FINAL COMBINED fairness audit for an entire ML classification system.
Overall Fairness: {score}%. Worst Disparate Impact: {di}. Max Counterfactual Instability: {cf}%.
Provide a bird's-eye view verdict on the system's safety. If any score indicates bias, use a cautionary tone."""

    elif is_baseline:
        return f"""You are an AI fairness auditor. Write exactly 2 sentences in plain-English to explain baseline classification model audit results.
Fairness Score: {score}%. Disparate Impact Ratio: {di}. Counterfactual flips: {cf}%. 
Top influential features: {', '.join(top_features)}.
If the score is below 80%, identify why the bias is happening."""

    else:
        return f"""You are an AI fairness auditor. Write exactly 2 sentences in plain-English to explain mitigated (de-biased) classification model results.
Fairness Score: {score}%. Disparate Impact Ratio: {di}. Counterfactual flips: {cf}%.
Top features: {', '.join(top_features)}.
Explain that the sensitive attribute's influence has been successfully reduced."""


def _build_regression_prompt(metrics, score, is_baseline, is_combined) -> str:
    """Build prompt for regression model explanations."""
    mpg = metrics.get('mean_prediction_gap') or 0
    # FIX Bug 10: original order checked 'mpg_normalized' first, so combined-report key
    # 'worst_mpg_normalized' was always shadowed, defaulting to 1.0 (= "100% fair").
    # Prefer the combined-report key; fall back to single-model key.
    mpg_norm = metrics.get('worst_mpg_normalized') or metrics.get('mpg_normalized') or 1.0
    cf_pct = metrics.get('counterfactual_pct_change') or metrics.get('max_counterfactual_pct_change', 0)
    cf_diff = metrics.get('counterfactual_avg_diff', 0)
    err_ratio = metrics.get('error_ratio') or metrics.get('worst_error_ratio', 1.0)
    group_means = metrics.get('group_means', {})
    shap_data = metrics.get('shap_values', [])
    top_features = [s['name'] for s in shap_data[:3]] if shap_data else ["None"]

    group_means_str = ", ".join([f"{k}: {v}" for k, v in group_means.items()]) if group_means else "N/A"

    if is_combined:
        return f"""You are an AI fairness auditor specializing in regression models. Write exactly 2 sentences in plain-English to explain the FINAL COMBINED fairness audit for an entire ML regression system.
Overall Fairness: {score}%. Worst Mean Prediction Gap (normalized): {mpg_norm}. Max Counterfactual Prediction Change: {cf_pct}%. Error Ratio (MSE parity): {err_ratio}.
Provide a bird's-eye view verdict on the system's prediction equity. If any score indicates bias, use a cautionary tone."""

    elif is_baseline:
        return f"""You are an AI fairness auditor specializing in regression models. Write exactly 2 sentences in plain-English to explain baseline regression model audit results.
Fairness Score: {score}%. Mean Prediction Gap: {mpg} (normalized: {mpg_norm}). Group means: {group_means_str}. 
Counterfactual prediction change: {cf_pct}% (avg absolute diff: {cf_diff}). Error ratio: {err_ratio}.
Top influential features: {', '.join(top_features)}.
If the score is below 80%, explain which groups are receiving systematically different predictions and why."""

    else:
        return f"""You are an AI fairness auditor specializing in regression models. Write exactly 2 sentences in plain-English to explain mitigated (de-biased) regression model results.
Fairness Score: {score}%. Mean Prediction Gap (normalized): {mpg_norm}. Counterfactual prediction change: {cf_pct}%.
Top features: {', '.join(top_features)}.
Explain that the prediction gap between demographic groups has been successfully reduced and the model now produces more equitable continuous predictions."""


# ── Column Detection (unchanged) ─────────────────────────────────────────────

def _detect_target_groq(df: pd.DataFrame, dataset_name: str) -> str:
    if not _groq_client:
        print("Groq Client not initialized. Skipping LLM target detection.")
        return None
        
    try:
        prompt = f"""You are an expert AI data scientist. 
Your ONLY task is to identify the TARGET COLUMN (the dependent variable being predicted) in a machine learning dataset.

Dataset Name: {dataset_name}
First 5 rows of data:
{df.head(5).to_csv(index=False)}

Rules:
1. Examine the column names and data to logically infer which column is the target (e.g. loan_approved, default, churn, salary, price).
2. You MUST return ONLY the exact column name as it appears in the header.
3. No quotes, no markdown, no explanation, no punctuation! Just the exact string matching one of the column names.
"""
        completion = _groq_client.chat.completions.create(
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

    When no true demographic/sensitive columns exist (e.g. a pure property-features
    dataset) the detector will still pick the highest-scoring column available.
    In that case the returned dict includes 'no_demographic_columns': True so the
    frontend can warn the user that the audit may have limited fairness significance.
    """
    # Step 1: Detect target column via Groq, fallback to heuristics
    target_col = None
    if dataset_name:
        target_col = _detect_target_groq(df, dataset_name)
    if not target_col:
        target_col = _detect_target_column(df)

    # Step 2: Run sensitive attribute detector
    detector = SensitiveAttributeDetector(threshold=threshold)
    report = detector.analyse(df)
    sensitive_cols = [c for c in report.sensitive_columns if c != target_col][:2]

    # True demographic categories: protected attributes that matter for fairness law
    # 'location' alone (e.g., neighborhood, zip) is a proxy but not a direct demographic
    TRUE_DEMOGRAPHIC_CATEGORIES = {'gender', 'race', 'religion', 'nationality', 'disability',
                                   'income', 'education', 'marital', 'family', 'political'}

    # High-confidence demographic: score >= 40 AND in a true protected category
    high_conf = [
        r.column for r in report.sensitive_results
        if r.column != target_col
        and r.score >= 40
        and r.category in TRUE_DEMOGRAPHIC_CATEGORIES
    ]
    no_demographic_columns = len(high_conf) == 0

    if no_demographic_columns:
        print(
            "[ColumnDetection] WARNING: No high-confidence demographic columns found. "
            "The dataset may not contain protected attributes. "
            "The fairness audit will use the best available grouping column, "
            "but results have limited demographic fairness significance."
        )

    # Step 3: Pick the single best sensitive column (exclude target)
    best_sensitive = None
    for r in report.sensitive_results:
        if r.column != target_col:
            best_sensitive = r.column
            break

    if best_sensitive is None and sensitive_cols:
        best_sensitive = sensitive_cols[0]

    # Final safety: column with most group diversity (2-20 unique values)
    if best_sensitive is None:
        candidates = [c for c in df.columns if c != target_col]
        if candidates:
            best_sensitive = max(
                candidates,
                key=lambda c: df[c].nunique() if 2 <= df[c].nunique() <= 20 else 0,
            )

    final_sensitive_cols = sensitive_cols if sensitive_cols else ([best_sensitive] if best_sensitive else [])

    return {
        "target_column":          target_col,
        "sensitive_column":       best_sensitive,
        "sensitive_columns":      final_sensitive_cols,
        "detection_report":       report.to_dict(),
        "no_demographic_columns": no_demographic_columns,
        "demographic_warning": (
            "This dataset does not appear to contain protected demographic attributes "
            "(e.g. gender, race, age). The audit is using the best available grouping "
            "column as a proxy. Fairness scores may not reflect real-world bias."
        ) if no_demographic_columns else None,
    }



# Backward-compat shim
def detect_columns_with_groq(df: pd.DataFrame) -> dict:
    """Alias kept for backward compatibility — calls detect_columns() locally."""
    return detect_columns(df)   