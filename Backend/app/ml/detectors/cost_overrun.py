"""
app/ml/detectors/cost_overrun.py
=================================
Two separate signals:

  1. cost_overrun_pct  = (expenditure_amount - sanctioned_amount) / sanctioned_amount
     → direct measure of actual over-spend.

  2. estimate_deviation_pct = (estimated_cost - peer_estimated_cost_mean) / peer_estimated_cost_mean
     → flags projects whose estimated cost is suspiciously above peer median
       (a warning sign *before* expenditure exceeds sanction).

The detector maps each signal to 0-100 and returns their weighted average.

Output: Series[float] indexed by positional index of features_df, values 0-100.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.core.config import (
    COST_OVERRUN_THRESHOLD,
    ESTIMATE_DEVIATION_THRESHOLD,
)


def _overrun_score(df: pd.DataFrame) -> pd.Series:
    """Map overrun_pct to a 0-100 score."""
    pct = df["overrun_pct"].fillna(0)
    # 10 % threshold → score 30;  50 % overrun → score 100
    score = np.where(
        pct > (COST_OVERRUN_THRESHOLD * 100),
        np.clip((pct / 50) * 100, 30, 100),
        np.clip(pct * 2, 0, 25),   # below threshold still gives a small score
    )
    return pd.Series(score, index=df.index)


def _estimate_deviation_score(df: pd.DataFrame) -> pd.Series:
    """Map estimated_deviation_pct to a 0-100 score."""
    pct = df["estimated_deviation_pct"].fillna(0)
    threshold = ESTIMATE_DEVIATION_THRESHOLD * 100   # default 20 %
    score = np.where(
        pct > threshold,
        np.clip(((pct - threshold) / 30) * 100, 30, 100),
        np.clip(pct * 0.5, 0, 25),
    )
    return pd.Series(score, index=df.index)


def detect(features_df: pd.DataFrame) -> pd.Series:
    """
    Returns combined cost_overrun_score (0-100) per project.
    """
    df = features_df.reset_index(drop=True)
    overrun   = _overrun_score(df)
    est_dev   = _estimate_deviation_score(df)
    # Weight actual overrun more heavily than estimate deviation
    combined = (overrun * 0.65 + est_dev * 0.35).clip(0, 100)
    return combined.rename("cost_overrun_score")


def get_explanation(row: pd.Series) -> str:
    overrun_pct = row.get("overrun_pct", 0)
    est_dev_pct = row.get("estimated_deviation_pct", 0)
    parts = []
    if overrun_pct > 10:
        parts.append(
            f"Expenditure is {overrun_pct:.1f}% above sanctioned amount "
            f"(₹{row.get('expenditure_amount', 0):,.0f} vs ₹{row.get('sanctioned_amount', 0):,.0f})."
        )
    if est_dev_pct > 20:
        parts.append(
            f"Estimated cost is {est_dev_pct:.1f}% above the comparable "
            f"{row.get('work_category', '')} / {row.get('state', '')} district median."
        )
    return " ".join(parts) if parts else "Cost within acceptable bounds."
