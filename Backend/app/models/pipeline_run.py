"""
app/models/pipeline_run.py  —  `pipeline_runs` table ORM model
"""

from sqlalchemy import Column, Text, Integer
from app.models.base import Base


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    pipeline_run_id    = Column(Text, primary_key=True)
    started_at         = Column(Text)
    finished_at        = Column(Text)
    status             = Column(Text)       # RUNNING | SUCCESS | FAILED
    projects_processed = Column(Integer)
    alerts_generated   = Column(Integer)
    notes              = Column(Text)
