import os
import io
import zipfile
import pandas as pd
import numpy as np
from typing import Optional
from flask import Blueprint, send_file, request, jsonify
from werkzeug.utils import secure_filename
from utils.model_type_detector import detect_model_type

download_bp = Blueprint('download', __name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')


def _add_balance_weight_column(
    df: pd.DataFrame,
    sensitive_column: str,
    target_column: Optional[str] = None,
) -> pd.DataFrame:
    """
    Add per-row inverse-frequency sample weights for RETRAINING purposes only.
    Column: FairAI_Balance_Weight (float, mean-normalised).
    NOT to be used for inference — use FairAI_Mitigated_Decision for that.
    """
    if not sensitive_column or sensitive_column not in df.columns:
        return df

    group_cols = [sensitive_column]
    if target_column and target_column in df.columns:
        group_cols.append(target_column)

    group_sizes = (
        df.groupby(group_cols, dropna=False)[group_cols[0]]
        .transform("count")
        .astype(float)
    )
    inv_freq = 1.0 / group_sizes
    normalized_weight = (inv_freq / inv_freq.mean()).fillna(1.0)

    out = df.copy()
    out["FairAI_Balance_Weight"] = normalized_weight.round(4)
    return out


def _generate_mitigated_df(
    data_path: str,
    model_path: str,
    target_column: Optional[str],
    sensitive_column: Optional[str],
) -> pd.DataFrame:
    """
    Build the enriched CSV delivered to the user.

    Columns added (in this order, at the end):
      FairAI_Mitigated_Decision  — binary 0/1 (classifier) or float (regressor)
                                   post-processed fair prediction per row.
      FairAI_Balance_Weight      — float inverse-frequency weight for retraining.

    These two columns have completely different semantics and must not be confused.
    """
    df = pd.read_csv(data_path)
    mitigated_preds_attached = False

    # ── Try to attach fair binary predictions ────────────────────────────
    if (
        model_path
        and os.path.exists(model_path)
        and target_column
        and sensitive_column
        and target_column in df.columns
        and sensitive_column in df.columns
    ):
        try:
            model_type_info = detect_model_type(model_path, data_path, target_column)
            model_type = model_type_info.get("model_type", "classification")

            baseline_res: dict = {}
            if model_type == "classification":
                from utils.fairness_analyzer import analyze_fairness
                baseline_res = analyze_fairness(
                    model_path, data_path, target_column, sensitive_column
                )
            elif model_type == "regression":
                from utils.regression_analyzer import analyze_regression_fairness
                baseline_res = analyze_regression_fairness(
                    model_path, data_path, target_column, sensitive_column
                )
            # clustering → no per-row predictions, skip silently

            if baseline_res:
                from utils.mitigation_engine import apply_roc_mitigation
                mitigated_res = apply_roc_mitigation(
                    baseline_res, sensitive_column, model_type
                )

                preds = mitigated_res.get("__mitigated_predictions")
                if preds is not None:
                    preds_arr = np.asarray(preds)
                    if len(preds_arr) == len(df):
                        # FIX: store as integer 0/1 for classification,
                        #      rounded float for regression.
                        if model_type == "classification":
                            df["FairAI_Mitigated_Decision"] = preds_arr.astype(int)
                        else:
                            df["FairAI_Mitigated_Decision"] = np.round(
                                preds_arr.astype(float), 4
                            )
                        mitigated_preds_attached = True
                        print(
                            f"[Download] FairAI_Mitigated_Decision attached "
                            f"({len(preds_arr)} rows, model_type={model_type})."
                        )
                    else:
                        print(
                            f"[Download] Row mismatch — preds={len(preds_arr)}, "
                            f"CSV={len(df)}. Skipping FairAI_Mitigated_Decision."
                        )

        except Exception as exc:
            import traceback
            print(f"[Download] Mitigated prediction generation failed: {exc}")
            traceback.print_exc()

    if not mitigated_preds_attached:
        print(
            "[Download] FairAI_Mitigated_Decision not attached "
            "(model missing / incompatible / clustering). "
            "Only FairAI_Balance_Weight will be added."
        )

    # ── Always attach balance weights (training-time utility) ────────────
    df = _add_balance_weight_column(df, sensitive_column, target_column)

    # ── Put FairAI columns last for clean presentation ────────────────────
    fairai_cols = [c for c in df.columns if c.startswith("FairAI_")]
    other_cols  = [c for c in df.columns if not c.startswith("FairAI_")]
    df = df[other_cols + fairai_cols]

    return df


# ── Wrapper script template (all 3 bugs fixed) ───────────────────────────────

_WRAPPER_TEMPLATE = '''\
"""
FairAI · Enterprise Deployment Wrapper  (fairness_guardrail.py)
===============================================================
Drop-in post-processing layer that applies Group-Aware Reject
Option Classification (ROC) for classifiers, or Mean-Gap Offset
for regressors, to close the demographic-parity gap at inference
time without retraining the underlying model.

Usage
-----
    from fairness_guardrail import FairAIWrapper
    wrapper = FairAIWrapper("{model_filename}")
    fair_preds = wrapper.predict(X_df)          # X_df is a pandas DataFrame

Requirements
------------
    pip install joblib numpy pandas scikit-learn
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder


# ── helpers ──────────────────────────────────────────────────────────────────

def _encode_for_model(X: pd.DataFrame, model) -> np.ndarray:
    """
    Convert a raw DataFrame (possibly containing string columns) into the
    numeric array the model expects.

    FIX Bug 3: raw string columns were passed directly to predict_proba,
    causing a ValueError for tree models trained on encoded features.

    Strategy (in order):
      1. If the model exposes feature_names_in_, one-hot-encode and align.
      2. Otherwise label-encode every object/category column and return values.
    """
    X_enc = X.copy().reset_index(drop=True)   # FIX Bug 2: canonical 0-based index

    # path 1: model knows its feature names → one-hot align
    if hasattr(model, "feature_names_in_"):
        expected = list(model.feature_names_in_)
        X_dummies = pd.get_dummies(X_enc)
        for col in expected:
            if col not in X_dummies.columns:
                X_dummies[col] = 0
        return X_dummies[expected].values.astype(float)

    # path 2: label-encode every non-numeric column
    for col in X_enc.select_dtypes(include=["object", "category"]).columns:
        X_enc[col] = LabelEncoder().fit_transform(X_enc[col].astype(str))

    return X_enc.values.astype(float)


# ── main wrapper ─────────────────────────────────────────────────────────────

class FairAIWrapper:
    """
    Parameters
    ----------
    model_path : str
        Path to the pickled scikit-learn model (.pkl).
    sensitive_col : str
        Name of the demographic / protected-attribute column in the
        inference DataFrame.
    closure_rate : float
        Fraction of the parity gap to close (0-1).  Default 0.8 = 80%.
    """

    def __init__(
        self,
        model_path: str = "{model_filename}",
        sensitive_col: str = "{sensitive_column}",
        closure_rate: float = 0.8,
    ):
        self.model         = joblib.load(model_path)
        self.sensitive_col = sensitive_col
        self.closure_rate  = closure_rate
        self._is_classifier = hasattr(self.model, "predict_proba")

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Return fair predictions for the supplied DataFrame.

        Classifiers  → numpy int array of 0/1
        Regressors   → numpy float array of adjusted predictions
        """
        if not isinstance(X, pd.DataFrame):
            raise TypeError("FairAIWrapper.predict() requires a pandas DataFrame.")

        if self.sensitive_col not in X.columns:
            print(
                f"[FairAIWrapper] WARNING: sensitive column '{{self.sensitive_col}}' "
                "not found in input.  Returning raw model predictions."
            )
            return self.model.predict(_encode_for_model(X, self.model))

        # FIX Bug 2: reset index so numpy/pandas boolean masks always align
        X = X.reset_index(drop=True)

        if self._is_classifier:
            return self._predict_classifier(X)
        else:
            return self._predict_regressor(X)

    def _predict_classifier(self, X: pd.DataFrame) -> np.ndarray:
        """ROC threshold-shift for classifiers."""
        X_enc = _encode_for_model(X, self.model)   # FIX Bug 3: encode first

        raw_probs = self.model.predict_proba(X_enc)
        pos_probs = raw_probs[:, 1] if raw_probs.shape[1] > 1 else raw_probs[:, 0]

        global_mean = float(np.mean(pos_probs))
        adjusted    = pos_probs.copy()

        for group in X[self.sensitive_col].unique():
            mask       = (X[self.sensitive_col] == group).values   # FIX Bug 2: .values → positional ndarray
            group_mean = float(np.mean(pos_probs[mask]))
            gap        = global_mean - group_mean
            adjusted[mask] += gap * self.closure_rate

        # FIX Bug 1: clip to [0, 1] BEFORE threshold comparison
        adjusted = np.clip(adjusted, 0.0, 1.0)

        return (adjusted >= 0.5).astype(int)

    def _predict_regressor(self, X: pd.DataFrame) -> np.ndarray:
        """Mean-gap offset post-processing for regressors."""
        X_enc = _encode_for_model(X, self.model)   # FIX Bug 3
        preds = self.model.predict(X_enc).astype(float)

        global_mean = float(np.mean(preds))
        adjusted    = preds.copy()

        for group in X[self.sensitive_col].unique():
            mask       = (X[self.sensitive_col] == group).values   # FIX Bug 2
            group_mean = float(np.mean(preds[mask]))
            gap        = global_mean - group_mean
            adjusted[mask] += gap * self.closure_rate

        return adjusted


# ── quick-start demo ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    wrapper = FairAIWrapper()
    print("FairAI Guardrail loaded.")
    print(f"  Model         : {{type(wrapper.model).__name__}}")
    print(f"  Is classifier : {{wrapper._is_classifier}}")
    print(f"  Sensitive col : {{wrapper.sensitive_col}}")

    if len(sys.argv) > 1:
        df = pd.read_csv(sys.argv[1])
        preds = wrapper.predict(df)
        print(f"  Predictions   : {{preds[:10]}}  (first 10 of {{len(preds)}})")
'''


def _render_wrapper(model_filename: str, sensitive_column: str) -> str:
    return _WRAPPER_TEMPLATE.format(
        model_filename=model_filename,
        sensitive_column=sensitive_column,
    )


# ── Flask routes ──────────────────────────────────────────────────────────────

@download_bp.route("/api/download/data", methods=["GET"])
def download_data():
    data_filename    = secure_filename(request.args.get("data_file", "data.csv"))
    model_filename   = secure_filename(request.args.get("model_file", ""))
    target_column    = request.args.get("target_column")
    sensitive_column = request.args.get("sensitive_column")
    data_url         = request.args.get("data_url")
    model_url        = request.args.get("model_url")

    data_path  = os.path.join(UPLOAD_FOLDER, data_filename)
    model_path = os.path.join(UPLOAD_FOLDER, model_filename) if model_filename else ""

    import urllib.request
    if not os.path.exists(data_path) and data_url:
        try:
            print(f"[Download] Fetching data from Cloudinary: {data_url}")
            urllib.request.urlretrieve(data_url, data_path)
        except Exception as e:
            print(f"[Download] Error fetching data: {e}")

    if model_filename and not os.path.exists(model_path) and model_url:
        try:
            print(f"[Download] Fetching model from Cloudinary: {model_url}")
            urllib.request.urlretrieve(model_url, model_path)
        except Exception as e:
            print(f"[Download] Error fetching model: {e}")

    if not os.path.exists(data_path):
        return jsonify({"error": "Data file not found on server."}), 404

    try:
        df = _generate_mitigated_df(
            data_path, model_path, target_column, sensitive_column
        )
        mem = io.StringIO()
        df.to_csv(mem, index=False)
        mem.seek(0)

        return send_file(
            io.BytesIO(mem.getvalue().encode("utf-8")),
            mimetype="text/csv",
            download_name=f"Mitigated_{data_filename}",
            as_attachment=True,
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@download_bp.route("/api/download/wrapper", methods=["GET"])
def download_wrapper():
    model_filename   = secure_filename(request.args.get("model_file", "model.pkl"))
    data_filename    = secure_filename(request.args.get("data_file", "data.csv"))
    sensitive_column = request.args.get("sensitive_column", "Unknown")
    target_column    = request.args.get("target_column", "Unknown")
    data_url         = request.args.get("data_url")
    model_url        = request.args.get("model_url")

    model_path = os.path.join(UPLOAD_FOLDER, model_filename)
    data_path  = os.path.join(UPLOAD_FOLDER, data_filename)

    import urllib.request
    if not os.path.exists(data_path) and data_url:
        try:
            print(f"[Download] Fetching data from Cloudinary: {data_url}")
            urllib.request.urlretrieve(data_url, data_path)
        except Exception as e:
            print(f"[Download] Error fetching data: {e}")

    if not os.path.exists(model_path) and model_url:
        try:
            print(f"[Download] Fetching model from Cloudinary: {model_url}")
            urllib.request.urlretrieve(model_url, model_path)
        except Exception as e:
            print(f"[Download] Error fetching model: {e}")

    if not os.path.exists(model_path):
        return jsonify({"error": "Model file not found on server."}), 404

    try:
        mem_zip = io.BytesIO()

        with zipfile.ZipFile(mem_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            # 1. Original model (unchanged)
            zf.write(model_path, arcname=model_filename)

            # 2. Mitigated CSV
            if os.path.exists(data_path):
                df = _generate_mitigated_df(
                    data_path, model_path, target_column, sensitive_column
                )
                csv_mem = io.StringIO()
                df.to_csv(csv_mem, index=False)
                zf.writestr(f"Mitigated_{data_filename}", csv_mem.getvalue())

            # 3. Fixed fairness_guardrail.py
            zf.writestr("fairness_guardrail.py", _render_wrapper(model_filename, sensitive_column))

            # 4. README explaining both columns
            readme = f"""\
FairAI Enterprise Wrapper — README
====================================

Files in this bundle
--------------------
{model_filename}
    Your original trained model (unchanged).

Mitigated_{data_filename}
    Your dataset enriched with two new FairAI columns:

    FairAI_Mitigated_Decision  (int 0/1 for classifiers, float for regressors)
        Post-processed FAIR prediction for every row.
        Produced by ROC threshold-shifting (classifier) or mean-gap offset
        (regressor). Use this for downstream analysis or as a reference label.

    FairAI_Balance_Weight  (float, mean-normalised ≈ 1.0)
        Per-row inverse-frequency sample weight.
        Use as `sample_weight=` when RETRAINING a new model so that
        minority groups receive proportionally more influence.
        Do NOT use for inference — it is a training-time tool only.

fairness_guardrail.py
    Drop-in wrapper. Import FairAIWrapper and call wrapper.predict(X_df).
    Bugs fixed vs the naive generated version:
      [Bug 1] Probability clipping to [0,1] before threshold comparison.
      [Bug 2] pandas/numpy index alignment via reset_index + .values masking.
      [Bug 3] Feature encoding (_encode_for_model) applied before predict_proba.

Sensitive column audited : {sensitive_column}
Target column            : {target_column}
"""
            zf.writestr("README.txt", readme)

        mem_zip.seek(0)
        return send_file(
            mem_zip,
            mimetype="application/zip",
            download_name="FairAI_Enterprise_Wrapper.zip",
            as_attachment=True,
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500