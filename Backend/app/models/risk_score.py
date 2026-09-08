"""
app/models/risk_score.py  —  `risk_scores` table ORM model
"""

from sqlalchemy import Column, Text, Integer, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.models.base import Base


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id                        = Column(Integer, primary_key=True, autoincrement=True)
    project_id                = Column(Text, nullable=False)
    pipeline_run_id           = Column(Text, nullable=False)
    risk_score                = Column(Float, nullable=False)
    risk_level                = Column(Text, nullable=False)   # LOW|MEDIUM|HIGH|CRITICAL
    expenditure_anomaly_score = Column(Float, default=0)
    cost_overrun_score        = Column(Float, default=0)
    delay_score               = Column(Float, default=0)
    payment_behavior_score    = Column(Float, default=0)
    duplicate_score           = Column(Float, default=0)
    geo_anomaly_score         = Column(Float, default=0)
    compliance_score          = Column(Float, default=0)
    spending_pattern_score    = Column(Float, default=0)
    contributing_factors_json = Column(Text)    # JSON array of {factor, score, weight, explanation}
    computed_at               = Column(Text)
    is_latest                 = Column(Boolean, default=True)
