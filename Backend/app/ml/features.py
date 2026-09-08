"""
app/ml/features.py
==================
Feature engineering hub. Builds a wide feature DataFrame used by all detectors.
Every detector imports `build_feature_table()` instead of doing its own joins,
keeping feature definitions consistent and avoiding redundant SQL queries.

Columns produced (one row per project):
    project_id, state, district, work_category, status, mp_id, vendor_id,
    sanctioned_amount, estimated_cost, released_amount, expenditure_amount,
    start_date, expected_completion_date, actual_completion_date,
    utilization_certificate_filed, recommended_date, sanction_date,
    -- derived financial features --
    utilization_pct, overrun_pct, cost_overrun_flag,
    estimated_cost_pct,        (estimated_cost / sanctioned_amount)
    peer_expenditure_mean,     (same work_category + state)
    peer_expenditure_std,
    expenditure_zscore,        (how many σ from peer mean)
    peer_estimated_cost_mean,
    estimated_deviation_pct,
    -- timeline features --
    today_str, days_past_expected, delay_flag,
    project_age_days, pct_timeline_elapsed, pct_expenditure_done,
    expected_duration_days,
    -- payment features (aggregated) --
    payment_count, total_paid, avg_payment_amount,
    avg_days_between_payments, payment_std,
    milestone_progress_per_payment_ratio,
    fiscal_yearend_payment_ratio,
    -- vendor features --
    vendor_flagged_before, vendor_total_projects,
    -- sanction-to-recommendation gap --
    sanction_rec_gap_days,
"""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text

TODAY = date(2026, 9, 4)   # frozen reference date matching seed data


def _safe_days(d1_str: Optional[str], d2_str: Optional[str]) -> Optional[int]:
    """Return (d2 - d1).days or None if either date is missing/invalid."""
    try:
        d1 = date.fromisoformat(d1_str)
        d2 = date.fromisoformat(d2_str)
        return (d2 - d1).days
    except Exception:
        return None


def build_feature_table(db: Session) -> pd.DataFrame:
    """
    Run SQL joins to pull projects + payments + vendor info,
    then compute derived features. Returns a DataFrame indexed by project_id.
    """
    # ── 1. Core project + vendor join ──────────────────────────────────────
    projects_sql = text("""
        SELECT
            p.project_id, p.mp_id, p.constituency_id,
            p.state, p.district, p.work_category, p.work_description,
            p.status, p.vendor_id,
            p.sanctioned_amount, p.estimated_cost,
            p.released_amount, p.expenditure_amount,
            p.recommended_date, p.sanction_date, p.start_date,
            p.expected_completion_date, p.actual_completion_date,
            p.utilization_certificate_filed, p.latitude, p.longitude,
            p.implementing_agency, p.executing_agency,
            v.flagged_before   AS vendor_flagged_before,
            v.total_projects_handled AS vendor_total_projects,
            m.house AS mp_house
        FROM projects p
        LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
        LEFT JOIN mps     m ON p.mp_id = m.mp_id
    """)
    proj = pd.read_sql(projects_sql, db.bind)

    # ── 2. Payment aggregates per project ─────────────────────────────────
    pay_sql = text("""
        SELECT
            project_id,
            COUNT(*)                             AS payment_count,
            SUM(amount)                          AS total_paid,
            AVG(amount)                          AS avg_payment_amount,
            STDEV_SAFE(amount)                   AS payment_std,
            AVG(milestone_reached_pct)           AS avg_milestone_pct,
            MAX(milestone_reached_pct)           AS max_milestone_pct
        FROM payments
        GROUP BY project_id
    """)
    # SQLite lacks STDEV — do it in pandas instead
    pay_raw_sql = text("SELECT project_id, amount, payment_date, milestone_reached_pct FROM payments")
    pay_raw = pd.read_sql(pay_raw_sql, db.bind)

    if pay_raw.empty:
        pay_agg = pd.DataFrame(columns=[
            "project_id", "payment_count", "total_paid",
            "avg_payment_amount", "payment_std", "avg_milestone_pct",
            "max_milestone_pct", "avg_days_between_payments",
            "fiscal_yearend_payment_ratio",
        ])
    else:
        pay_raw["payment_date"] = pd.to_datetime(pay_raw["payment_date"], errors="coerce")
        pay_raw["is_march"] = pay_raw["payment_date"].dt.month == 3

        def agg_payments(grp):
            grp = grp.sort_values("payment_date")
            dates = grp["payment_date"].dropna()
            gaps = dates.diff().dt.days.dropna()
            return pd.Series({
                "payment_count": len(grp),
                "total_paid": grp["amount"].sum(),
                "avg_payment_amount": grp["amount"].mean(),
                "payment_std": grp["amount"].std(ddof=1) if len(grp) > 1 else 0.0,
                "avg_milestone_pct": grp["milestone_reached_pct"].mean(),
                "max_milestone_pct": grp["milestone_reached_pct"].max(),
                "avg_days_between_payments": gaps.mean() if len(gaps) > 0 else None,
                "fiscal_yearend_payment_ratio": grp["is_march"].mean(),
            })

        pay_agg = pay_raw.groupby("project_id").apply(agg_payments, include_groups=False).reset_index()

    proj = proj.merge(pay_agg, on="project_id", how="left")

    # ── 3. Financial derived features ─────────────────────────────────────
    proj["utilization_pct"] = np.where(
        proj["sanctioned_amount"] > 0,
        (proj["expenditure_amount"] / proj["sanctioned_amount"]) * 100,
        0,
    )
    proj["overrun_pct"] = np.where(
        proj["sanctioned_amount"] > 0,
        ((proj["expenditure_amount"] - proj["sanctioned_amount"]) / proj["sanctioned_amount"]) * 100,
        0,
    )
    proj["cost_overrun_flag"] = proj["overrun_pct"] > 10

    proj["estimated_cost_pct"] = np.where(
        proj["sanctioned_amount"] > 0,
        (proj["estimated_cost"].fillna(proj["sanctioned_amount"]) / proj["sanctioned_amount"]) * 100,
        100,
    )

    # Peer benchmarks: mean/std of expenditure within (work_category, state)
    peer = proj.groupby(["work_category", "state"])["expenditure_amount"].agg(
        peer_expenditure_mean="mean", peer_expenditure_std="std"
    ).reset_index()
    proj = proj.merge(peer, on=["work_category", "state"], how="left")
    proj["peer_expenditure_std"] = proj["peer_expenditure_std"].fillna(1)
    proj["expenditure_zscore"] = np.where(
        proj["peer_expenditure_std"] > 0,
        (proj["expenditure_amount"] - proj["peer_expenditure_mean"]) / proj["peer_expenditure_std"],
        0,
    )

    # Peer benchmark for estimated_cost
    cost_peer = proj.groupby(["work_category", "state"])["estimated_cost"].agg(
        peer_estimated_cost_mean="mean"
    ).reset_index()
    proj = proj.merge(cost_peer, on=["work_category", "state"], how="left")
    proj["estimated_deviation_pct"] = np.where(
        proj["peer_estimated_cost_mean"] > 0,
        ((proj["estimated_cost"].fillna(proj["sanctioned_amount"]) - proj["peer_estimated_cost_mean"])
         / proj["peer_estimated_cost_mean"]) * 100,
        0,
    )

    # ── 4. Timeline derived features ──────────────────────────────────────
    today_str = TODAY.isoformat()
    proj["today_str"] = today_str

    def _days_past(row):
        if not row["expected_completion_date"]:
            return None
        d = _safe_days(row["expected_completion_date"], today_str)
        return max(0, d) if d is not None else None

    proj["days_past_expected"] = proj.apply(_days_past, axis=1)
    proj["delay_flag"] = (
        (proj["days_past_expected"].fillna(0) > 0) &
        (proj["status"].isin(["DELAYED", "IN_PROGRESS", "ON_HOLD"]))
    )

    proj["expected_duration_days"] = proj.apply(
        lambda r: _safe_days(r["start_date"], r["expected_completion_date"]), axis=1
    )
    proj["project_age_days"] = proj.apply(
        lambda r: _safe_days(r["start_date"], today_str), axis=1
    )

    proj["pct_timeline_elapsed"] = np.where(
        proj["expected_duration_days"].notna() & (proj["expected_duration_days"] > 0),
        np.minimum(
            1.0,
            proj["project_age_days"].fillna(0) / proj["expected_duration_days"].replace(0, np.nan)
        ),
        0,
    )
    proj["pct_expenditure_done"] = np.where(
        proj["sanctioned_amount"] > 0,
        proj["expenditure_amount"] / proj["sanctioned_amount"],
        0,
    )

    # milestone progress per payment ratio (payment anomaly signal)
    proj["milestone_progress_per_payment_ratio"] = np.where(
        proj["payment_count"].fillna(0) > 0,
        proj["max_milestone_pct"].fillna(0) / proj["payment_count"].fillna(1),
        0,
    )

    # ── 5. Sanction-to-recommendation gap ────────────────────────────────
    proj["sanction_rec_gap_days"] = proj.apply(
        lambda r: _safe_days(r["recommended_date"], r["sanction_date"]), axis=1
    )

    # ── 6. Fill NaN for numeric columns used downstream ──────────────────
    numeric_fill = [
        "payment_count", "total_paid", "avg_payment_amount", "payment_std",
        "avg_days_between_payments", "fiscal_yearend_payment_ratio",
        "avg_milestone_pct", "max_milestone_pct", "vendor_total_projects",
    ]
    for col in numeric_fill:
        if col in proj.columns:
            proj[col] = proj[col].fillna(0)

    proj["vendor_flagged_before"] = proj["vendor_flagged_before"].fillna(False).astype(bool)

    return proj
