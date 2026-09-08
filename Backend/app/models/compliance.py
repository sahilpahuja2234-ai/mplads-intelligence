"""
app/models/compliance.py  —  `compliance_rules` + `compliance_violations` ORM models
"""

from sqlalchemy import Column, Text, Integer, ForeignKey
from app.models.base import Base


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    rule_id              = Column(Text, primary_key=True)
    category             = Column(Text, nullable=False)
    title                = Column(Text, nullable=False)
    description          = Column(Text, nullable=False)
    severity_if_violated = Column(Text, nullable=False)


class ComplianceViolation(Base):
    __tablename__ = "compliance_violations"

    violation_id = Column(Text, primary_key=True)
    project_id   = Column(Text, nullable=False)
    rule_id      = Column(Text, ForeignKey("compliance_rules.rule_id"), nullable=False)
    detected_at  = Column(Text)
    status       = Column(Text, nullable=False, default="OPEN")   # OPEN|RESOLVED|WAIVED
    details      = Column(Text)
