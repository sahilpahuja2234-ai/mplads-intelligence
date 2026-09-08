"""
app/models/demo_scenario.py  —  `demo_scenarios` table ORM model
"""

from sqlalchemy import Column, Text
from app.models.base import Base


class DemoScenario(Base):
    __tablename__ = "demo_scenarios"

    scenario_id          = Column(Text, primary_key=True)
    title                = Column(Text, nullable=False)
    narrative            = Column(Text, nullable=False)
    highlight_project_ids = Column(Text)   # JSON array string
