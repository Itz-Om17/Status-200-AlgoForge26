import pyotp
import qrcode
import base64
from io import BytesIO
from flask import Blueprint, request, jsonify

mfa_bp = Blueprint('mfa', __name__)

@mfa_bp.route('/api/mfa/generate', methods=['POST'])
def generate_mfa():
    """Generates a new TOTP secret and returns the QR code image base64 encoded."""
    data = request.json or {}
    email = data.get('email', 'User')
    
    # Generate a random base32 secure secret
    secret = pyotp.random_base32()
    
    # Generate the pairing URI
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="FairAI")
    
    # Create the QR code
    qr = qrcode.QRCode(version=1, box_size=5, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    
    # Output to an image buffer
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    img_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return jsonify({
        "secret": secret,
        "qrCodeDataUrl": f"data:image/png;base64,{img_b64}"
    }), 200


@mfa_bp.route('/api/mfa/verify', methods=['POST'])
def verify_mfa():
    """Verifies a 6-digit TOTP code against a secret."""
    data = request.json
    if not data or 'secret' not in data or 'code' not in data:
        return jsonify({"error": "Missing secret or code"}), 400
        
    secret = data['secret']
    code = data['code']
    
    totp = pyotp.TOTP(secret)
    # verify with a slight time window tolerance for user delay
    is_valid = totp.verify(code, valid_window=1)
    
    return jsonify({
        "valid": is_valid
    }), 200
