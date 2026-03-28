import os
from flask import Blueprint, request, jsonify
from utils.fairness_analyzer import analyze_fairness

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

    if not model_filename or not data_filename or not target_column or sensitive_columns is None:
        return jsonify({"error": "Missing required fields (model_file, data_file, target_column, sensitive_columns)"}), 400

    if not isinstance(sensitive_columns, list):
        sensitive_columns = [sensitive_columns]

    model_path = os.path.join(UPLOAD_FOLDER, model_filename)
    data_path = os.path.join(UPLOAD_FOLDER, data_filename)

    if not os.path.exists(model_path) or not os.path.exists(data_path):
        return jsonify({"error": "Uploaded files not found on server."}), 404

    try:
        individual_results = {}
        for col in sensitive_columns:
            # Run the deep fairness audit based on 3-Tier logic
            individual_results[col] = analyze_fairness(model_path, data_path, target_column, col)

        # Aggregate safely
        scores = [res.get('fairness_score', 100) for res in individual_results.values()]
        disparates = [res.get('disparate_impact', 1.0) for res in individual_results.values()]
        flips = [res.get('counterfactual_flips', 0.0) for res in individual_results.values()]
        biased = any([res.get('is_biased', False) for res in individual_results.values()])

        combined_results = {
            "overall_fairness_score": min(scores) if scores else 100,
            "worst_disparate_impact": min(disparates) if disparates else 1.0,
            "max_counterfactual_flips": max(flips) if flips else 0.0,
            "is_any_biased": biased
        }

        return jsonify({"status": "success", "results": {"individual_results": individual_results, "combined_results": combined_results}}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Audit execution failed: {str(e)}"}), 500
