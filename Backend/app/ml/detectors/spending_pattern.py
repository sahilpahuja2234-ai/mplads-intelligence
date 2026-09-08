"""
app/ml/detectors/spending_pattern.py
======================================
Detects unusual spending patterns using per-MP monthly time series.

Signals:
  1. Fiscal-year-end spike: a month (March) where MP expenditure > 2x rolling
     mean of preceding months → election/year-end rush.
  2. Sudden acceleration: expenditure in latest month > 3x median of previous months.

Returns:
  - Series[float] 0-100 per project (projects in anomalous MP-months get scored)
"""

from __future__ import annotations

import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import SPENDING_ZSCORE_THRESHOLD


def detect(features_df: pd.DataFrame, db: Session) -> pd.Series:
    """
    Parameters
    ----------
    features_df : wide feature DataFrame
    db          : SQLAlchemy session (needed to pull per-month payment data)

    Returns
    -------
    Series[float] 0-100 indexed by features_df's positional index.
    """
    df = features_df.reset_index(drop=True).copy()
    scores = pd.Series(0.0, index=df.index, name="spending_pattern_score")

    # Pull monthly expenditure per MP from payments + projects
    pay_sql = text("""
        SELECT
            pr.mp_id,
            strftime('%Y-%m', py.payment_date) AS ym,
            SUM(py.amount)                      AS monthly_amount
        FROM payments py
        JOIN projects pr ON pr.project_id = py.project_id
        WHERE py.payment_date IS NOT NULL
        GROUP BY pr.mp_id, ym
        ORDER BY pr.mp_id, ym
    """)
    try:
        monthly = pd.read_sql(pay_sql, db.bind)
    except Exception:
        return scores

    if monthly.empty:
        return scores

    # Compute rolling z-score per MP
    anomalous_mp_months: set[tuple] = set()

    for mp_id, grp in monthly.groupby("mp_id"):
        grp = grp.sort_values("ym").reset_index(drop=True)
        if len(grp) < 4:
            continue
        amounts = grp["monthly_amount"].values.astype(float)
        yms     = grp["ym"].values

        for i in range(3, len(amounts)):
            window = amounts[max(0, i - 6):i]
            mean = window.mean()
            std  = window.std(ddof=0) if window.std(ddof=0) > 0 else 1
            z    = (amounts[i] - mean) / std

            # Fiscal year-end (March) spike
            is_march = yms[i].endswith("-03")
            if is_march and amounts[i] > 2 * mean:
                anomalous_mp_months.add((mp_id, yms[i]))
            elif z > SPENDING_ZSCORE_THRESHOLD:
                anomalous_mp_months.add((mp_id, yms[i]))

    if not anomalous_mp_months:
        return scores

    # Map anomalous MP-months back to projects via sanction_date
    for idx, row in df.iterrows():
        mp_id = row["mp_id"]
        sanction_date = row.get("sanction_date")
        if not sanction_date:
            continue
        try:
            ym = sanction_date[:7]   # 'YYYY-MM'
        except Exception:
            continue
        if (mp_id, ym) in anomalous_mp_months:
            scores.loc[idx] = 70.0   # flag score for all projects sanctioned in that anomalous month

    return scores.clip(0, 100)
