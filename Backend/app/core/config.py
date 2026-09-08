"""
app/core/config.py
==================
All tunable constants for the MPLADS backend.
Risk weights, detector thresholds, and DB settings live here —
changing a value in this file does NOT require touching detector code.
"""

from __future__ import annotations

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent          # Backend/
SEED_DATA_DIR = BASE_DIR / "Data pipeline" / "seed_data"
DB_PATH = BASE_DIR / "mplads.db"
DB_URL = f"sqlite:///{DB_PATH}"

# ---------------------------------------------------------------------------
# Risk score weights  (must sum to 1.0)
# ---------------------------------------------------------------------------
RISK_WEIGHTS = {
    "expenditure_anomaly_score": 0.15,
    "cost_overrun_score":        0.15,
    "delay_score":               0.20,
    "payment_behavior_score":    0.15,
    "duplicate_score":           0.10,
    "geo_anomaly_score":         0.05,
    "compliance_score":          0.15,
    "spending_pattern_score":    0.05,
}

# ---------------------------------------------------------------------------
# Risk level thresholds
# ---------------------------------------------------------------------------
RISK_THRESHOLDS = {
    "CRITICAL": 75,
    "HIGH":     55,
    "MEDIUM":   30,
    "LOW":      0,
}

# ---------------------------------------------------------------------------
# Detector parameters
# ---------------------------------------------------------------------------

# Expenditure anomaly — IsolationForest
EXPENDITURE_IF_CONTAMINATION = 0.08   # expected fraction of anomalies
EXPENDITURE_ZSCORE_THRESHOLD  = 2.5   # fallback z-score flag threshold

# Cost overrun
COST_OVERRUN_THRESHOLD = 0.10          # 10 %+ over sanctioned = flag
ESTIMATE_DEVIATION_THRESHOLD = 0.20    # 20 %+ above peer benchmark = flag

# Delay detector
DELAY_GRACE_DAYS = 30                  # days after expected completion before flagging

# Payment behavior — IsolationForest
PAYMENT_IF_CONTAMINATION = 0.08
MIN_PAYMENTS_FOR_IF = 3                # need at least this many payments to run IF

# Duplicate detection
DUPLICATE_TEXT_THRESHOLD  = 0.75       # cosine similarity (TF-IDF)
DUPLICATE_GEO_THRESHOLD_M = 500        # haversine distance in metres
DUPLICATE_COMBINED_THRESHOLD = 0.70   # when both signals used

# Geographic anomaly — DBSCAN
GEO_DBSCAN_EPS_KM   = 0.12            # 120 m in km
GEO_DBSCAN_MIN_SAMPLES = 4            # min projects to form a cluster

# Compliance rules
ANNUAL_MP_FUND_LIMIT_INR = 50_000_000   # ₹5 crore per MP per FY
UC_FILING_DEADLINE_DAYS  = 365          # days after completion to file UC
SANCTION_TO_RECOMMENDATION_MAX_DAYS = 180

# Spending pattern
SPENDING_ZSCORE_THRESHOLD = 2.0         # monthly expenditure spike threshold

# ---------------------------------------------------------------------------
# Pagination defaults
# ---------------------------------------------------------------------------
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE     = 100

# ---------------------------------------------------------------------------
# Alert engine
# ---------------------------------------------------------------------------
ALERT_MIN_RISK_SCORE = 30.0   # only create alerts if risk_score >= this
