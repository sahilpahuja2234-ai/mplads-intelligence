"""
app/ml/detectors/risk_scorer.py
================================
Combines all 8 sub-scores into a single 0-100 risk score using the
configurable weighted ensemble from app.core.config.RISK_WEIGHTS.

Also responsible for:
  - determining risk_level (LOW/MEDIUM/HIGH/CRITICAL)
  - building contributing_factors_json (top factors with explanations)
  - generating Alert records for any project above ALERT_MIN_RISK_SCORE

Returns a list of risk_score dicts and a list of alert dicts ready for
bulk insert into the DB.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.core.config import (
    RISK_WEIGHTS,
    RISK_THRESHOLDS,
    ALERT_MIN_RISK_SCORE,
)

# ── Explanation helpers ────────────────────────────────────────────────────

def _risk_level(score: float) -> str:
    for level, threshold in sorted(RISK_THRESHOLDS.items(), key=lambda x: -x[1]):
        if score >= threshold:
            return level
    return "LOW"


def _alert_type_for_factor(factor: str) -> str:
    mapping = {
        "expenditure_anomaly_score": "EXPENDITURE_ANOMALY",
        "cost_overrun_score":        "COST_OVERRUN",
        "delay_score":               "DELAY",
        "payment_behavior_score":    "PAYMENT_ANOMALY",
        "duplicate_score":           "DUPLICATE_PROJECT",
        "geo_anomaly_score":         "GEOGRAPHIC_ANOMALY",
        "compliance_score":          "COMPLIANCE_VIOLATION",
        "spending_pattern_score":    "SPENDING_PATTERN",
    }
    return mapping.get(factor, "EXPENDITURE_ANOMALY")


def _factor_label(factor: str) -> str:
    labels = {
        "expenditure_anomaly_score": "Expenditure Anomaly",
        "cost_overrun_score":        "Cost Overrun",
        "delay_score":               "Delay",
        "payment_behavior_score":    "Payment Anomaly",
        "duplicate_score":           "Duplicate Project",
        "geo_anomaly_score":         "Geographic Anomaly",
        "compliance_score":          "Compliance Violation",
        "spending_pattern_score":    "Spending Pattern",
    }
    return labels.get(factor, factor)


def _build_explanation(factor: str, score: float, row: pd.Series) -> str:
    """Generate a human-readable explanation for a contributing factor."""
    if factor == "expenditure_anomaly_score":
        z = row.get("expenditure_zscore", 0) or 0
        return (
            f"Expenditure of ₹{row.get('expenditure_amount', 0):,.0f} is "
            f"{abs(z):.1f}σ {'above' if z > 0 else 'below'} the peer mean "
            f"for {row.get('work_category', '')} projects in {row.get('state', '')}."
        )
    elif factor == "cost_overrun_score":
        overrun = row.get("overrun_pct", 0) or 0
        est_dev = row.get("estimated_deviation_pct", 0) or 0
        if overrun > 10:
            return f"Expenditure is {overrun:.1f}% above sanctioned amount."
        return f"Estimated cost is {est_dev:.1f}% above comparable project median."
    elif factor == "delay_score":
        past = int(row.get("days_past_expected", 0) or 0)
        return f"Project is {past} days past its expected completion date with status '{row.get('status', '')}'."
    elif factor == "payment_behavior_score":
        gap = row.get("avg_days_between_payments")
        if gap is not None and not pd.isna(gap) and float(gap) < 10:
            return f"Installments are unusually rapid (avg {float(gap):.0f} days apart)."
        fy = (row.get("fiscal_yearend_payment_ratio") or 0)
        if fy > 0.5:
            return f"{fy*100:.0f}% of payments fall in March (year-end rush)."
        return "Abnormal payment disbursement pattern detected."
    elif factor == "duplicate_score":
        return f"Project description and/or location matches one or more other projects in the same district."
    elif factor == "geo_anomaly_score":
        return "Project coordinates fall within a dense cluster of other projects — unusual for rural infrastructure."
    elif factor == "compliance_score":
        past = int(row.get("days_past_expected", 0) or 0)
        if past > 30:
            return f"Multiple compliance rule violations detected (timeline breach + UC filing)."
        return "One or more MPLADS compliance rules violated."
    elif factor == "spending_pattern_score":
        return "MP's monthly expenditure in this sanction period shows an abnormal spike (fiscal year-end pattern)."
    return f"{_factor_label(factor)} score is elevated."


# ── Main scorer ────────────────────────────────────────────────────────────

def score_and_alert(
    features_df: pd.DataFrame,
    sub_scores: Dict[str, pd.Series],
    pipeline_run_id: str,
) -> tuple[List[dict], List[dict]]:
    """
    Parameters
    ----------
    features_df    : wide feature DataFrame (for explanation context)
    sub_scores     : dict mapping score_col_name → Series (positional index)
    pipeline_run_id: unique run ID

    Returns
    -------
    (risk_score_rows, alert_rows)
    """
    df = features_df.reset_index(drop=True).copy()
    now_str = datetime.utcnow().isoformat() + "Z"

    # Merge all sub-scores into df
    for col, series in sub_scores.items():
        df[col] = series.values

    # Ensure all weight keys exist
    for col in RISK_WEIGHTS:
        if col not in df.columns:
            df[col] = 0.0

    # ── Compute weighted risk score ───────────────────────────────────────
    risk_scores_series = sum(
        df[col].fillna(0) * weight
        for col, weight in RISK_WEIGHTS.items()
    )
    df["risk_score"] = risk_scores_series.clip(0, 100).round(2)
    df["risk_level"] = df["risk_score"].apply(_risk_level)

    # ── Build contributing factors JSON ───────────────────────────────────
    risk_score_rows: List[dict] = []
    alert_rows: List[dict]      = []
    alert_counter = 1

    for idx, row in df.iterrows():
        # Weighted contributions
        contributions = {
            col: float(row.get(col, 0)) * weight
            for col, weight in RISK_WEIGHTS.items()
        }
        sorted_factors = sorted(contributions.items(), key=lambda x: -x[1])

        top_factors = []
        for factor, contribution in sorted_factors[:5]:   # top 5 for full breakdown
            sub_score = float(row.get(factor, 0))
            if sub_score < 1:
                continue
            top_factors.append({
                "factor": _alert_type_for_factor(factor),
                "score": round(sub_score, 1),
                "weight": RISK_WEIGHTS[factor],
                "weighted_contribution": round(contribution, 2),
                "explanation": _build_explanation(factor, sub_score, row),
            })

        risk_score_rows.append({
            "project_id":                row["project_id"],
            "pipeline_run_id":           pipeline_run_id,
            "risk_score":                float(row["risk_score"]),
            "risk_level":                row["risk_level"],
            "expenditure_anomaly_score": float(row.get("expenditure_anomaly_score", 0)),
            "cost_overrun_score":        float(row.get("cost_overrun_score", 0)),
            "delay_score":               float(row.get("delay_score", 0)),
            "payment_behavior_score":    float(row.get("payment_behavior_score", 0)),
            "duplicate_score":           float(row.get("duplicate_score", 0)),
            "geo_anomaly_score":         float(row.get("geo_anomaly_score", 0)),
            "compliance_score":          float(row.get("compliance_score", 0)),
            "spending_pattern_score":    float(row.get("spending_pattern_score", 0)),
            "contributing_factors_json": json.dumps(top_factors),
            "computed_at":               now_str,
            "is_latest":                 True,
        })

        # ── Generate alerts for high-risk projects ────────────────────────
        if float(row["risk_score"]) < ALERT_MIN_RISK_SCORE:
            continue

        for factor, contribution in sorted_factors[:3]:
            sub_score = float(row.get(factor, 0))
            if sub_score < 20:
                continue

            alert_type = _alert_type_for_factor(factor)
            severity = row["risk_level"]
            if sub_score < 40:
                severity = "LOW"
            elif sub_score < 60:
                severity = "MEDIUM"
            elif sub_score < 80:
                severity = "HIGH"
            else:
                severity = "CRITICAL"

            explanation = _build_explanation(factor, sub_score, row)
            title = f"{_factor_label(factor)} detected"

            # Build evidence dict
            evidence: dict = {
                "sub_score": round(sub_score, 1),
                "risk_score": float(row["risk_score"]),
            }
            if factor == "expenditure_anomaly_score":
                evidence.update({
                    "expenditure_amount": row.get("expenditure_amount"),
                    "peer_mean": row.get("peer_expenditure_mean"),
                    "zscore": round(float(row.get("expenditure_zscore", 0)), 2),
                })
            elif factor == "cost_overrun_score":
                evidence.update({
                    "sanctioned_amount": row.get("sanctioned_amount"),
                    "expenditure_amount": row.get("expenditure_amount"),
                    "overrun_pct": round(float(row.get("overrun_pct", 0)), 1),
                    "estimated_deviation_pct": round(float(row.get("estimated_deviation_pct", 0)), 1),
                })
            elif factor == "delay_score":
                evidence.update({
                    "days_past_expected": int(row.get("days_past_expected", 0) or 0),
                    "expected_completion_date": row.get("expected_completion_date"),
                    "status": row.get("status"),
                })
            elif factor == "payment_behavior_score":
                evidence.update({
                    "payment_count": int(row.get("payment_count", 0) or 0),
                    "avg_days_between_payments": row.get("avg_days_between_payments"),
                    "fiscal_yearend_ratio": round(float(row.get("fiscal_yearend_payment_ratio", 0)), 2),
                })

            # Financial exposure
            overrun_amount = max(0, float(row.get("expenditure_amount", 0)) - float(row.get("sanctioned_amount", 0)))
            financial_exposure = json.dumps({"amount": overrun_amount, "currency": "INR"})

            alert_rows.append({
                "alert_id":           f"ALT-{alert_counter:06d}",
                "project_id":         row["project_id"],
                "alert_type":         alert_type,
                "severity":           severity,
                "status":             "OPEN",
                "title":              title,
                "description":        explanation,
                "evidence_json":      json.dumps(evidence),
                "financial_exposure": financial_exposure,
                "detected_at":        now_str,
                "updated_at":         now_str,
                "resolution_remarks": None,
            })
            alert_counter += 1

    return risk_score_rows, alert_rows
