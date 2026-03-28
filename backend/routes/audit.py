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
    sensitive_column = data.get('sensitive_column')

    if not all([model_filename, data_filename, target_column, sensitive_column]):
        return jsonify({"error": "Missing required fields (model_file, data_file, target_column, sensitive_column)"}), 400

    model_path = os.path.join(UPLOAD_FOLDER, model_filename)
    data_path = os.path.join(UPLOAD_FOLDER, data_filename)

    if not os.path.exists(model_path) or not os.path.exists(data_path):
        return jsonify({"error": "Uploaded files not found on server."}), 404

    try:
        # Run the deep fairness audit based on 3-Tier logic
        results = analyze_fairness(model_path, data_path, target_column, sensitive_column)
        
        # --- Generate Mock Mitigated Results (since it's static for now) ---
        import copy
        mitigated = copy.deepcopy(results)
        mitigated['fairness_score'] = 92
        mitigated['disparate_impact'] = 0.95
        mitigated['counterfactual_flips'] = 1.0
        
        # --- Generate Groq AI Explanations ---
        from utils.llm_helper import generate_audit_explanation
        baseline_explanation = generate_audit_explanation(results, is_baseline=True)
        mitigated_explanation = generate_audit_explanation(mitigated, is_baseline=False)
        
        results['explanation'] = baseline_explanation
        mitigated['explanation'] = mitigated_explanation
        
        return jsonify({
            "status": "success", 
            "audit_results": {
                "baseline": results,
                "mitigated": mitigated
            }
        }), 200
    except Exception as e:
        return jsonify({"error": f"Audit execution failed: {str(e)}"}), 500
