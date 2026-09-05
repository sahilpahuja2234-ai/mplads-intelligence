"""
app/models/payment.py  —  `payments` table ORM model
"""

from sqlalchemy import Column, Text, Integer, Float, Boolean, ForeignKey
from app.models.base import Base


class Payment(Base):
    __tablename__ = "payments"

    payment_id          = Column(Text, primary_key=True)
    project_id          = Column(Text, ForeignKey("projects.project_id"), nullable=False)
    installment_no      = Column(Integer, nullable=False)
    amount              = Column(Float, nullable=False)
    payment_date        = Column(Text, nullable=False)
    payment_mode        = Column(Text)   # DBT | CHEQUE | RTGS
    milestone_reached_pct = Column(Float)
    flagged             = Column(Boolean, default=False)
