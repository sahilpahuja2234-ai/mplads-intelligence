"""
data_pipeline/run_pipeline.py
=============================
CLI entrypoint to run the ML pipeline manually.
"""

import sys
from pathlib import Path

# Add Backend to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import SessionLocal
from app.ml.pipeline import run_pipeline


def main():
    print("[run_pipeline] Starting pipeline execution...")
    with SessionLocal() as db:
        run_id = run_pipeline(db)
    print(f"[run_pipeline] Done! Pipeline run ID: {run_id}")


if __name__ == "__main__":
    main()
