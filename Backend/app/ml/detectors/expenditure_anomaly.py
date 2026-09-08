"""
app/ml/detectors/expenditure_anomaly.py
========================================
Detects projects whose expenditure is abnormally high compared to peers
in the same (work_category, state) group.

Method:
  1. Z-score within peer group (fast, interpretable).
  2. IsolationForest across all projects (unsupervised global anomaly).
  Final score = max(zscore_score, if_score), capped at 100.

Output: Series[float] indexed by project_id, values 0-100.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler

from app.core.config import (
    EXPENDITURE_IF_CONTAMINATION,
    EXPENDITURE_ZSCORE_THRESHOLD,
)


def _zscore_score(df: pd.DataFrame) -> pd.Series:
    """Convert expenditure_zscore to a 0-100 score (higher z → higher score)."""
    z = df["expenditure_zscore"].fillna(0)
    # Positive z only matters (we flag high spenders, not low)
    z_pos = z.clip(lower=0)
    # 2.5σ → ~60,  5σ → 100, linear in between
    score = (z_pos / EXPENDITURE_ZSCORE_THRESHOLD) * 60
    return score.clip(0, 100)


def _isolation_forest_score(df: pd.DataFrame) -> pd.Series:
    """Run IsolationForest on expenditure features; map anomaly score to 0-100."""
    features = df[["expenditure_amount", "expenditure_zscore", "utilization_pct"]].fillna(0)

    if len(features) < 10:
        return pd.Series(0.0, index=df.index)

    clf = IsolationForest(
        contamination=EXPENDITURE_IF_CONTAMINATION,
        random_state=42,
        n_estimators=100,
    )
    # decision_function: lower = more anomalous; range roughly -0.5 to 0.5
    raw = clf.fit(features).decision_function(features)
    # Flip so more anomalous → higher value, then min-max scale to 0-100
    flipped = -raw
    scaler = MinMaxScaler(feature_range=(0, 100))
    scaled = scaler.fit_transform(flipped.reshape(-1, 1)).flatten()
    return pd.Series(scaled, index=df.index)


def detect(features_df: pd.DataFrame) -> pd.Series:
    """
    Parameters
    ----------
    features_df : DataFrame produced by app.ml.features.build_feature_table()

    Returns
    -------
    Series indexed by positional index of features_df, values 0-100.
    Use features_df["project_id"] to align back to project IDs.
    """
    df = features_df.reset_index(drop=True)

    zscore_s = _zscore_score(df)
    if_s = _isolation_forest_score(df)

    # Take element-wise max of both signals
    combined = pd.concat([zscore_s, if_s], axis=1).max(axis=1)
    return combined.clip(0, 100).rename("expenditure_anomaly_score")
