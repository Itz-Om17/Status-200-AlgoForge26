import os
import sys
import pandas as pd
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from backend.utils.llm_helper import generate_audit_explanation

mock_metrics = {
    'fairness_score': 40,
    'disparate_impact': 0.54,
    'counterfactual_flips': 5.3,
    'shap_values': [
        {'name': 'candidate_gender', 'importance': 0.8},
        {'name': 'age_group', 'importance': 0.6}
    ]
}

print("Testing AI Explanation...")
explanation = generate_audit_explanation(mock_metrics, is_baseline=True)
print(f"Result: {explanation}")
