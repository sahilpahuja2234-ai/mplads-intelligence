"""
app/models/vendor.py  —  `vendors` table ORM model
"""

from sqlalchemy import Column, Text, Integer, Boolean
from app.models.base import Base


class Vendor(Base):
    __tablename__ = "vendors"

    vendor_id              = Column(Text, primary_key=True)
    name                   = Column(Text, nullable=False)
    registration_no        = Column(Text)
    state                  = Column(Text)
    total_projects_handled = Column(Integer, default=0)
    flagged_before         = Column(Boolean, default=False)
