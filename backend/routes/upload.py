import os
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from utils.llm_helper import detect_columns_with_groq

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
    data_file = request.files['data_file']

    if model_file.filename == '' or data_file.filename == '':
        return jsonify({"error": "Both files must be selected"}), 400

    # --- Validate extensions ---
    if not allowed_file(model_file.filename, ALLOWED_MODEL_EXTENSIONS):
        return jsonify({"error": "Model file must be a .pkl file"}), 400
    if not allowed_file(data_file.filename, ALLOWED_DATA_EXTENSIONS):
        return jsonify({"error": "Data file must be a .csv file"}), 400

    # --- Save files ---
    model_filename = secure_filename(model_file.filename)
    data_filename = secure_filename(data_file.filename)

    model_path = os.path.join(UPLOAD_FOLDER, model_filename)
    data_path = os.path.join(UPLOAD_FOLDER, data_filename)

    model_file.save(model_path)
    data_file.save(data_path)

    # --- Read CSV and run LLM detection ---
    try:
        df = pd.read_csv(data_path)
    except Exception as e:
        return jsonify({"error": f"Failed to read CSV: {str(e)}"}), 400

    try:
        llm_result = detect_columns_with_groq(df)
    except Exception as e:
        return jsonify({"error": f"LLM detection failed: {str(e)}"}), 500

    return jsonify({
        "status": "success",
        "model_file": model_filename,
        "data_file": data_filename,
        "columns_detected": list(df.columns),
        "rows_count": len(df),
        "llm_detection": llm_result
    }), 200
