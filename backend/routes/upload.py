import os
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from utils.llm_helper import detect_columns
from utils.model_type_detector import detect_model_type

upload_bp = Blueprint('upload', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_MODEL_EXTENSIONS = {'.pkl'}
ALLOWED_DATA_EXTENSIONS = {'.csv'}


def allowed_file(filename, allowed_extensions):
    return os.path.splitext(filename)[1].lower() in allowed_extensions


@upload_bp.route('/api/upload', methods=['POST'])
def upload_files():
    # --- Validate that both files are present ---
    if 'model_file' not in request.files:
        return jsonify({"error": "model_file (.pkl) is required"}), 400
    if 'data_file' not in request.files:
        return jsonify({"error": "data_file (.csv) is required"}), 400

    model_file = request.files['model_file']
    data_file  = request.files['data_file']

    if model_file.filename == '' or data_file.filename == '':
        return jsonify({"error": "Both files must be selected"}), 400

    # --- Validate extensions ---
    if not allowed_file(model_file.filename, ALLOWED_MODEL_EXTENSIONS):
        return jsonify({"error": "Model file must be a .pkl file"}), 400
    if not allowed_file(data_file.filename, ALLOWED_DATA_EXTENSIONS):
        return jsonify({"error": "Data file must be a .csv file"}), 400

    # --- Save files ---
    model_filename = secure_filename(model_file.filename)
    data_filename  = secure_filename(data_file.filename)

    model_path = os.path.join(UPLOAD_FOLDER, model_filename)
    data_path  = os.path.join(UPLOAD_FOLDER, data_filename)

    model_file.save(model_path)
    data_file.save(data_path)

    # --- Read CSV ---
    try:
        df = pd.read_csv(data_path)
    except Exception as e:
        return jsonify({"error": f"Failed to read CSV: {str(e)}"}), 400

    # --- Run sensitive-attribute and target detection ---
    try:
        detection_result = detect_columns(df, data_filename)
    except Exception as e:
        return jsonify({"error": f"Sensitive feature detection failed: {str(e)}"}), 500

    # --- Detect Model Type (Classification vs Regression) ---
    target_col = detection_result.get("target_column")
    try:
        model_type_info = detect_model_type(model_path, data_path, target_col)
        print(f"[Upload] Model type detected: {model_type_info.get('model_type')} — {model_type_info.get('reason', '')}")
    except Exception as e:
        print(f"[Upload] Model type detection failed: {e}")
        model_type_info = {
            "model_type": "classification",
            "reason": f"Detection failed ({str(e)}). Defaulting to classification.",
            "confidence": 0.0,
            "source": "error_fallback",
        }

    return jsonify({
        "status":           "success",
        "model_file":       model_filename,
        "data_file":        data_filename,
        "columns_detected": list(df.columns),
        "sample_data":      df.head(5).fillna("").to_dict(orient='records'),
        "rows_count":       len(df),
        # Top-level shortcuts for the frontend
        "target_column":    detection_result.get("target_column"),
        "sensitive_column": detection_result.get("sensitive_column"),
        "sensitive_columns": detection_result.get("sensitive_columns", []),
        # Model type detection
        "model_type":       model_type_info.get("model_type", "classification"),
        "model_type_info":  model_type_info,
        # Full structured report
        "llm_detection":    detection_result,
    }), 200
