import os
import re
import pandas as pd
from flask import Blueprint, request, jsonify
from utils.llm_helper import _groq_client

chat_bp = Blueprint('chat', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')


# ── Dataset distribution helper ──────────────────────────────────────────────

def _compute_column_distributions(data_file: str) -> dict:
    """
    Read the uploaded CSV and compute value_counts for columns with ≤ 30
    unique values (categorical / low-cardinality). Returns a dict of
    { column_name: { value: count, ... }, ... } plus dataset_shape.
    """
    path = os.path.join(UPLOAD_FOLDER, data_file)
    if not os.path.exists(path):
        return {}

    try:
        df = pd.read_csv(path)
    except Exception:
        return {}

    distributions = {}
    for col in df.columns:
        nunique = df[col].nunique(dropna=True)
        if 2 <= nunique <= 30:
            counts = df[col].value_counts(dropna=True).to_dict()
            # Convert numpy types to native Python for JSON serialization
            distributions[col] = {str(k): int(v) for k, v in counts.items()}

    return {
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "column_names": list(df.columns),
        "distributions": distributions,
    }


def _build_distribution_prompt(data_stats: dict) -> str:
    """Format dataset distributions for the system prompt."""
    if not data_stats or not data_stats.get("distributions"):
        return ""

    lines = [
        f"\n=== DATASET SUMMARY (for visualization) ===",
        f"Rows: {data_stats['shape']['rows']}, Columns: {data_stats['shape']['columns']}",
        f"All columns: {', '.join(data_stats['column_names'])}",
        f"",
        f"Column Distributions (categorical / low-cardinality):",
    ]

    for col, dist in data_stats["distributions"].items():
        entries = ", ".join([f"{k}={v}" for k, v in dist.items()])
        lines.append(f"  {col}: {entries}")

    lines.append("")
    lines.append("VISUALIZATION INSTRUCTIONS:")
    lines.append("When the user asks to SHOW, VISUALIZE, PLOT, CHART or display data distributions:")
    lines.append("1. Write a brief text explanation first.")
    lines.append("2. Then on a NEW LINE, include EXACTLY ONE chart marker per chart in this format:")
    lines.append("   <<CHART:pie:ColumnName:Chart Title>>   for pie charts")
    lines.append("   <<CHART:bar:ColumnName:Chart Title>>   for bar charts")
    lines.append("3. You can include multiple chart markers if the user asks for multiple charts.")
    lines.append("4. Use ONLY column names that exist in the dataset above.")
    lines.append("5. Choose 'pie' for columns with ≤6 categories, 'bar' for more.")
    lines.append("6. Example: <<CHART:pie:Sex:Distribution of Sex in Dataset>>")
    lines.append("")

    return "\n".join(lines)


def _extract_charts(answer: str, data_stats: dict) -> tuple:
    """
    Parse the LLM response for <<CHART:type:column:title>> markers.
    Returns (cleaned_text, list_of_chart_dicts).
    """
    charts = []
    pattern = r'<<CHART:(pie|bar):([^:]+):([^>]+)>>'

    distributions = data_stats.get("distributions", {}) if data_stats else {}

    for match in re.finditer(pattern, answer):
        chart_type = match.group(1)
        col_name = match.group(2).strip()
        title = match.group(3).strip()

        # Look up actual distribution data
        dist = distributions.get(col_name)
        if dist:
            chart_data = [{"name": str(k), "value": int(v)} for k, v in dist.items()]
            charts.append({
                "type": chart_type,
                "title": title,
                "column": col_name,
                "data": chart_data,
            })

    # Remove chart markers from the text
    cleaned = re.sub(pattern, '', answer).strip()
    # Clean up any double newlines left behind
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    return cleaned, charts


# ── Formula section builder (unchanged) ──────────────────────────────────────

def _build_formula_section(model_type, baseline, mitigated):
    """
    Build the exact formula reference section based on model type,
    so the LLM can accurately answer 'how was this calculated?' questions.
    """
    if model_type == 'regression':
        return f"""
=== EXACT FORMULAS (Regression Model) ===

** TIER 1: Mean Prediction Gap (MPG) **
  - For each demographic group, we compute the average model prediction: μ_group = mean(predictions for that group).
  - Privileged Group = group with highest μ (got: "{baseline.get('privileged_group', '?')}"), Unprivileged = lowest μ (got: "{baseline.get('unprivileged_group', '?')}").
  - Mean Prediction Gap = |μ_privileged - μ_unprivileged| = {baseline.get('mean_prediction_gap', 'N/A')}
  - MPG Normalized = μ_unprivileged / μ_privileged = {baseline.get('mpg_normalized', 'N/A')}   (1.0 = perfect equity, <0.8 = biased)
  - Group Mean Predictions: {baseline.get('group_means', 'N/A')}

** TIER 2: Counterfactual Prediction Difference **
  - We take a sample of 500 rows, record model predictions.
  - Then we FLIP the sensitive attribute (e.g., swap privileged ↔ unprivileged) and predict again.
  - Counterfactual Avg Absolute Diff = mean(|pred_original - pred_flipped|) = {baseline.get('counterfactual_avg_diff', 'N/A')}
  - Counterfactual Pct Change = mean(|diff| / |pred_original| * 100) = {baseline.get('counterfactual_pct_change', 'N/A')}%   (<5% is robust)

** TIER 3: Feature Importance (SHAP / Coefficients) **
  - For tree models: uses model.feature_importances_ (Gini / Gain based), normalized to sum = 1.
  - For linear models: uses |model.coef_| normalized to sum = 1.
  - The importance of the sensitive attribute itself shows how much it drives predictions.
  - Sensitive Attribute Importance → used in SHAP penalty.

** BONUS: MSE Parity (Error Fairness) **
  - For each group: MSE_group = mean((actual - predicted)^2).
  - Error Ratio = min(MSE) / max(MSE) = {baseline.get('error_ratio', 'N/A')}   (≥0.8 is fair, <0.8 = one group gets worse predictions)
  - Group Errors: {baseline.get('group_errors', 'N/A')}

** COMBINED FAIRNESS SCORE **
  Formula: Final Score = max(0, MPG_score - CF_penalty - SHAP_penalty - ER_penalty)
  Where:
    MPG_score   = MPG_normalized * 100
    CF_penalty  = min(counterfactual_pct_change / 10.0, 1.0) * 30
    SHAP_penalty = min(sensitive_importance * 2.0, 1.0) * 30   (only applied if MPG_normalized < 0.8)
    ER_penalty  = max(0.0, (0.8 - error_ratio) / 0.8) * 20    (only applied if error_ratio < 0.8)
  Additional cap: if MPG_normalized < 0.8 AND CF_pct > 0 AND SHAP_sensitive > 0.1 AND score > 50, then score *= 0.5

** MITIGATION: Mean Gap Shift (Post-Processing) **
  - For each group, compute gap = global_mean_prediction - group_mean_prediction.
  - Shift each group's predictions by +gap, so all groups converge toward the global mean.
  - This is post-processing on predictions, NOT model retraining.
  - Counterfactual pct change after mitigation is reduced to 10% of baseline.
"""

    elif model_type == 'clustering':
        return f"""
=== EXACT FORMULAS (Clustering / Unsupervised Model) ===

** TIER 1: Cluster Distribution Parity (Total Variation Distance) **
  - For the two largest demographic groups A and B:
    TVD = Σ |P(Cluster=c | Group=A) - P(Cluster=c | Group=B)| / 2   (for each cluster c)
  - TVD Score = 1.0 - TVD   (1.0 = perfect parity, <0.8 = biased)
  - This value is shown as "Distribution Gap (TVD)" in the UI = {baseline.get('disparate_impact', 'N/A')}

** TIER 2: Counterfactual Cluster Flips **
  - Flip the sensitive attribute for all rows and re-cluster.
  - Flips % = (number of rows that changed cluster / total rows) * 100 = {baseline.get('counterfactual_flips', 'N/A')}%

** TIER 3: Surrogate SHAP Feature Importance **
  - A RandomForest surrogate is trained to predict cluster IDs from features.
  - Uses surrogate.feature_importances_ normalized to sum = 1.

** BONUS: Silhouette Parity **
  - Silhouette score per group measures how well each demographic fits its cluster.
  - Ratio = min(sil_group) / max(sil_group) = {baseline.get('worst_error_ratio', 'N/A')}

** COMBINED FAIRNESS SCORE **
  Formula: Final Score = max(0, TVD_pts - CF_penalty - SHAP_penalty)
  Where:
    TVD_pts     = TVD_score * 100
    CF_penalty  = min(CF_pct / 20.0, 1.0) * 30    (only if CF > 5%)
    SHAP_penalty = min(sensitive_importance * 2.0, 1.0) * 30   (only if sensitive_importance > 0.1)

** MITIGATION: (Not applicable for clustering) **
  - Clustering models are passthrough — the mitigation returns baseline as-is.
"""

    else:  # classification (default)
        return f"""
=== EXACT FORMULAS (Classification Model) ===

** TIER 1: Statistical Parity (Disparate Impact) **
  - Positive Rate per Group = mean(target == 1) for each demographic group.
  - Privileged Group = group with highest positive rate, Unprivileged = lowest.
  - Disparate Impact (DI) = unprivileged_rate / privileged_rate = {baseline.get('disparate_impact', 'N/A')}   (1.0 = perfect. <0.8 = biased)

** TIER 2: Counterfactual Flips **
  - Take 500-row sample, record model predictions.
  - FLIP the sensitive attribute (swap privileged ↔ unprivileged) and predict again.
  - Flips % = (number of predictions that changed / sample_size) * 100 = {baseline.get('counterfactual_flips', 'N/A')}%   (<5% is good, >10% is biased)

** TIER 3: Feature Importance (SHAP) **
  - Uses model.feature_importances_ if available (tree models), normalized to sum = 1.
  - Otherwise falls back to approximate SHAP.
  - The importance of the sensitive column itself determines the SHAP penalty.

** COMBINED FAIRNESS SCORE **
  Formula: Final Score = max(0, DI_score - CF_penalty - SHAP_penalty)
  Where:
    DI_score    = min(DI / 0.8, 1.0) * 100
    CF_penalty  = min(counterfactual_flips_pct / 10.0, 1.0) * 30
    SHAP_penalty = min(sensitive_importance * 2.0, 1.0) * 30

  Example with this audit's values:
    DI_score    = min({baseline.get('disparate_impact', 'N/A')} / 0.8, 1.0) * 100
    CF_penalty  = min({baseline.get('counterfactual_flips', 'N/A')} / 10.0, 1.0) * 30
    → Baseline Fairness Score = {baseline.get('fairness_score', 'N/A')}%

** MITIGATION: ROC Threshold Shifting (Post-Processing) **
  - Calculate global positive rate from original predictions.
  - For each demographic group, re-rank candidates by predict_proba (if available).
  - Set threshold per group so each group's selection rate = global rate → Selection Rate Parity.
  - If predict_proba unavailable, uses Equalized Odds Label Swapping to match quotas.
  - Mitigated DI = min(selection_rate) / max(selection_rate) = {mitigated.get('disparate_impact', 'N/A')}
  - Counterfactual flips reduced to 10% of baseline.
"""


# ── Main chat route ──────────────────────────────────────────────────────────

@chat_bp.route('/api/chat', methods=['POST'])
def chat_with_data():
    if not _groq_client:
        return jsonify({"error": "Groq client is not initialized. Please set GROQ_API_KEY in backend environment."}), 503

    data = request.json
    if not data or 'messages' not in data:
        return jsonify({"error": "Missing messages list in payload"}), 400

    messages = data['messages']
    context = data.get('context', {})

    baseline = context.get('baseline', {})
    mitigated = context.get('mitigated', {})
    model_type = context.get('model_type', 'classification')
    dataset_file = context.get('dataset_file', '')

    # Build SHAP feature lists
    baseline_shap = baseline.get('shap_values', [])
    mitigated_shap = mitigated.get('shap_values', [])
    baseline_shap_str = ', '.join([f"{f['name']}={f.get('importance','?')}" for f in baseline_shap[:5]]) if baseline_shap else 'N/A'
    mitigated_shap_str = ', '.join([f"{f['name']}={f.get('importance','?')}" for f in mitigated_shap[:5]]) if mitigated_shap else 'N/A'

    # Build dynamic formula reference
    formula_section = _build_formula_section(model_type, baseline, mitigated)

    # Compute dataset distributions for chart generation
    data_stats = _compute_column_distributions(dataset_file) if dataset_file else {}
    distribution_prompt = _build_distribution_prompt(data_stats)

    system_prompt = f"""You are the FairAI Enterprise Assistant, an AI expert in algorithmic fairness and bias mitigation.
The user is viewing their fairness audit report for a machine learning model.
Answer their questions concisely and clearly based on the PROVIDED CONTEXT AND FORMULAS ONLY.
When the user asks "how was X calculated?", ALWAYS reference the EXACT FORMULAS below — never guess or use generic fairness definitions.
Explain concepts simply but professionally (B2B SaaS tone).

=== AUDIT METADATA ===
Model Type: {model_type.upper()}
Model File: {context.get('model_file', 'Unknown')}
Dataset File: {context.get('dataset_file', 'Unknown')}
Target Prediction Column: {context.get('target', 'Unknown')}
Sensitive/Protected Column: {context.get('sensitive', 'Unknown')}

{formula_section}

=== CURRENT AUDIT VALUES ===

Baseline Model (Before Mitigation):
  - Fairness Score: {baseline.get('fairness_score', 'N/A')}%
  - {'Disparate Impact' if model_type == 'classification' else 'MPG Normalized' if model_type == 'regression' else 'TVD Score'}: {baseline.get('disparate_impact', baseline.get('mpg_normalized', 'N/A'))}
  - {'Counterfactual Flips' if model_type != 'regression' else 'Counterfactual Pct Change'}: {baseline.get('counterfactual_flips', baseline.get('counterfactual_pct_change', 'N/A'))}{'%' if model_type != 'regression' else '%'}
  - Feature Importances (top 5): {baseline_shap_str}
  - Is Biased: {baseline.get('is_biased', 'N/A')}
  {f"- Group Means: {baseline.get('group_means', 'N/A')}" if model_type == 'regression' else ''}
  {f"- Mean Prediction Gap: {baseline.get('mean_prediction_gap', 'N/A')}" if model_type == 'regression' else ''}
  {f"- Error Ratio (MSE Parity): {baseline.get('error_ratio', 'N/A')}" if model_type == 'regression' else ''}
  {f"- Privileged Group: {baseline.get('privileged_group', 'N/A')}" if model_type == 'regression' else ''}
  {f"- Unprivileged Group: {baseline.get('unprivileged_group', 'N/A')}" if model_type == 'regression' else ''}

Mitigated Model (After Bias Correction):
  - Fairness Score: {mitigated.get('fairness_score', 'N/A')}%
  - {'Disparate Impact' if model_type == 'classification' else 'MPG Normalized' if model_type == 'regression' else 'TVD Score'}: {mitigated.get('disparate_impact', mitigated.get('mpg_normalized', 'N/A'))}
  - {'Counterfactual Flips' if model_type != 'regression' else 'Counterfactual Pct Change'}: {mitigated.get('counterfactual_flips', mitigated.get('counterfactual_pct_change', 'N/A'))}%
  - Feature Importances (top 5): {mitigated_shap_str}
  {f"- Mean Prediction Gap: {mitigated.get('mean_prediction_gap', 'N/A')}" if model_type == 'regression' else ''}

{distribution_prompt}

=== RULES ===
- When a user asks "how was the fairness score calculated?", show the EXACT formula from above with the actual numbers plugged in.
- When asked about specific metrics, reference the Tier (1/2/3) that produced them.
- When asked about mitigation, explain the EXACT technique used (ROC Threshold Shifting for classification, Mean Gap Shift for regression).
- If the user asks about SHAP, explain whether feature_importances_ or |coef_| was used.
- Always be data-driven. Use the actual values from this audit in your explanations.
- Do NOT invent formulas — only use what is documented above.
- When asked to show/visualize/chart data, ALWAYS use the <<CHART:type:column:title>> marker format.
"""

    formatted_messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        response = _groq_client.chat.completions.create(
            messages=formatted_messages,
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=800
        )
        answer = response.choices[0].message.content.strip()

        # Post-process: extract chart markers and compute real chart data
        cleaned_answer, charts = _extract_charts(answer, data_stats)

        result = {
            "status": "success",
            "reply": cleaned_answer,
        }
        if charts:
            result["charts"] = charts

        return jsonify(result), 200

    except Exception as e:
        print(f"Chat API Error: {str(e)}")
        return jsonify({"error": f"Failed to generate AI response. Make sure Groq API limit isn't exceeded."}), 500
