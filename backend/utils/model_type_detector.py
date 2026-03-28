"""
FairAI · Model Type Detector
=============================
Two-layer detection system:
  1. Groq LLM — Analyzes model metadata, returns type + reasoning
  2. Local Self-Learning Classifier — Learns from Groq responses over time

Training data is persisted in models/training_log.jsonl.
Once ≥20 samples accumulate with confidence > 0.85, local model can
classify without calling Groq.
"""

import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any

# ── Paths ─────────────────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).resolve().parent.parent
_MODELS_DIR = _BASE_DIR / "models"
_TRAINING_LOG = _MODELS_DIR / "training_log.jsonl"
_LOCAL_MODEL_PATH = _MODELS_DIR / "type_classifier.pkl"

_MODELS_DIR.mkdir(exist_ok=True)


# ── Feature Extraction ─────────────────────────────────────────────────────────

def _extract_model_features(model, sample_X: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Extract a feature dictionary from a loaded sklearn-style model.
    These features are used both for Groq context and local classifier training.
    """
    class_name = type(model).__name__
    module_name = type(model).__module__ or ""

    # Check for sklearn base classes
    is_sklearn_classifier = False
    is_sklearn_regressor = False
    is_sklearn_clusterer = False
    try:
        from sklearn.base import ClassifierMixin, RegressorMixin, ClusterMixin
        is_sklearn_classifier = isinstance(model, ClassifierMixin)
        is_sklearn_regressor = isinstance(model, RegressorMixin)
        is_sklearn_clusterer = isinstance(model, ClusterMixin)
    except ImportError:
        pass

    # Check for pipeline — unwrap to the final estimator
    final_estimator = model
    is_pipeline = False
    try:
        from sklearn.pipeline import Pipeline
        if isinstance(model, Pipeline):
            is_pipeline = True
            final_estimator = model.steps[-1][1]
            class_name = type(final_estimator).__name__
            module_name = type(final_estimator).__module__ or ""
            try:
                from sklearn.base import ClassifierMixin, RegressorMixin, ClusterMixin
                is_sklearn_classifier = isinstance(final_estimator, ClassifierMixin)
                is_sklearn_regressor = isinstance(final_estimator, RegressorMixin)
                is_sklearn_clusterer = isinstance(final_estimator, ClusterMixin)
            except ImportError:
                pass
    except ImportError:
        pass

    features = {
        "class_name": class_name,
        "module_name": module_name,
        "is_pipeline": is_pipeline,
        "has_predict_proba": hasattr(final_estimator, "predict_proba"),
        "has_decision_function": hasattr(final_estimator, "decision_function"),
        "has_n_classes": hasattr(final_estimator, "n_classes_") or hasattr(final_estimator, "classes_"),
        "class_name_has_classifier": "classifier" in class_name.lower(),
        "class_name_has_regressor": "regressor" in class_name.lower() or "regression" in class_name.lower(),
        "class_name_has_clusterer": "cluster" in class_name.lower() or "kmeans" in class_name.lower() or "dbscan" in class_name.lower(),
        "is_sklearn_classifier": is_sklearn_classifier,
        "is_sklearn_regressor": is_sklearn_regressor,
        "is_sklearn_clusterer": is_sklearn_clusterer,
        "has_coef": hasattr(final_estimator, "coef_"),
        "has_feature_importances": hasattr(final_estimator, "feature_importances_"),
    }

    # Try to get prediction characteristics from sample data
    if sample_X is not None:
        try:
            preds = model.predict(sample_X.head(min(50, len(sample_X))))
            features["output_is_float"] = np.issubdtype(np.array(preds).dtype, np.floating)
            features["n_unique_predictions"] = len(set(preds))
            features["pred_min"] = float(np.min(preds))
            features["pred_max"] = float(np.max(preds))
            features["pred_mean"] = float(np.mean(preds))
        except Exception:
            features["output_is_float"] = None
            features["n_unique_predictions"] = None
            features["pred_min"] = None
            features["pred_max"] = None
            features["pred_mean"] = None
    else:
        features["output_is_float"] = None
        features["n_unique_predictions"] = None
        features["pred_min"] = None
        features["pred_max"] = None
        features["pred_mean"] = None

    return features


def _features_to_vector(features: Dict[str, Any]) -> list:
    """Convert feature dict to a numeric vector for the local classifier."""
    return [
        int(bool(features.get("has_predict_proba", False))),
        int(bool(features.get("has_decision_function", False))),
        int(bool(features.get("has_n_classes", False))),
        int(bool(features.get("class_name_has_classifier", False))),
        int(bool(features.get("class_name_has_regressor", False))),
        int(bool(features.get("class_name_has_clusterer", False))),
        int(bool(features.get("is_sklearn_classifier", False))),
        int(bool(features.get("is_sklearn_regressor", False))),
        int(bool(features.get("is_sklearn_clusterer", False))),
        int(bool(features.get("has_coef", False))),
        int(bool(features.get("has_feature_importances", False))),
        int(bool(features.get("output_is_float", False))),
        int(features.get("n_unique_predictions") or 0),
        int(bool(features.get("is_pipeline", False))),
    ]


# ── Groq LLM Detection ────────────────────────────────────────────────────────

def _detect_with_groq(features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Ask Groq LLaMA to classify the model type based on its metadata.
    Returns dict with model_type, reason, confidence — or None on failure.
    """
    try:
        from groq import Groq
    except ImportError:
        print("Groq package not installed. Skipping LLM detection.")
        return None

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not set. Skipping LLM detection.")
        return None

    # Build a concise metadata summary for the LLM
    metadata_str = "\n".join([
        f"- Class name: {features['class_name']}",
        f"- Module: {features['module_name']}",
        f"- Is Pipeline: {features['is_pipeline']}",
        f"- Has predict_proba(): {features['has_predict_proba']}",
        f"- Has decision_function(): {features['has_decision_function']}",
        f"- Has n_classes_ or classes_: {features['has_n_classes']}",
        f"- Inherits ClassifierMixin: {features['is_sklearn_classifier']}",
        f"- Inherits RegressorMixin: {features['is_sklearn_regressor']}",
        f"- Inherits ClusterMixin: {features['is_sklearn_clusterer']}",
        f"- Class name contains 'Classifier': {features['class_name_has_classifier']}",
        f"- Class name contains 'Regressor/Regression': {features['class_name_has_regressor']}",
        f"- Class name contains 'Clusterer/KMeans/DBSCAN': {features['class_name_has_clusterer']}",
        f"- Has coef_: {features['has_coef']}",
        f"- Has feature_importances_: {features['has_feature_importances']}",
        f"- Output is float: {features.get('output_is_float')}",
        f"- Unique predictions (sample): {features.get('n_unique_predictions')}",
        f"- Prediction range: {features.get('pred_min')} to {features.get('pred_max')}",
    ])

    prompt = f"""You are an expert ML engineer. Based on the following model metadata, determine if this is a CLASSIFICATION model, a REGRESSION model, or a CLUSTERING model.

Model Metadata:
{metadata_str}

Respond in EXACTLY this JSON format (no markdown, no explanation outside the JSON):
{{"model_type": "classification" or "regression" or "clustering", "reason": "Brief 1-2 sentence explanation of why", "confidence": 0.0 to 1.0}}
"""

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=150,
        )
        raw = completion.choices[0].message.content.strip()

        # Parse JSON from the response (handle potential markdown wrapping)
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)

        # Validate structure
        if result.get("model_type") not in ("classification", "regression", "clustering"):
            print(f"Groq returned invalid model_type: {result}")
            return None

        result["confidence"] = float(result.get("confidence", 0.8))
        return result

    except Exception as e:
        print(f"Groq model type detection failed: {e}")
        return None


# ── Training Log I/O ──────────────────────────────────────────────────────────

def _append_training_sample(features: Dict[str, Any], label: str, reason: str, source: str):
    """Append a training sample to the JSONL log file."""
    entry = {
        "timestamp": time.time(),
        "features": _features_to_vector(features),
        "feature_names": list(features.keys()),
        "label": label,
        "reason": reason,
        "source": source,  # "groq" or "heuristic"
        "class_name": features.get("class_name", ""),
    }
    with open(_TRAINING_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    print(f"[ModelTypeDetector] Logged training sample: {label} ({source}) — {features.get('class_name')}")


def _load_training_data():
    """Load all training samples from the JSONL log."""
    if not _TRAINING_LOG.exists():
        return [], []
    
    X, y = [], []
    with open(_TRAINING_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                X.append(entry["features"])
                y.append(entry["label"])
            except (json.JSONDecodeError, KeyError):
                continue
    return X, y


# ── Local Self-Learning Classifier ────────────────────────────────────────────

def _train_local_model():
    """Train (or retrain) the local classifier from accumulated training data."""
    X, y = _load_training_data()
    if len(X) < 10:
        return None
    
    try:
        from sklearn.ensemble import RandomForestClassifier
        clf = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=5)
        clf.fit(X, y)
        joblib.dump(clf, _LOCAL_MODEL_PATH)
        print(f"[ModelTypeDetector] Local classifier trained on {len(X)} samples. Saved to {_LOCAL_MODEL_PATH}")
        return clf
    except Exception as e:
        print(f"[ModelTypeDetector] Failed to train local classifier: {e}")
        return None


def _predict_with_local_model(features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Try to predict model type using the local self-learning classifier.
    Returns result dict if confident, None otherwise.
    """
    X, y = _load_training_data()
    
    # Need at least 20 samples for meaningful local classification
    if len(X) < 20:
        print(f"[ModelTypeDetector] Only {len(X)} training samples — need 20+ for local prediction.")
        return None

    # Load or retrain
    try:
        if _LOCAL_MODEL_PATH.exists():
            clf = joblib.load(_LOCAL_MODEL_PATH)
        else:
            clf = _train_local_model()
            if clf is None:
                return None
    except Exception:
        clf = _train_local_model()
        if clf is None:
            return None

    # Predict
    vector = [_features_to_vector(features)]
    try:
        prediction = clf.predict(vector)[0]
        probas = clf.predict_proba(vector)[0]
        confidence = float(max(probas))

        if confidence < 0.85:
            print(f"[ModelTypeDetector] Local prediction '{prediction}' has low confidence ({confidence:.2f}) — deferring to Groq.")
            return None

        return {
            "model_type": prediction,
            "reason": f"Local self-learning classifier (trained on {len(X)} past samples) identified this as {prediction} with {confidence:.0%} confidence based on model metadata features.",
            "confidence": confidence,
            "source": "local_classifier",
        }
    except Exception as e:
        print(f"[ModelTypeDetector] Local prediction failed: {e}")
        return None


# ── Heuristic Fallback ─────────────────────────────────────────────────────────

def _detect_heuristic(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rule-based fallback when both Groq and local model are unavailable.
    Uses sklearn class hierarchy and naming conventions.
    """
    # Strong signals
    if features.get("is_sklearn_classifier"):
        return {"model_type": "classification", "reason": "Model inherits from sklearn ClassifierMixin.", "confidence": 0.95}
    if features.get("is_sklearn_regressor"):
        return {"model_type": "regression", "reason": "Model inherits from sklearn RegressorMixin.", "confidence": 0.95}
    if features.get("is_sklearn_clusterer"):
        return {"model_type": "clustering", "reason": "Model inherits from sklearn ClusterMixin.", "confidence": 0.95}

    if features.get("class_name_has_classifier"):
        return {"model_type": "classification", "reason": f"Class name '{features['class_name']}' contains 'Classifier'.", "confidence": 0.90}
    if features.get("class_name_has_regressor"):
        return {"model_type": "regression", "reason": f"Class name '{features['class_name']}' contains 'Regressor/Regression'.", "confidence": 0.90}

    # Medium signals
    if features.get("has_predict_proba") and features.get("has_n_classes"):
        return {"model_type": "classification", "reason": "Model has predict_proba() and classes_ attribute — typical of classifiers.", "confidence": 0.85}

    # Weak signals from predictions
    n_unique = features.get("n_unique_predictions")
    if n_unique is not None:
        if n_unique <= 10:
            return {"model_type": "classification", "reason": f"Model produces only {n_unique} unique values — likely discrete classes.", "confidence": 0.70}
        elif n_unique > 20:
            return {"model_type": "regression", "reason": f"Model produces {n_unique} unique values — likely continuous output.", "confidence": 0.75}

    if features.get("output_is_float"):
        return {"model_type": "regression", "reason": "Model output is floating-point — likely regression.", "confidence": 0.65}

    # Default to classification (safer assumption for fairness auditing)
    return {"model_type": "classification", "reason": "Could not determine model type — defaulting to classification.", "confidence": 0.50}


# ── Public API ─────────────────────────────────────────────────────────────────

def detect_model_type(model_path: str, data_path: Optional[str] = None, target_column: Optional[str] = None) -> Dict[str, Any]:
    """
    Detect whether a .pkl model is classification or regression.

    Uses a 3-layer strategy:
      1. Local self-learning classifier (if ≥20 training samples & confidence > 0.85)
      2. Groq LLM (primary)
      3. Heuristic fallback (if both above fail)

    Every Groq response is logged to train the local model over time.

    Parameters
    ----------
    model_path : str — Path to the .pkl model file
    data_path  : str — Path to the CSV data file (for sample predictions)
    target_column : str — Name of the target column (to exclude from features)

    Returns
    -------
    dict with keys: model_type, reason, confidence, source
    """
    # Load model
    try:
        raw_obj = joblib.load(model_path)
        # Unwrap if model is saved inside a dict (e.g., {"model": model, "scaler": scaler})
        if isinstance(raw_obj, dict):
            model = None
            for key in ['model', 'estimator', 'classifier', 'regressor', 'clf', 'pipeline', 'pipe']:
                if key in raw_obj and hasattr(raw_obj[key], 'predict'):
                    model = raw_obj[key]
                    print(f"[ModelTypeDetector] Extracted model from dict key '{key}'")
                    break
            if model is None:
                for key, val in raw_obj.items():
                    if hasattr(val, 'predict'):
                        model = val
                        print(f"[ModelTypeDetector] Extracted model from dict key '{key}'")
                        break
            if model is None:
                return {
                    "model_type": "classification",
                    "reason": f"Loaded .pkl is a dict with keys {list(raw_obj.keys())} but no predictable model found. Defaulting to classification.",
                    "confidence": 0.0,
                    "source": "error_fallback",
                }
        else:
            model = raw_obj
    except Exception as e:
        return {
            "model_type": "classification",
            "reason": f"Failed to load model: {e}. Defaulting to classification.",
            "confidence": 0.0,
            "source": "error_fallback",
        }

    # Prepare sample data for prediction-based features
    sample_X = None
    if data_path:
        try:
            df = pd.read_csv(data_path)
            drop_cols = [target_column, 'applicant_id', 'id', 'ID', 'index', 'Unnamed: 0']
            drop_cols = [c for c in drop_cols if c and c in df.columns]
            sample_X = df.drop(columns=drop_cols, errors='ignore').head(50)
        except Exception:
            pass

    # Extract features
    features = _extract_model_features(model, sample_X)
    print("Model Features:", features)

    # HARD CHECK FOR REGRESSION
    if features.get("output_is_float") and features.get("n_unique_predictions", 0) > 10:
        return {
            "model_type": "regression",
            "reason": "Continuous numeric predictions detected.",
            "confidence": 0.95
        }

    # Layer 1: Try local classifier first (if enabled by user config)
    # The default is False so Groq is always used, allowing the local ML to learn continuously in the background
    use_local = os.getenv("USE_LOCAL_CLASSIFIER", "false").lower() == "true"
    if use_local:
        local_result = _predict_with_local_model(features)
        if local_result is not None:
            print(f"[ModelTypeDetector] ✅ Local classifier: {local_result['model_type']} ({local_result['confidence']:.0%})")
            return local_result
    else:
        print("[ModelTypeDetector] Local classifier disabled by env. Falling back to Groq for detection and training log collection.")

    # Layer 2: Groq LLM
    groq_result = _detect_with_groq(features)
    if groq_result is not None:
        print(f"[ModelTypeDetector] ✅ Groq detected: {groq_result['model_type']} — {groq_result['reason']}")
        # Log for future local training
        _append_training_sample(features, groq_result["model_type"], groq_result["reason"], "groq")
        
        # Retrain local model if we hit a threshold (so it's ready when the user flips the toggle)
        X, _ = _load_training_data()
        if len(X) >= 20 and len(X) % 5 == 0:  # Retrain every 5 samples after 20
            _train_local_model()
            
        return {**groq_result, "source": "groq"}

    # Layer 3: Heuristic fallback
    heuristic_result = _detect_heuristic(features)
    print(f"[ModelTypeDetector] ⚠️ Heuristic fallback: {heuristic_result['model_type']} — {heuristic_result['reason']}")
    # Also log heuristic results for training
    _append_training_sample(features, heuristic_result["model_type"], heuristic_result["reason"], "heuristic")
    return {**heuristic_result, "source": "heuristic"}
