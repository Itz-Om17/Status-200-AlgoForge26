import os
from flask import Blueprint, request, jsonify
from utils.llm_helper import _groq_client

chat_bp = Blueprint('chat', __name__)

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
    
    system_prompt = f"""
    You are the FairAI Enterprise Assistant, an AI expert in algorithmic fairness and bias mitigation.
    The user is viewing their fairness audit report for a machine learning model.
    Answer their questions concisely and clearly based on the provided context. 
    Explain concepts simply but professionally (B2B SaaS tone).

    Current Audit Context:
    Target Prediction Column: {context.get('target', 'Unknown')}
    Sensitive/Protected Column: {context.get('sensitive', 'Unknown')}
    
    Baseline Model (Before Mitigation): 
    - Fairness Score: {baseline.get('fairness_score', 'N/A')}%
    - Disparate Impact: {baseline.get('disparate_impact', 'N/A')} (Ideal is 1.0)
    - Counterfactual Flips: {baseline.get('counterfactual_flips', 'N/A')}% (<5% is good)
    - Top Influential Features: {', '.join([f['name'] for f in baseline.get('shap_values', [])[:4]]) if baseline.get('shap_values') else 'N/A'}
    
    Mitigated Model (After Bias Correction):
    - Fairness Score: {mitigated.get('fairness_score', 'N/A')}%
    - Disparate Impact: {mitigated.get('disparate_impact', 'N/A')}
    - Counterfactual Flips: {mitigated.get('counterfactual_flips', 'N/A')}%
    - Top Influential Features: {', '.join([f['name'] for f in mitigated.get('shap_values', [])[:4]]) if mitigated.get('shap_values') else 'N/A'}

    Always be data-driven. If the user asks why something was flagged, refer to the SHAP tops features in the Baseline Model. If they ask how it was fixed, refer to the Mitigated model metrics and standard fairness techniques (like reweighting or ROC mitigation).
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
        
        return jsonify({
            "status": "success",
            "reply": answer
        }), 200

    except Exception as e:
        print(f"Chat API Error: {str(e)}")
        return jsonify({"error": f"Failed to generate AI response. Make sure Groq API limit isn't exceeded."}), 500
