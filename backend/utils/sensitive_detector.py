"""
FairAI · Module 1 — Sensitive Attribute Detector
=================================================
A pure-Python library (no external LLM) that analyses a pandas DataFrame
and returns a structured report of sensitive columns.

Usage
-----
    from utils.sensitive_detector import SensitiveAttributeDetector, detect_sensitive_attributes

    detector = SensitiveAttributeDetector(threshold=20.0)
    report   = detector.analyse(df)

    names  = report.sensitive_columns          # ['gender', 'age', ...]
    df_res = report.to_dataframe()             # full scored table
    d      = report.to_dict()                  # JSON-serialisable summary
"""

from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


# ── Knowledge Bases ───────────────────────────────────────────────────────────

SENSITIVE_KEYWORD_MAP: Dict[str, List[str]] = {
    "gender":      ["gender", "sex", "male", "female", "sexuality", "orientation"],
    # Removed 'age' from default sensitive parameters per request.
    "race":        ["race", "ethnicity", "ethnic", "racial", "caste", "tribe", "color", "origin"],
    "religion":    ["religion", "faith", "belief", "christian", "muslim", "hindu", "jewish", "sikh"],
    "nationality": ["nationality", "country", "citizen", "citizenship", "immigrant", "migrant"],
    "disability":  ["disability", "disabled", "handicap", "impairment", "accessibility"],
    "income":      ["income", "salary", "wage", "earning", "revenue", "compensation", "wealth"],
    "education":   ["education", "degree", "qualification", "school", "college", "literacy", "diploma"],
    "marital":     ["marital", "marriage", "married", "single", "divorced", "widowed", "spouse"],
    "family":      ["children", "kids", "family", "dependent", "parental", "parent", "guardian"],
    "location":    ["zip", "zipcode", "postal", "postcode", "district", "suburb", "neighborhood",
                    "neighbourhood", "region", "area", "zone", "community"],
    "political":   ["political", "party", "vote", "voter", "ideology", "affiliation"],
}

VALUE_PATTERN_MAP: Dict[str, List[set]] = {
    "gender":      [{"male", "female"}, {"m", "f"}, {"man", "woman"},
                    {"male", "female", "other"}, {"male", "female", "non-binary"}],
    "race":        [{"white", "black", "asian", "hispanic", "latino", "other"},
                    {"caucasian", "african american", "asian", "hispanic"}],
    "marital":     [{"single", "married", "divorced", "widowed"}, {"married", "unmarried"}],
    "education":   [{"high school", "bachelor", "master", "phd", "doctorate"},
                    {"graduate", "undergraduate", "postgraduate"}],
    "religion":    [{"christian", "muslim", "hindu", "jewish", "buddhist", "sikh", "other"}],
    "nationality": [{"indian", "american", "british", "chinese", "other"}],
    "employment":  [{"employed", "unemployed", "self-employed"},
                    {"full-time", "part-time", "unemployed", "retired"}],
}

# Keywords that strongly suggest a column is the prediction TARGET (not a feature/sensitive)
TARGET_KEYWORDS: List[str] = [
    "target", "label", "outcome", "output", "predict", "result", "decision",
    "approved", "approval", "status", "default", "fraud", "churn", "survived",
    "diagnosis", "class", "y", "loan_status", "credit_risk", "hired", "placement",
    "admitted", "passed", "dropped",
]


# ── Column-level result ───────────────────────────────────────────────────────

@dataclass
class ColumnResult:
    column: str
    dtype: str
    n_unique: int
    null_pct: float
    score: float
    sensitive: bool
    category: Optional[str]
    signals: List[str] = field(default_factory=list)
    signal_detail: Dict[str, float] = field(default_factory=dict)
    weight_detail: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


# ── Report returned to caller ─────────────────────────────────────────────────

class DetectionReport:
    """
    Wraps the full analysis result.

    Attributes
    ----------
    results      : list of ColumnResult, sorted by score descending
    threshold    : the score threshold used
    total_cols   : total columns analysed
    """

    def __init__(self, results: List[ColumnResult], threshold: float, total_cols: int):
        self.results = results
        self.threshold = threshold
        self.total_cols = total_cols

    # ── Convenience accessors ──────────────────────────────────────────────

    @property
    def sensitive_columns(self) -> List[str]:
        """Return just the names of flagged columns, sorted by score."""
        return [r.column for r in self.results if r.sensitive]

    @property
    def sensitive_results(self) -> List[ColumnResult]:
        return [r for r in self.results if r.sensitive]

    @property
    def non_sensitive_results(self) -> List[ColumnResult]:
        return [r for r in self.results if not r.sensitive]

    def high_confidence(self) -> List[str]:
        """Columns scoring >= 70 (high confidence sensitive)."""
        return [r.column for r in self.results if r.score >= 70]

    def by_category(self) -> Dict[str, List[str]]:
        """Group sensitive column names by inferred category."""
        cats: Dict[str, List[str]] = defaultdict(list)
        for r in self.sensitive_results:
            cats[r.category or "unknown"].append(r.column)
        return dict(cats)

    def score_for(self, column: str) -> Optional[float]:
        for r in self.results:
            if r.column == column:
                return r.score
        return None

    # ── Serialisation ──────────────────────────────────────────────────────

    def to_dataframe(self) -> pd.DataFrame:
        """Full scored table as a DataFrame."""
        rows = [r.to_dict() for r in self.results]
        df = pd.DataFrame(rows)
        df["signals"] = df["signals"].apply(lambda x: " | ".join(x))
        return df

    def to_dict(self) -> dict:
        """JSON-serialisable summary."""
        return {
            "sensitive_attributes": self.sensitive_columns,
            "threshold_used": self.threshold,
            "total_columns_analysed": self.total_cols,
            "high_confidence": self.high_confidence(),
            "by_category": self.by_category(),
            "scores": {r.column: r.score for r in self.results},
        }

    def save(self, path: str | Path) -> None:
        """Write summary JSON to disk."""
        Path(path).write_text(json.dumps(self.to_dict(), indent=2))

    def __repr__(self) -> str:
        n = len(self.sensitive_columns)
        return (f"DetectionReport(sensitive={n}, threshold={self.threshold}, "
                f"total_cols={self.total_cols})")


# ── Signal functions (pure, stateless) ───────────────────────────────────────

def _normalise(v) -> str:
    return str(v).lower().strip()


def _col_keyword_score(col_name: str) -> Tuple[Optional[str], float]:
    cn = re.sub(r"[_\-\s]+", " ", col_name.lower())
    best_cat, best_score = None, 0.0
    for cat, keywords in SENSITIVE_KEYWORD_MAP.items():
        for kw in keywords:
            kw_clean = kw.replace("_", " ")
            if re.search(rf"\b{re.escape(kw_clean)}\b", cn):
                s = 1.0
            elif kw_clean in cn:
                s = 0.8
            elif any(tok.startswith(kw_clean[:4]) for tok in cn.split() if len(kw_clean) >= 4):
                s = 0.5
            else:
                continue
            if s > best_score:
                best_cat, best_score = cat, s
    return best_cat, best_score


def _value_pattern_score(series: pd.Series) -> Tuple[Optional[str], float]:
    uniq = {_normalise(v) for v in series.dropna().unique() if str(v).strip()}
    if not uniq or len(uniq) > 30:
        return None, 0.0
    best_cat, best_score = None, 0.0
    for cat, patterns in VALUE_PATTERN_MAP.items():
        for pattern_set in patterns:
            overlap = len(uniq & pattern_set) / len(pattern_set)
            cover   = len(uniq & pattern_set) / max(len(uniq), 1)
            score   = overlap * 0.6 + cover * 0.4
            if score > best_score:
                best_cat, best_score = cat, round(score, 3)
    return best_cat, best_score


def _entropy(series: pd.Series) -> float:
    vc = series.dropna().value_counts(normalize=True)
    if len(vc) <= 1:
        return 0.0
    h = -sum(p * math.log2(p) for p in vc if p > 0)
    return round(h / math.log2(len(vc)), 4)


def _numeric_range_flag(series: pd.Series) -> Tuple[bool, str]:
    mn, mx = series.min(), series.max()
    flags = []
    # FIX Bug 11: age-range check removed — age is intentionally excluded as sensitive attr.
    # The old code had `pass` here, silently doing nothing while appearing to check something.
    if mn >= 1000 and mx >= 20_000:
        flags.append("income-range")
    if 10_000 <= mn and mx <= 99_999:
        flags.append("zip-range")
    return bool(flags), "|".join(flags)


def _gini_impurity(series: pd.Series) -> float:
    vc = series.dropna().value_counts(normalize=True)
    return round(1 - sum(p ** 2 for p in vc), 4)


# ── Core analyser ─────────────────────────────────────────────────────────────

def _analyse_column(col_name: str, series: pd.Series) -> ColumnResult:
    signals: List[str] = []
    signal_detail: Dict[str, float] = {}
    weights: Dict[str, float] = {}
    category: Optional[str] = None

    # 1 · Keyword match (max 45 pts)
    kw_cat, kw_score = _col_keyword_score(col_name)
    weights["keyword_match"] = kw_score * 45
    if kw_score > 0:
        signals.append(f"Keyword match → '{kw_cat}' ({kw_score:.0%})")
        category = kw_cat

    # 2 · Value pattern match (max 30 pts)
    vp_cat, vp_score = _value_pattern_score(series)
    weights["value_pattern"] = vp_score * 30
    if vp_score > 0.3:
        signals.append(f"Value pattern → '{vp_cat}' ({vp_score:.0%})")
        if not category:
            category = vp_cat

    # 3 · Low cardinality for categoricals (max 10 pts)
    n_uniq = series.nunique()
    if series.dtype == object or str(series.dtype) == "bool":
        if 2 <= n_uniq <= 10:
            card_score = max(0.0, 1 - (n_uniq - 2) / 10)
            weights["low_cardinality"] = card_score * 10
            signals.append(f"Low cardinality ({n_uniq} unique values)")

    # 4 · Entropy in sensitive range (max ~5 pts)
    ent = _entropy(series)
    signal_detail["entropy"] = ent
    if 0.25 <= ent <= 0.92:
        ent_bonus = (1 - abs(ent - 0.6)) * 5
        weights["entropy"] = max(0.0, ent_bonus)
        if ent_bonus > 1:
            signals.append(f"Entropy in sensitive range ({ent:.3f})")

    # 5 · Numeric range heuristics (12 pts)
    if pd.api.types.is_numeric_dtype(series):
        flagged, flag_label = _numeric_range_flag(series)
        if flagged:
            weights["numeric_range"] = 12
            signals.append(f"Numeric range matches '{flag_label}'")
            if not category:
                # FIX Bug 11: "age-range" branch removed (flag is never produced above).
                if "income-range" in flag_label:
                    category = "income"
                elif "zip-range" in flag_label:
                    category = "location"

    # 6 · Gini impurity (3 pts)
    gi = _gini_impurity(series)
    signal_detail["gini"] = gi
    if series.dtype == object and 0.3 < gi < 0.95:
        weights["gini"] = 3
        signals.append(f"Gini impurity = {gi:.3f} (diverse categorical)")

    # 7 · Short column name (2 pts)
    if len(col_name) <= 4:
        weights["short_name"] = 2
        signals.append("Very short column name (common in sensitive attrs)")

    score = round(min(sum(weights.values()), 100.0), 1)

    return ColumnResult(
        column=col_name,
        dtype=str(series.dtype),
        n_unique=int(n_uniq),
        null_pct=round(series.isnull().mean() * 100, 1),
        score=score,
        sensitive=False,           # set by caller after threshold check
        category=category,
        signals=signals,
        signal_detail=signal_detail,
        weight_detail={k: round(v, 2) for k, v in weights.items()},
    )


# ── Target column heuristic ───────────────────────────────────────────────────

def _detect_target_column(df: pd.DataFrame) -> Optional[str]:
    """
    Heuristically guess the most likely target/label column.
    Priority:
      1. Exact keyword match in column name (case-insensitive).
      2. Low cardinality binary column with a target-like name prefix.
      3. Last column in the DataFrame (common convention).
    """
    cols_lower = {col: col.lower().replace("-", "_").replace(" ", "_") for col in df.columns}

    # Pass 1: exact keyword in name
    for col, col_l in cols_lower.items():
        for kw in TARGET_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", col_l):
                return col

    # Pass 2: binary column whose name contains a target-ish stem
    for col, col_l in cols_lower.items():
        n_uniq = df[col].nunique()
        if n_uniq == 2:
            for kw in TARGET_KEYWORDS:
                if kw[:4] in col_l:
                    return col

    # Pass 3: fall back to last column
    return df.columns[-1]


# ── Public API ────────────────────────────────────────────────────────────────

class SensitiveAttributeDetector:
    """
    Stateless analyser — instantiate once, call .analyse() many times.

    Parameters
    ----------
    threshold : float
        Columns scoring >= threshold are flagged as sensitive. Default 20.
    """

    def __init__(self, threshold: float = 20.0):
        if not (0 <= threshold <= 100):
            raise ValueError("threshold must be between 0 and 100")
        self.threshold = threshold

    def analyse(self, df: pd.DataFrame) -> DetectionReport:
        """
        Analyse every column in *df* and return a DetectionReport.
        """
        if not isinstance(df, pd.DataFrame):
            raise TypeError("df must be a pandas DataFrame")
        if df.empty:
            raise ValueError("DataFrame is empty — nothing to analyse")

        col_results = [_analyse_column(col, df[col]) for col in df.columns]

        # Apply threshold and sort by score descending
        for r in col_results:
            r.sensitive = r.score >= self.threshold
        col_results.sort(key=lambda r: r.score, reverse=True)

        return DetectionReport(
            results=col_results,
            threshold=self.threshold,
            total_cols=len(df.columns),
        )

    def analyse_csv(self, path: str | Path) -> DetectionReport:
        """Convenience wrapper — reads CSV from disk then calls .analyse()."""
        return self.analyse(pd.read_csv(path))

    def __repr__(self) -> str:
        return f"SensitiveAttributeDetector(threshold={self.threshold})"


# ── One-liner helpers ─────────────────────────────────────────────────────────

def detect_sensitive_attributes(
    df: pd.DataFrame,
    threshold: float = 20.0,
) -> List[str]:
    """Return just the list of sensitive column names."""
    return SensitiveAttributeDetector(threshold=threshold).analyse(df).sensitive_columns


def analyse_dataframe(
    df: pd.DataFrame,
    threshold: float = 20.0,
) -> DetectionReport:
    """Return the full DetectionReport."""
    return SensitiveAttributeDetector(threshold=threshold).analyse(df)