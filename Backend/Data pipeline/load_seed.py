"""
data_pipeline/load_seed.py
==========================
Loads the four seed CSVs (+ constituencies.csv + demo_scenarios.json) into
mplads.db (SQLite), creating all tables first via SQLAlchemy metadata.

Run once before starting the API server:
    cd Backend
    python data_pipeline/load_seed.py

Re-running drops and re-creates tables, so the DB is always a clean mirror
of the CSV content.  The ML pipeline tables (risk_scores, alerts, etc.) are
created empty and filled by `app/ml/pipeline.py`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

# Make sure `Backend/` is on the path when run from any directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import SEED_DATA_DIR, DB_PATH
from app.db.session import engine
from app.models import Base            # triggers all ORM model imports

# ── compliance rule seed data ──────────────────────────────────────────────
COMPLIANCE_RULES = [
    {
        "rule_id": "RULE-FUND-01",
        "category": "FUND_LIMIT",
        "title": "Annual entitlement cap",
        "description": "Total sanctioned amount per MP per financial year must not exceed ₹5 crore.",
        "severity_if_violated": "CRITICAL",
    },
    {
        "rule_id": "RULE-WORK-01",
        "category": "PERMISSIBLE_WORK",
        "title": "Non-permissible work category",
        "description": "Projects must fall within MPLADS-permitted work categories.",
        "severity_if_violated": "HIGH",
    },
    {
        "rule_id": "RULE-TL-01",
        "category": "TIMELINE",
        "title": "Project execution timeline breach",
        "description": "Projects must be completed within sanctioned timeline or have an approved extension.",
        "severity_if_violated": "MEDIUM",
    },
    {
        "rule_id": "RULE-UC-01",
        "category": "UTILIZATION_CERTIFICATE",
        "title": "Utilization certificate not filed within 1 year",
        "description": "UC must be filed within 12 months of project completion.",
        "severity_if_violated": "HIGH",
    },
    {
        "rule_id": "RULE-SAN-01",
        "category": "SANCTION_PROCESS",
        "title": "Excessive sanction-to-recommendation gap",
        "description": "Gap between recommendation date and sanction date must not exceed 180 days.",
        "severity_if_violated": "MEDIUM",
    },
    {
        "rule_id": "RULE-GEO-01",
        "category": "GEOGRAPHIC_JURISDICTION",
        "title": "Project outside MP constituency/state",
        "description": "LOK_SABHA MPs should execute projects within their constituency; RS MPs within their state.",
        "severity_if_violated": "HIGH",
    },
]


def _drop_and_create():
    """Drop all tables and re-create from ORM metadata."""
    print("[load_seed] Dropping existing tables (if any) ...")
    Base.metadata.drop_all(bind=engine)
    print("[load_seed] Creating tables from ORM metadata ...")
    Base.metadata.create_all(bind=engine)


def _load_csv(path: Path, table_name: str):
    """Bulk-load a CSV directly via pandas → SQLite (fastest path)."""
    if not path.exists():
        print(f"  [WARN] {path.name} not found — skipping {table_name}")
        return 0
    df = pd.read_csv(path, low_memory=False)
    # Normalise boolean columns that pandas reads as 0/1 or True/False
    for col in df.columns:
        if df[col].dtype == object:
            low = df[col].str.lower() if hasattr(df[col], "str") else df[col]
            if set(low.dropna().unique()).issubset({"true", "false"}):
                df[col] = low.map({"true": True, "false": False})
    from sqlalchemy import text
    with engine.begin() as conn:
        df.to_sql(table_name, con=conn, if_exists="append", index=False)
    return len(df)


def _load_compliance_rules():
    from app.models.compliance import ComplianceRule
    with Session(engine) as s:
        for rule in COMPLIANCE_RULES:
            s.merge(ComplianceRule(**rule))
        s.commit()
    print(f"  compliance_rules      {len(COMPLIANCE_RULES):>8} rows")


def _load_demo_scenarios():
    scenarios_path = SEED_DATA_DIR / "demo_scenarios.json"
    if not scenarios_path.exists():
        print("  [WARN] demo_scenarios.json not found — skipping")
        return
    with open(scenarios_path) as f:
        data = json.load(f)
    from app.models.demo_scenario import DemoScenario
    with Session(engine) as s:
        for sc in data.get("scenarios", []):
            s.merge(DemoScenario(
                scenario_id=sc["scenario_id"],
                title=sc["title"],
                narrative=sc["narrative"],
                highlight_project_ids=json.dumps(sc.get("highlight_project_ids", [])),
            ))
        s.commit()
    print(f"  demo_scenarios        {len(data.get('scenarios', [])):>8} rows")


def main():
    print(f"[load_seed] DB path: {DB_PATH}")
    print(f"[load_seed] Seed data dir: {SEED_DATA_DIR}")

    _drop_and_create()

    tables = [
        ("mps.csv",             "mps"),
        ("constituencies.csv",  "constituencies"),
        ("vendors.csv",         "vendors"),
        ("projects.csv",        "projects"),
        ("payments.csv",        "payments"),
    ]

    for fname, tname in tables:
        n = _load_csv(SEED_DATA_DIR / fname, tname)
        print(f"  {tname:<22} {n:>8} rows")

    _load_compliance_rules()
    _load_demo_scenarios()

    print("\n[load_seed] [OK] All seed data loaded successfully.")
    print("[load_seed] Run `python data_pipeline/run_pipeline.py` to populate risk scores & alerts.")


if __name__ == "__main__":
    main()
