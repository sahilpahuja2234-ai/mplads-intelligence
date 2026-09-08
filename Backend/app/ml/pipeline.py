"""
app/ml/pipeline.py
==================
ML pipeline orchestrator. Called by `POST /api/v1/pipeline/run`.

Steps:
  1. Build feature table from DB joins.
  2. Run all 8 detectors in order.
  3. Combine scores via risk_scorer → risk_score rows + alert rows.
  4. Write duplicate clusters.
  5. Write compliance violations.
  6. Bulk-insert everything into DB.
  7. Update pipeline_run record.

Returns the pipeline_run_id on success.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.ml.features import build_feature_table
from app.ml.detectors import (
    expenditure_anomaly,
    cost_overrun,
    delay_detector,
    payment_behavior,
    duplicate_detector,
    geo_anomaly,
    compliance_rules,
    spending_pattern,
    risk_scorer,
)
from app.models.risk_score import RiskScore
from app.models.alert import Alert
from app.models.compliance import ComplianceViolation
from app.models.duplicate import DuplicateCluster, DuplicateClusterMember
from app.models.pipeline_run import PipelineRun


def run_pipeline(db: Session) -> str:
    """
    Execute the full ML pipeline synchronously.
    Returns the pipeline_run_id string.
    """
    run_id = f"RUN-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    now_str = datetime.utcnow().isoformat() + "Z"

    # ── Record run start ──────────────────────────────────────────────────
    run_record = PipelineRun(
        pipeline_run_id=run_id,
        started_at=now_str,
        status="RUNNING",
    )
    db.add(run_record)
    db.commit()

    try:
        print(f"[pipeline] Starting run {run_id}")

        # ── Step 1: Feature engineering ───────────────────────────────────
        print("[pipeline] Building feature table ...")
        features = build_feature_table(db)
        print(f"[pipeline] Feature table ready: {len(features)} projects")

        # ── Step 2: Run detectors ─────────────────────────────────────────
        print("[pipeline] Running detectors ...")

        exp_scores  = expenditure_anomaly.detect(features)
        co_scores   = cost_overrun.detect(features)
        delay_scores = delay_detector.detect(features)
        pay_scores  = payment_behavior.detect(features)

        print("[pipeline]   -> Duplicate detection ...")
        dup_clusters, dup_scores = duplicate_detector.detect(features)

        print("[pipeline]   -> Geographic anomaly ...")
        geo_clusters_data, geo_scores = geo_anomaly.detect(features)

        print("[pipeline]   -> Compliance rules ...")
        violations_data, comp_scores = compliance_rules.detect(features)

        print("[pipeline]   -> Spending pattern ...")
        spend_scores = spending_pattern.detect(features, db)

        sub_scores = {
            "expenditure_anomaly_score": exp_scores,
            "cost_overrun_score":        co_scores,
            "delay_score":               delay_scores,
            "payment_behavior_score":    pay_scores,
            "duplicate_score":           dup_scores,
            "geo_anomaly_score":         geo_scores,
            "compliance_score":          comp_scores,
            "spending_pattern_score":    spend_scores,
        }

        # ── Step 3: Risk scoring + alert generation ───────────────────────
        print("[pipeline] Scoring and generating alerts ...")
        risk_rows, alert_rows = risk_scorer.score_and_alert(features, sub_scores, run_id)

        # ── Step 4: Clear previous latest risk_scores ─────────────────────
        db.execute(text("UPDATE risk_scores SET is_latest = 0 WHERE is_latest = 1"))

        # ── Step 5: Bulk insert risk_scores ──────────────────────────────
        print(f"[pipeline] Inserting {len(risk_rows)} risk scores ...")
        db.bulk_insert_mappings(RiskScore, risk_rows)

        # ── Step 6: Clear & bulk insert alerts ───────────────────────────
        print(f"[pipeline] Clearing old alerts and inserting {len(alert_rows)} new ...")
        db.execute(text("DELETE FROM alerts"))
        db.bulk_insert_mappings(Alert, alert_rows)

        # ── Step 7: Clear & insert compliance violations ──────────────────
        db.execute(text("DELETE FROM compliance_violations"))
        now_iso = datetime.utcnow().isoformat() + "Z"
        vio_rows = []
        for v in violations_data:
            vio_rows.append(ComplianceViolation(
                violation_id=v["violation_id"],
                project_id=v["project_id"],
                rule_id=v["rule_id"],
                detected_at=now_iso,
                status="OPEN",
                details=v["details"],
            ))
        db.bulk_save_objects(vio_rows)

        # ── Step 8: Clear & insert duplicate clusters ─────────────────────
        db.execute(text("DELETE FROM duplicate_cluster_members"))
        db.execute(text("DELETE FROM duplicate_clusters"))
        for cluster in dup_clusters:
            db.add(DuplicateCluster(
                cluster_id=cluster.cluster_id,
                similarity_score=cluster.similarity_score,
                cluster_reason=cluster.cluster_reason,
                created_at=now_iso,
            ))
            for pid in cluster.project_ids:
                db.add(DuplicateClusterMember(
                    cluster_id=cluster.cluster_id,
                    project_id=pid,
                ))

        db.commit()

        # ── Update run record ─────────────────────────────────────────────
        finished_str = datetime.utcnow().isoformat() + "Z"
        db.query(PipelineRun).filter(PipelineRun.pipeline_run_id == run_id).update({
            "finished_at": finished_str,
            "status": "SUCCESS",
            "projects_processed": len(risk_rows),
            "alerts_generated": len(alert_rows),
            "notes": f"Duplicate clusters: {len(dup_clusters)}, Violations: {len(violations_data)}",
        })
        db.commit()

        print(f"[pipeline] [OK] Run {run_id} complete - "
              f"{len(risk_rows)} scores, {len(alert_rows)} alerts, "
              f"{len(dup_clusters)} dup clusters, {len(violations_data)} violations")

    except Exception as exc:
        db.rollback()
        db.query(PipelineRun).filter(PipelineRun.pipeline_run_id == run_id).update({
            "finished_at": datetime.utcnow().isoformat() + "Z",
            "status": "FAILED",
            "notes": str(exc),
        })
        db.commit()
        raise

    return run_id


if __name__ == "__main__":
    from app.db.session import SessionLocal
    with SessionLocal() as db_session:
        run_pipeline(db_session)

