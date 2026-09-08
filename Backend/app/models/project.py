"""
app/models/project.py  —  `projects` table ORM model
"""

from sqlalchemy import Column, Text, Float, Boolean, DateTime, ForeignKey
from app.models.base import Base


class Project(Base):
    __tablename__ = "projects"

    project_id                    = Column(Text, primary_key=True)
    mp_id                         = Column(Text, ForeignKey("mps.mp_id"), nullable=False)
    constituency_id               = Column(Text, ForeignKey("constituencies.constituency_id"))
    state                         = Column(Text, nullable=False)
    district                      = Column(Text, nullable=False)
    latitude                      = Column(Float)
    longitude                     = Column(Float)
    work_category                 = Column(Text, nullable=False)
    work_description              = Column(Text, nullable=False)
    implementing_agency           = Column(Text)
    executing_agency              = Column(Text)
    vendor_id                     = Column(Text, ForeignKey("vendors.vendor_id"))
    sanctioned_amount             = Column(Float, nullable=False)
    estimated_cost                = Column(Float)
    released_amount               = Column(Float, nullable=False, default=0)
    expenditure_amount            = Column(Float, nullable=False, default=0)
    recommended_date              = Column(Text)
    sanction_date                 = Column(Text)
    start_date                    = Column(Text)
    expected_completion_date      = Column(Text)
    actual_completion_date        = Column(Text)
    status                        = Column(Text, nullable=False)
    utilization_certificate_filed = Column(Boolean, default=False)
    created_at                    = Column(Text)
    updated_at                    = Column(Text)
