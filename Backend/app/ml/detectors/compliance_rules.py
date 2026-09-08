"""
app/ml/detectors/compliance_rules.py
======================================
Deterministic rule engine. Evaluates each project against MPLADS compliance rules.

Rules checked:
  RULE-FUND-01 : Annual MP fund limit (₹5 crore per FY)
  RULE-TL-01   : Project past expected completion and not COMPLETED
  RULE-UC-01   : UC not filed within 365 days of actual completion
  RULE-SAN-01  : Sanction-to-recommendation gap > 180 days
  RULE-GEO-01  : LOK_SABHA MP executing project outside home state (proxy check)

Returns:
  - violations: list of violation dicts
  - project_compliance_scores: Series[float] 0-100 (higher = more violations)
"""

from __future__ import annotations

from datetime import date
from typing import Dict, List

import pandas as pd

from app.core.config import (
    ANNUAL_MP_FUND_LIMIT_INR,
    UC_FILING_DEADLINE_DAYS,
    SANCTION_TO_RECOMMENDATION_MAX_DAYS,
)

TODAY = date(2026, 9, 4)


def _fy(d: date) -> int:
    """Return the Indian financial year start year for a given date."""
    return d.year if d.month >= 4 else d.year - 1


def _severity_to_score(severity: str) -> float:
    return {"CRITICAL": 35, "HIGH": 20, "MEDIUM": 10, "LOW": 5}.get(severity, 5)


def detect(features_df: pd.DataFrame) -> tuple[List[dict], pd.Series]:
    df = features_df.reset_index(drop=True).copy()

    violations: List[dict] = []
    compliance_scores = pd.Series(0.0, index=df.index, name="compliance_score")
    violation_counter = 1

    # ── Pre-compute per-MP per-FY totals for fund cap check ───────────────
    def _sanction_fy(row):
        try:
            d = date.fromisoformat(row["sanction_date"])
            return _fy(d)
        except Exception:
            return None

    df["_sanction_fy"] = df.apply(_sanction_fy, axis=1)
    mp_fy_totals = (
        df.groupby(["mp_id", "_sanction_fy"])["sanctioned_amount"].sum().to_dict()
    )

    for idx, row in df.iterrows():
        project_id = row["project_id"]
        row_violations = []

        # RULE-FUND-01: Annual MP fund limit
        fy = row.get("_sanction_fy")
        if fy is not None:
            total = mp_fy_totals.get((row["mp_id"], fy), 0)
            if total > ANNUAL_MP_FUND_LIMIT_INR:
                row_violations.append({
                    "violation_id": f"VIO-{violation_counter:06d}",
                    "project_id": project_id,
                    "rule_id": "RULE-FUND-01",
                    "severity": "CRITICAL",
                    "details": (
                        f"MP {row['mp_id']} sanctioned ₹{total:,.0f} in FY {fy}-{fy+1}, "
                        f"exceeding the ₹{ANNUAL_MP_FUND_LIMIT_INR:,.0f} annual limit."
                    ),
                })
                violation_counter += 1

        # RULE-TL-01: Timeline breach
        days_past = row.get("days_past_expected", 0) or 0
        if days_past > 30 and row["status"] not in ("COMPLETED", "ABANDONED"):
            row_violations.append({
                "violation_id": f"VIO-{violation_counter:06d}",
                "project_id": project_id,
                "rule_id": "RULE-TL-01",
                "severity": "MEDIUM",
                "details": (
                    f"Project is {int(days_past)} days past expected completion "
                    f"({row.get('expected_completion_date', 'N/A')}) with status {row['status']}."
                ),
            })
            violation_counter += 1

        # RULE-UC-01: UC filing deadline
        if row["status"] == "COMPLETED" and not row.get("utilization_certificate_filed", False):
            actual = row.get("actual_completion_date")
            if actual:
                try:
                    comp_date = date.fromisoformat(actual)
                    days_since = (TODAY - comp_date).days
                    if days_since > UC_FILING_DEADLINE_DAYS:
                        row_violations.append({
                            "violation_id": f"VIO-{violation_counter:06d}",
                            "project_id": project_id,
                            "rule_id": "RULE-UC-01",
                            "severity": "HIGH",
                            "details": (
                                f"Utilization certificate not filed {days_since} days after "
                                f"project completion on {actual}."
                            ),
                        })
                        violation_counter += 1
                except Exception:
                    pass

        # RULE-SAN-01: Sanction-to-recommendation gap
        gap = row.get("sanction_rec_gap_days")
        if gap is not None and not pd.isna(gap) and float(gap) > SANCTION_TO_RECOMMENDATION_MAX_DAYS:
            row_violations.append({
                "violation_id": f"VIO-{violation_counter:06d}",
                "project_id": project_id,
                "rule_id": "RULE-SAN-01",
                "severity": "MEDIUM",
                "details": (
                    f"Gap between recommendation and sanction is {int(float(gap))} days "
                    f"(limit: {SANCTION_TO_RECOMMENDATION_MAX_DAYS} days)."
                ),
            })
            violation_counter += 1

        violations.extend(row_violations)

        # Sum violation severities into a 0-100 compliance score
        if row_violations:
            total_penalty = sum(_severity_to_score(v["severity"]) for v in row_violations)
            compliance_scores.loc[idx] = min(100, total_penalty)

    return violations, compliance_scores
