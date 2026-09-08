"""
app/models/__init__.py
======================
Imports all ORM models so that `Base.metadata.create_all()` sees them all.
"""

from app.models.base import Base
from app.models.mp import MP
from app.models.constituency import Constituency
from app.models.vendor import Vendor
from app.models.project import Project
from app.models.payment import Payment
from app.models.risk_score import RiskScore
from app.models.alert import Alert
from app.models.compliance import ComplianceRule, ComplianceViolation
from app.models.duplicate import DuplicateCluster, DuplicateClusterMember
from app.models.pipeline_run import PipelineRun
from app.models.demo_scenario import DemoScenario

__all__ = [
    "Base", "MP", "Constituency", "Vendor", "Project", "Payment",
    "RiskScore", "Alert", "ComplianceRule", "ComplianceViolation",
    "DuplicateCluster", "DuplicateClusterMember", "PipelineRun", "DemoScenario",
]
