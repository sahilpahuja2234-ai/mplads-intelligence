"""
app/ml/detectors/delay_detector.py
====================================
Rule-based delay detector.

Severity scales with how many days a project is past its expected completion:
  0-30 days past    →  score 0  (grace period)
  31-90 days past   →  score 20-40
  91-180 days past  →  score 40-70
  180-365 days past →  score 70-90
  365+ days past    →  score 90-100

Only projects NOT in status COMPLETED are flagged.

Output: Series[float] indexed by positional index of features_df, values 0-100.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.core.config import DELAY_GRACE_DAYS


def _score_days_past(days_past: float) -> float:
    """Linear interpolation between severity breakpoints."""
    d = max(0, days_past - DELAY_GRACE_DAYS)
    if d == 0:
        return 0.0
    elif d <= 60:
        return 20 + (d / 60) * 20      # 20-40
    elif d <= 150:
        return 40 + ((d - 60) / 90) * 30   # 40-70
    elif d <= 335:
        return 70 + ((d - 150) / 185) * 20  # 70-90
    else:
        return min(100, 90 + ((d - 335) / 100) * 10)  # 90-100


def detect(features_df: pd.DataFrame) -> pd.Series:
    df = features_df.reset_index(drop=True)

    completed_statuses = {"COMPLETED"}
    scores = []
    for _, row in df.iterrows():
        if row["status"] in completed_statuses:
            scores.append(0.0)
            continue
        past = row.get("days_past_expected")
        if past is None or pd.isna(past):
            scores.append(0.0)
        else:
            scores.append(_score_days_past(float(past)))

    return pd.Series(scores, index=df.index, name="delay_score")


def get_explanation(row: pd.Series) -> str:
    past = row.get("days_past_expected", 0) or 0
    if past <= DELAY_GRACE_DAYS:
        return "Project is on schedule or within grace period."
    uc = row.get("utilization_certificate_filed", False)
    uc_msg = " No utilization certificate filed." if not uc else ""
    return (
        f"Project is {int(past)} days past its expected completion date "
        f"with status '{row.get('status', 'UNKNOWN')}'.{uc_msg}"
    )
