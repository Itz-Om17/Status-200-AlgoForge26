import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Register Blueprints
from routes.upload import upload_bp
from routes.audit import audit_bp
from routes.download import download_bp

app.register_blueprint(upload_bp)
app.register_blueprint(audit_bp)
app.register_blueprint(download_bp)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "FairAI Backend is running"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
