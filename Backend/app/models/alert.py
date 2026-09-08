"""
app/models/alert.py  —  `alerts` table ORM model
"""

from sqlalchemy import Column, Text, DateTime
from sqlalchemy.sql import func
from app.models.base import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id           = Column(Text, primary_key=True)
    project_id         = Column(Text, nullable=False)
    alert_type         = Column(Text, nullable=False)   # AlertType enum
    severity           = Column(Text, nullable=False)   # LOW|MEDIUM|HIGH|CRITICAL
    status             = Column(Text, nullable=False, default="OPEN")
    title              = Column(Text, nullable=False)
    description        = Column(Text, nullable=False)
    evidence_json      = Column(Text)   # JSON object with supporting numbers
    financial_exposure = Column(Text)   # JSON: {amount, currency}
    detected_at        = Column(Text)
    updated_at         = Column(Text)
    resolution_remarks = Column(Text)
