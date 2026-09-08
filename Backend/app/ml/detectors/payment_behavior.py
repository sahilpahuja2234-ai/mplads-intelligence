"""
app/ml/detectors/payment_behavior.py
=======================================
Detects abnormal payment patterns using engineered features + IsolationForest.

Feature vector per project (payments aggregated):
  - payment_count
  - avg_payment_amount
  - payment_std / avg_payment_amount  (coefficient of variation)
  - avg_days_between_payments
  - fiscal_yearend_payment_ratio      (fraction of payments in March)
  - milestone_progress_per_payment_ratio

IsolationForest is trained on the full population; anomaly scores are
min-max scaled to 0-100. Projects with < MIN_PAYMENTS_FOR_IF payments
get a heuristic score based on available signals.

Output: Series[float] indexed by positional index of features_df, values 0-100.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler

from app.core.config import PAYMENT_IF_CONTAMINATION, MIN_PAYMENTS_FOR_IF


PAYMENT_FEATURES = [
    "payment_count",
    "avg_payment_amount",
    "payment_cv",           # computed below
    "avg_days_between_payments",
    "fiscal_yearend_payment_ratio",
    "milestone_progress_per_payment_ratio",
]


def detect(features_df: pd.DataFrame) -> pd.Series:
    df = features_df.reset_index(drop=True).copy()

    # Coefficient of variation
    df["payment_cv"] = np.where(
        df["avg_payment_amount"].fillna(0) > 0,
        df["payment_std"].fillna(0) / df["avg_payment_amount"].fillna(1),
        0,
    )

    # Fallback for projects with no/few payments
    has_enough = df["payment_count"].fillna(0) >= MIN_PAYMENTS_FOR_IF
    enough_idx = df[has_enough].index
    few_idx    = df[~has_enough].index

    scores = pd.Series(0.0, index=df.index, name="payment_behavior_score")

    # Heuristic for projects with few payments
    # Flag if any fiscal year-end ratio or if CV is very high
    for idx in few_idx:
        row = df.loc[idx]
        s = 0.0
        if row.get("fiscal_yearend_payment_ratio", 0) > 0.5:
            s += 20
        if row.get("payment_cv", 0) > 1.0:
            s += 15
        if row.get("milestone_progress_per_payment_ratio", 0) > 50:
            s += 10   # large milestone claimed per payment
        scores.loc[idx] = min(s, 50)   # cap heuristic at 50

    if len(enough_idx) >= 10:
        sub = df.loc[enough_idx, PAYMENT_FEATURES].fillna(0)
        clf = IsolationForest(
            contamination=PAYMENT_IF_CONTAMINATION,
            random_state=42,
            n_estimators=100,
        )
        raw = clf.fit(sub).decision_function(sub)
        flipped = -raw
        scaler = MinMaxScaler(feature_range=(0, 100))
        scaled = scaler.fit_transform(flipped.reshape(-1, 1)).flatten()
        scores.loc[enough_idx] = scaled

    return scores.clip(0, 100)


def get_explanation(row: pd.Series) -> str:
    pc = int(row.get("payment_count", 0) or 0)
    gap = row.get("avg_days_between_payments")
    fy_ratio = row.get("fiscal_yearend_payment_ratio", 0) or 0
    cv = row.get("payment_cv", 0) or 0
    parts = []
    if pc == 0:
        return "No payment records found."
    if gap is not None and not pd.isna(gap) and float(gap) < 10 and pc > 2:
        parts.append(f"Payments are unusually rapid (avg {float(gap):.0f} days apart across {pc} installments).")
    if fy_ratio > 0.5:
        parts.append(f"{fy_ratio*100:.0f}% of payments fall in March (fiscal year-end spike).")
    if cv > 1.5:
        parts.append(f"High payment amount variability (CV={cv:.2f}) suggests irregular disbursement.")
    return " ".join(parts) if parts else f"{pc} payment(s) with normal disbursement pattern."
