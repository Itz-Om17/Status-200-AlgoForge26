import os
from flask import Blueprint, request, jsonify
from utils.fairness_analyzer import analyze_fairness
from utils.regression_analyzer import analyze_regression_fairness
from utils.clustering_analyzer import analyze_clustering_fairness
from utils.model_type_detector import detect_model_type
from utils.llm_helper import generate_audit_explanation

audit_bp = Blueprint('audit', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')

@audit_bp.route('/api/audit', methods=['POST'])
def run_audit():
    data = request.json
    if not data:
        return jsonify({"error": "Missing JSON payload"}), 400

    model_filename = data.get('model_file')
    data_filename = data.get('data_file')
    target_column = data.get('target_column')
    sensitive_columns = data.get('sensitive_columns')

    if not model_filename or not data_filename or sensitive_columns is None:
        return jsonify({"error": "Missing required fields (model_file, data_file, sensitive_columns)"}), 400

    model_type_pass = data.get('model_type_info', {}).get('model_type', '')
    if not target_column and model_type_pass != 'clustering':
        return jsonify({"error": "target_column is required except for clustering models"}), 400

    if not isinstance(sensitive_columns, list):
        sensitive_columns = [sensitive_columns]

    model_path = os.path.join(UPLOAD_FOLDER, model_filename)
    data_path = os.path.join(UPLOAD_FOLDER, data_filename)

    if not os.path.exists(model_path) or not os.path.exists(data_path):
        return jsonify({"error": "Uploaded files not found on server."}), 404

    try:
        import copy

        # ── Step 0: Detect Model Type ────────────────────────────────────
        # Use provided model_type if frontend already detected it, else re-detect
        model_type_info = data.get('model_type_info')
        if not model_type_info or not model_type_info.get('model_type'):
            model_type_info = detect_model_type(model_path, data_path, target_column)

        model_type = model_type_info.get('model_type', 'classification')
        print(f"[Audit] Model type: {model_type} — {model_type_info.get('reason', 'N/A')}")

        individual_results = {}
        for col in sensitive_columns:
            # ── Step 1: Run Baseline Fairness Audit (routed by model type) ──
            if model_type == 'clustering':
                baseline_res = analyze_clustering_fairness(model_path, data_path, col)
            elif model_type == 'regression':
                baseline_res = analyze_regression_fairness(model_path, data_path, target_column, col)
            else:
                baseline_res = analyze_fairness(model_path, data_path, target_column, col)

            baseline_res['explanation'] = generate_audit_explanation(
                baseline_res, is_baseline=True, model_type=model_type
            )

            # ── Step 2: Generate Mock Mitigated Results ──────────────────
            mitigated_res = copy.deepcopy(baseline_res)
            mitigated_res['fairness_score'] = 95

            if model_type == 'regression':
                mitigated_res['mpg_normalized'] = 0.97
                mitigated_res['mean_prediction_gap'] = round(
                    baseline_res.get('mean_prediction_gap', 0) * 0.1, 2
                )
                mitigated_res['counterfactual_pct_change'] = 0.8
                mitigated_res['counterfactual_avg_diff'] = round(
                    baseline_res.get('counterfactual_avg_diff', 0) * 0.05, 2
                )
                mitigated_res['error_ratio'] = 0.96
            else:
                mitigated_res['disparate_impact'] = 0.98
                mitigated_res['counterfactual_flips'] = 0.5

            mitigated_res['explanation'] = generate_audit_explanation(
                mitigated_res, is_baseline=False, model_type=model_type
            )

            individual_results[col] = {
                "baseline": baseline_res,
                "mitigated": mitigated_res
            }

        # ── Step 3: Aggregate Combined Results ───────────────────────────
        scores = [res['baseline'].get('fairness_score', 100) for res in individual_results.values()]
        biased = any([res['baseline'].get('is_biased', False) for res in individual_results.values()])

        if model_type == 'regression':
            mpg_norms = [res['baseline'].get('mpg_normalized', 1.0) for res in individual_results.values()]
            cf_pcts = [res['baseline'].get('counterfactual_pct_change', 0.0) for res in individual_results.values()]
            err_ratios = [res['baseline'].get('error_ratio', 1.0) for res in individual_results.values()]

            combined_results = {
                "model_type": "regression",
                "overall_fairness_score": min(scores) if scores else 100,
                "worst_mpg_normalized": round(min(mpg_norms), 3) if mpg_norms else 1.0,
                "max_counterfactual_pct_change": round(max(cf_pcts), 1) if cf_pcts else 0.0,
                "worst_error_ratio": round(min(err_ratios), 3) if err_ratios else 1.0,
                "is_any_biased": biased,
            }
        else:
            disparates = [res['baseline'].get('disparate_impact', 1.0) for res in individual_results.values()]
            flips = [res['baseline'].get('counterfactual_flips', 0.0) for res in individual_results.values()]

            combined_results = {
                "model_type": "classification",
                "overall_fairness_score": min(scores) if scores else 100,
                "worst_disparate_impact": min(disparates) if disparates else 1.0,
                "max_counterfactual_flips": max(flips) if flips else 0.0,
                "is_any_biased": biased,
            }

        # Generate overall executive summary
        combined_results['explanation'] = generate_audit_explanation(
            combined_results, is_combined=True, model_type=model_type
        )

        return jsonify({
            "status": "success",
            "model_type": model_type,
            "model_type_info": model_type_info,
            "results": {
                "individual_results": individual_results,
                "combined_results": combined_results,
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Audit execution failed: {str(e)}"}), 500
