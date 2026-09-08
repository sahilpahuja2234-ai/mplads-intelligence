"""
app/schemas/common.py
======================
Shared Pydantic models: pagination envelope, error response, and all enums.
"""

from __future__ import annotations

from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field
from enum import Enum

T = TypeVar("T")


# ── Enums ──────────────────────────────────────────────────────────────────

class HouseEnum(str, Enum):
    LOK_SABHA  = "LOK_SABHA"
    RAJYA_SABHA = "RAJYA_SABHA"
    NOMINATED   = "NOMINATED"

class ProjectStatusEnum(str, Enum):
    RECOMMENDED = "RECOMMENDED"
    SANCTIONED  = "SANCTIONED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED   = "COMPLETED"
    DELAYED     = "DELAYED"
    ABANDONED   = "ABANDONED"
    ON_HOLD     = "ON_HOLD"

class WorkCategoryEnum(str, Enum):
    DRINKING_WATER      = "DRINKING_WATER"
    EDUCATION           = "EDUCATION"
    HEALTH              = "HEALTH"
    ROADS               = "ROADS"
    IRRIGATION          = "IRRIGATION"
    ELECTRICITY         = "ELECTRICITY"
    SANITATION          = "SANITATION"
    SPORTS              = "SPORTS"
    RAILWAYS            = "RAILWAYS"
    PUBLIC_INFRASTRUCTURE = "PUBLIC_INFRASTRUCTURE"
    COMMUNITY_HALLS     = "COMMUNITY_HALLS"
    DISASTER_RELIEF     = "DISASTER_RELIEF"
    OTHER               = "OTHER"

class RiskLevelEnum(str, Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"

class AlertTypeEnum(str, Enum):
    EXPENDITURE_ANOMALY  = "EXPENDITURE_ANOMALY"
    COST_OVERRUN         = "COST_OVERRUN"
    DELAY                = "DELAY"
    PAYMENT_ANOMALY      = "PAYMENT_ANOMALY"
    DUPLICATE_PROJECT    = "DUPLICATE_PROJECT"
    GEOGRAPHIC_ANOMALY   = "GEOGRAPHIC_ANOMALY"
    COMPLIANCE_VIOLATION = "COMPLIANCE_VIOLATION"
    SPENDING_PATTERN     = "SPENDING_PATTERN"
    AGENCY               = "AGENCY"
    FINANCIAL            = "FINANCIAL"

class AlertSeverityEnum(str, Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"

class AlertStatusEnum(str, Enum):
    OPEN         = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED     = "RESOLVED"
    DISMISSED    = "DISMISSED"
    ESCALATED    = "ESCALATED"

class ComplianceCategoryEnum(str, Enum):
    FUND_LIMIT              = "FUND_LIMIT"
    PERMISSIBLE_WORK        = "PERMISSIBLE_WORK"
    TIMELINE                = "TIMELINE"
    UTILIZATION_CERTIFICATE = "UTILIZATION_CERTIFICATE"
    SANCTION_PROCESS        = "SANCTION_PROCESS"
    GEOGRAPHIC_JURISDICTION = "GEOGRAPHIC_JURISDICTION"

class PipelineStatusEnum(str, Enum):
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED  = "FAILED"


# ── Envelopes ──────────────────────────────────────────────────────────────

class PaginationMeta(BaseModel):
    page:        int
    page_size:   int
    total_items: int
    total_pages: int

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: PaginationMeta

class ErrorDetail(BaseModel):
    code:    str
    message: str

class ErrorResponse(BaseModel):
    error: ErrorDetail


# ── Mini shared models ─────────────────────────────────────────────────────

class MPSummary(BaseModel):
    mp_id:        str
    name:         str
    house:        str
    state:        str
    constituency: Optional[str] = None

class VendorSummary(BaseModel):
    vendor_id: str
    name:      str

class RiskSummary(BaseModel):
    risk_score:  float
    risk_level:  str
    top_factors: List[str] = []

class ProjectFlags(BaseModel):
    has_open_alerts:         bool = False
    open_alert_count:        int  = 0
    has_compliance_violation: bool = False
    in_duplicate_cluster:    bool = False
