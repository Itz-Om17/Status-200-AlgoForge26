"""
FairAI · Regression Fairness Analyzer
=======================================
3-Tier Deep Fairness Audit adapted for regression (continuous output) models.

Tier 1: Mean Prediction Gap (MPG) — replaces Disparate Impact
Tier 2: Counterfactual Prediction Difference — replaces Counterfactual Flips
Tier 3: SHAP Feature Importance — same as classification
Bonus:  Error Fairness (MSE parity across groups)

Final Score = MPG_score - CF_penalty - SHAP_penalty

FIX SUMMARY (v2):
  - FIX A: _unwrap_model now returns a _ScaledModelWrapper when the pkl
            contains {model, scaler, ...}. Previously the scaler was silently
            dropped, making predictions ~1000x off for scaled models.
  - FIX B: __internals__ now correctly passes clean X (no temp columns) so
            the mitigation engine operates on correct feature data.
  - FIX C: preds_all at end of function uses clean X, not df with _predictions
            / _sq_error columns still attached.
  - FIX D: CF % change uses per-row absolute ratio and 4 decimal places so
            small-but-real values aren't shown as 0%.
  - FIX E: SHAP falls back to model coefficients for linear models (e.g.,
            LinearRegression) since TreeExplainer is not applicable.
"""

import pandas as pd
import numpy as np
import shap
import joblib


# ── Model unwrapping ──────────────────────────────────────────────────────────

class _ScaledModelWrapper:
    """
    Wraps a {model, scaler, feature_names} dict so it behaves like a normal
    sklearn estimator. Applies scaler.transform() before model.predict().

    FIX A: Previously _unwrap_model discarded the scaler, causing predictions
    to be made on raw (unscaled) features. For this house-price model the raw
    predictions averaged ~745M instead of the correct ~618K.
    """
    def __init__(self, model, scaler, feature_names=None):
        self.model = model
        self.scaler = scaler
        self.feature_names = feature_names
        # Forward key sklearn attributes so downstream checks still work
        if hasattr(model, 'feature_importances_'):
            self.feature_importances_ = model.feature_importances_
        if hasattr(model, 'coef_'):
            self.coef_ = model.coef_
        if hasattr(model, 'n_features_in_'):
            self.n_features_in_ = model.n_features_in_
        if hasattr(model, 'classes_'):
            self.classes_ = model.classes_

    def predict(self, X):
        if isinstance(X, pd.DataFrame):
            arr = X.values
        else:
            arr = np.asarray(X)
        return self.model.predict(self.scaler.transform(arr))

    def predict_proba(self, X):
        if isinstance(X, pd.DataFrame):
            arr = X.values
        else:
            arr = np.asarray(X)
        return self.model.predict_proba(self.scaler.transform(arr))

    def __repr__(self):
        return f"_ScaledModelWrapper(model={type(self.model).__name__})"


def _unwrap_model(obj):
    """
    Safely extract (or wrap) the actual predictor from a pkl object.

    Cases handled:
      1. Plain estimator with .predict() → returned as-is.
      2. dict with model + scaler → _ScaledModelWrapper (FIX A).
      3. dict with just a model key → return that model.
    """
    if not isinstance(obj, dict):
        return obj

    scaler = obj.get('scaler')
    feature_names = obj.get('feature_names')

    for key in ['model', 'estimator', 'classifier', 'regressor', 'clf', 'pipeline', 'pipe']:
        if key in obj and hasattr(obj[key], 'predict'):
            inner = obj[key]
            if scaler is not None:
                print(f"[Unwrap] Wrapping model+scaler (key='{key}')")
                return _ScaledModelWrapper(inner, scaler, feature_names)
            print(f"[Unwrap] Extracted model from dict key '{key}' (no scaler)")
            return inner

    for key, val in obj.items():
        if hasattr(val, 'predict'):
            if scaler is not None:
                print(f"[Unwrap] Wrapping model+scaler (key='{key}')")
                return _ScaledModelWrapper(val, scaler, feature_names)
            print(f"[Unwrap] Extracted model from dict key '{key}'")
            return val

    return obj  # will fail downstream with a clear error


# ── Safe prediction with encoding fallbacks ───────────────────────────────────

def _safe_predict_regression(model, df_in):
    """
    Attempt predictions with multiple encoding fallback strategies.
    _ScaledModelWrapper handles scaling internally, so no special casing needed.
    """
    try:
        preds = model.predict(df_in)
        return np.array(preds, dtype=float)
    except (ValueError, TypeError) as ve:
        err_str = str(ve).lower()
        err_keys = ["string", "object", "convert", "categorical", "mismatch",
                    "shape", "expected", "could not", "feature", "match", "unseen", "missing"]
        if not any(k in err_str for k in err_keys):
            raise ve

        # Attempt 1: LabelEncode categoricals
        from sklearn.preprocessing import LabelEncoder
        try:
            X_enc = df_in.copy()
            if len(X_enc.select_dtypes(include=['object', 'category']).columns):
                for c in X_enc.select_dtypes(include=['object', 'category']).columns:
                    X_enc[c] = LabelEncoder().fit_transform(X_enc[c].astype(str))
                try:
                    return np.array(model.predict(X_enc), dtype=float)
                except Exception:
                    return np.array(model.predict(X_enc.values), dtype=float)
        except Exception:
            pass

        # Attempt 2: One-hot encode and align
        inner = model.model if isinstance(model, _ScaledModelWrapper) else model
        if hasattr(inner, "feature_names_in_"):
            expected = list(inner.feature_names_in_)
            dummies = pd.get_dummies(df_in)
            for c in expected:
                if c not in dummies.columns:
                    dummies[c] = 0
            try:
                return np.array(model.predict(dummies[expected]), dtype=float)
            except Exception:
                pass

        # Attempt 3: Shape matching
        try:
            import re as _re
            dummies = pd.get_dummies(df_in)
            n_in = getattr(inner, "n_features_in_", None)
            if n_in is None:
                m = _re.search(r"expected:? (\d+)", err_str)
                if m:
                    n_in = int(m.group(1))
            if n_in is not None:
                if dummies.shape[1] >= n_in:
                    return np.array(model.predict(dummies.values[:, :n_in]), dtype=float)
                else:
                    pad = pd.DataFrame(
                        np.zeros((len(dummies), n_in - dummies.shape[1])),
                        index=dummies.index)
                    return np.array(model.predict(pd.concat([dummies, pad], axis=1).values), dtype=float)
        except Exception:
            pass

        raise ve


# ── Fallback ─────────────────────────────────────────────────────────────────

def _fallback_score(msg: str) -> dict:
    return {
        "model_type": "regression",
        "fairness_score": 100,
        "mean_prediction_gap": 0.0,
        "per_row_abs_deviation": 0.0,
        "mpg_normalized": 1.0,
        "group_means": {},
        "privileged_group": "",
        "unprivileged_group": "",
        "counterfactual_avg_diff": 0.0,
        "counterfactual_pct_change": 0.0,
        "shap_values": [],
        "error_ratio": 1.0,
        "cv_mse_parity": 1.0,
        "fold_mses": [],
        "group_errors": {},
        "is_biased": False,
        "error": msg,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def analyze_regression_fairness(
    model_path: str,
    data_path: str,
    target_column: str,
    sensitive_column: str,
) -> dict:
    """
    Executes the 3-Tier Deep Fairness Audit for REGRESSION models.
    """

    # 1. Load & validate data
    df = pd.read_csv(data_path)
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset")
    if sensitive_column not in df.columns:
        raise ValueError(f"Sensitive column '{sensitive_column}' not found in dataset")

    df = df.dropna(subset=[target_column, sensitive_column])
    df[target_column] = pd.to_numeric(df[target_column], errors='coerce')
    df = df.dropna(subset=[target_column])

    if len(df) < 10:
        return _fallback_score("Not enough data after cleaning")

    groups = df[sensitive_column].unique()
    if len(groups) < 2:
        return _fallback_score(f"Sensitive column '{sensitive_column}' needs ≥2 unique values")

    # 2. Load model — FIX A: now properly wraps scaler
    try:
        model = _unwrap_model(joblib.load(model_path))
    except Exception as e:
        raise ValueError(f"Failed to load model: {str(e)}")

    # 3. Build clean feature matrix X (no target, no ID columns)
    drop_candidates = [target_column, 'applicant_id', 'id', 'ID', 'index', 'Unnamed: 0']
    cols_to_drop = [c for c in drop_candidates if c in df.columns]
    X = df.drop(columns=cols_to_drop, errors='ignore').copy()

    print(f"[RegressionAnalyzer] Features: {list(X.columns)}")
    print(f"[RegressionAnalyzer] Sensitive: {sensitive_column}, groups: {list(groups)}")

    # ── TIER 1: Mean Prediction Gap ───────────────────────────────────────────
    try:
        predictions = _safe_predict_regression(model, X)
    except Exception as e:
        raise ValueError(f"Model prediction failed: {str(e)}")

    # Use a separate working copy — never pollute X with temp columns (FIX B/C)
    df_work = df.copy()
    df_work['_predictions'] = predictions

    group_means = df_work.groupby(sensitive_column)['_predictions'].mean()
    print(f"[RegressionAnalyzer] Group means:\n{group_means.to_dict()}")

    privileged_group = group_means.idxmax()
    unprivileged_group = group_means.idxmin()
    mu_privileged = group_means.max()
    mu_unprivileged = group_means.min()

    mean_prediction_gap = abs(mu_privileged - mu_unprivileged)
    group_mean_per_row = df_work[sensitive_column].map(group_means)
    per_row_abs_deviation = float(np.mean(np.abs(df_work['_predictions'] - group_mean_per_row)))

    mpg_normalized = (
        max(0.0, min(1.0, mu_unprivileged / mu_privileged))
        if mu_privileged != 0 else 1.0
    )
    print(f"[RegressionAnalyzer] MPG={mean_prediction_gap:.2f}, Normalized={mpg_normalized:.4f}")

    # ── TIER 2: Counterfactual Prediction Difference ──────────────────────────
    sample_size = min(500, len(df_work))
    sample_idx = X.sample(n=sample_size, random_state=42).index
    X_sample = X.loc[sample_idx].copy()

    try:
        preds_original = _safe_predict_regression(model, X_sample)
    except Exception as e:
        raise ValueError(f"Sample prediction failed: {str(e)}")

    X_flipped = X_sample.copy()
    for idx in X_flipped.index:
        v = X_flipped.loc[idx, sensitive_column]
        X_flipped.loc[idx, sensitive_column] = (
            unprivileged_group if v == privileged_group else privileged_group
        )

    counterfactual_avg_diff = 0.0
    counterfactual_pct_change = 0.0
    try:
        preds_flipped = _safe_predict_regression(model, X_flipped)
        abs_diffs = np.abs(preds_original - preds_flipped)
        counterfactual_avg_diff = float(np.mean(abs_diffs))
        # FIX D: 4 decimal places; avoid masking small real differences
        safe_denom = np.where(np.abs(preds_original) < 1.0, 1.0, np.abs(preds_original))
        counterfactual_pct_change = float(np.mean(abs_diffs / safe_denom * 100.0))
        print(f"[RegressionAnalyzer] CF avg diff={counterfactual_avg_diff:.4f}, pct={counterfactual_pct_change:.6f}%")
    except Exception as e:
        print(f"[RegressionAnalyzer] Counterfactual failed: {e}")

    # ── TIER 3: SHAP / Feature Importance ────────────────────────────────────
    shap_results = []
    shap_importance_sensitive = 0.0

    inner_model = model.model if isinstance(model, _ScaledModelWrapper) else model

    try:
        if hasattr(inner_model, 'feature_importances_'):
            # Tree-based models: use built-in importances directly
            importances = inner_model.feature_importances_
            imp_sum = sum(importances) or 1
            for name, imp in zip(X.columns, importances):
                val = imp / imp_sum
                shap_results.append({"name": name, "importance": round(val, 3)})
                if name == sensitive_column:
                    shap_importance_sensitive = val
            shap_results = sorted(shap_results, key=lambda x: x['importance'], reverse=True)[:5]

        elif hasattr(inner_model, 'coef_'):
            # FIX E: Linear models — use |coefficients| as proxy for importance
            # (SHAP TreeExplainer doesn't apply here)
            coefs = np.abs(inner_model.coef_).flatten()
            coef_sum = coefs.sum() or 1
            for name, c in zip(X.columns, coefs):
                val = float(c / coef_sum)
                shap_results.append({"name": name, "importance": round(val, 3)})
                if name == sensitive_column:
                    shap_importance_sensitive = val
            shap_results = sorted(shap_results, key=lambda x: x['importance'], reverse=True)[:5]

        else:
            # Generic SHAP fallback for other model types
            from sklearn.preprocessing import LabelEncoder
            X_shap = X_sample.copy()
            for col in X_shap.select_dtypes(include=['object', 'category']).columns:
                X_shap[col] = LabelEncoder().fit_transform(X_shap[col].astype(str))
            explainer = shap.Explainer(inner_model, X_shap)
            shap_vals = explainer(X_shap)
            vals = np.abs(shap_vals.values).mean(0)
            if len(vals.shape) > 1:
                vals = vals.mean(axis=1)
            val_sum = vals.sum() or 1
            for name, val in zip(X_shap.columns, vals):
                v_norm = float(val / val_sum)
                shap_results.append({"name": name, "importance": round(v_norm, 3)})
                if name == sensitive_column:
                    shap_importance_sensitive = v_norm
            shap_results = sorted(shap_results, key=lambda x: x['importance'], reverse=True)[:5]

    except Exception as e:
        print(f"[RegressionAnalyzer] SHAP extraction failed: {e}")
        shap_results = [{"name": sensitive_column, "importance": 0.1}]
        shap_importance_sensitive = 0.1

    # ── BONUS: MSE Parity ─────────────────────────────────────────────────────
    error_ratio = 1.0
    cv_mse_parity = 1.0
    group_errors = {}
    fold_mses = []

    try:
        actual = df_work[target_column].values
        predicted = df_work['_predictions'].values
        sq_errors = (actual - predicted) ** 2
        df_work['_sq_error'] = sq_errors
        group_mse = df_work.groupby(sensitive_column)['_sq_error'].mean()
        group_errors = {str(k): round(float(v), 4) for k, v in group_mse.items()}
        if group_mse.max() > 0:
            error_ratio = float(group_mse.min() / group_mse.max())
        print(f"[RegressionAnalyzer] MSE parity={error_ratio:.4f}, groups={group_errors}")
    except Exception as e:
        print(f"[RegressionAnalyzer] MSE parity failed: {e}")

    # 5-fold CV MSE parity
    try:
        from sklearn.model_selection import KFold
        from sklearn.metrics import mean_squared_error as _mse
        from sklearn.preprocessing import StandardScaler as _SS, LabelEncoder

        kf = KFold(n_splits=5, shuffle=True, random_state=42)
        X_cv = X.copy()
        y_cv = df_work[target_column].values
        for col in X_cv.select_dtypes(include=['object', 'category']).columns:
            X_cv[col] = LabelEncoder().fit_transform(X_cv[col].astype(str))

        for tr_idx, te_idx in kf.split(X_cv):
            X_tr, X_te = X_cv.iloc[tr_idx].values, X_cv.iloc[te_idx].values
            y_tr, y_te = y_cv[tr_idx], y_cv[te_idx]
            sc = _SS()
            try:
                m_fold = type(inner_model)()
                m_fold.fit(sc.fit_transform(X_tr), y_tr)
                fold_mses.append(float(_mse(y_te, m_fold.predict(sc.transform(X_te)))))
            except Exception:
                pass

        if fold_mses and max(fold_mses) > 0:
            cv_mse_parity = min(fold_mses) / max(fold_mses)
            print(f"[RegressionAnalyzer] CV MSE parity={cv_mse_parity:.4f}")
    except Exception as e:
        print(f"[RegressionAnalyzer] CV MSE parity failed: {e}")

    # ── Combined Fairness Score ───────────────────────────────────────────────
    # Cast to plain Python float first so all comparisons return Python bool,
    # not numpy.bool_ (which Flask's jsonify cannot serialize).
    mpg_normalized = float(mpg_normalized)
    counterfactual_pct_change = float(counterfactual_pct_change)
    counterfactual_avg_diff = float(counterfactual_avg_diff)
    error_ratio = float(error_ratio)
    cv_mse_parity = float(cv_mse_parity)
    mean_prediction_gap = float(mean_prediction_gap)
    per_row_abs_deviation = float(per_row_abs_deviation)

    mpg_score_scaled = mpg_normalized * 100
    cf_penalty = min(counterfactual_pct_change / 10.0, 1.0) * 30
    shap_penalty = min(shap_importance_sensitive * 2.0, 1.0) * 30 if mpg_normalized < 0.8 else 0.0
    er_penalty = max(0.0, (0.8 - error_ratio) / 0.8) * 20 if error_ratio < 0.8 else 0.0

    final_score = max(0, int(mpg_score_scaled - cf_penalty - shap_penalty - er_penalty))
    # bool() ensures Python bool even when operands are numpy scalars
    is_biased = bool(mpg_normalized < 0.8 or counterfactual_pct_change > 5.0 or error_ratio < 0.7)

    if mpg_normalized < 0.8 and counterfactual_pct_change > 0 and shap_importance_sensitive > 0.1:
        if final_score > 50:
            final_score = int(final_score * 0.5)

    print(
        f"[RegressionAnalyzer] Score={final_score}% "
        f"(MPG={mpg_score_scaled:.1f}, CF_pen={cf_penalty:.2f}, "
        f"SHAP_pen={shap_penalty:.2f}, ER_pen={er_penalty:.2f})"
    )

    # FIX C: preds_all uses clean X (no temp columns attached)
    preds_all = _safe_predict_regression(model, X)

    return {
        "model_type": "regression",
        "fairness_score": final_score,
        "mean_prediction_gap": round(mean_prediction_gap, 2),
        "per_row_abs_deviation": round(per_row_abs_deviation, 2),
        "mpg_normalized": round(mpg_normalized, 3),
        "group_means": {str(k): round(float(v), 2) for k, v in group_means.items()},
        "privileged_group": str(privileged_group),
        "unprivileged_group": str(unprivileged_group),
        "counterfactual_avg_diff": round(counterfactual_avg_diff, 2),
        "counterfactual_pct_change": round(counterfactual_pct_change, 4),
        "shap_values": shap_results,
        "is_biased": is_biased,
        "error_ratio": round(error_ratio, 3),
        "cv_mse_parity": round(cv_mse_parity, 3),
        "fold_mses": [float(round(m, 0)) for m in fold_mses],
        "group_errors": group_errors,
        # FIX B: clean X, no temp columns — safe for mitigation engine
        "__internals__": {
            "model": model,
            "X": X,
            "y_pred": preds_all,
            "target": target_column,
            "sensitive": sensitive_column,
        },
    }