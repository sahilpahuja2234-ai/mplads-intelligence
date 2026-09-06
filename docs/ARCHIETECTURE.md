# MPLADS Anomaly & Fraud Detection System — Technical Architecture & API Contract
### SIH 2026 | Problem ID 26102 | Version 1.0 (FROZEN CONTRACT)

This document is the binding technical contract between all three developers. Once merged to `main`,
changes to schemas, enums, or endpoint signatures require a version bump (see §12) — not silent edits.

**Team split (as given):**
| Dev | Owns |
|---|---|
| **Dev 1** | Backend (FastAPI), database, data pipeline, ML / risk engine — implements **every** API endpoint |
| **Dev 2** | Main frontend shell, navigation, Executive Dashboard, Projects, Map Intelligence |
| **Dev 3** | AI Alerts, Project Investigation, Duplicate Detection, Analytics, Early Warning, Compliance |

Dev 2 and Dev 3 never touch backend code. Dev 1 never touches page-level React components. All three
touch `shared/types.ts` (read-only after freeze) and consume the OpenAPI contract below.

---

## 1. Folder Structure

```
mplads-ai-system/
├── backend/                                # DEV 1
│   ├── app/
│   │   ├── main.py                         # FastAPI app entrypoint, CORS, router mount
│   │   ├── core/
│   │   │   ├── config.py                   # env config, constants, enum definitions
│   │   │   └── security.py                 # (optional) simple demo auth
│   │   ├── db/
│   │   │   ├── session.py                  # SQLAlchemy engine/session
│   │   │   ├── base.py
│   │   │   └── init_db.py                  # creates tables, runs seed
│   │   ├── models/                         # SQLAlchemy ORM models (mirrors §3 schema)
│   │   │   ├── mp.py
│   │   │   ├── project.py
│   │   │   ├── payment.py
│   │   │   ├── alert.py
│   │   │   ├── risk_score.py
│   │   │   ├── compliance.py
│   │   │   ├── duplicate.py
│   │   │   └── demo_scenario.py
│   │   ├── schemas/                        # Pydantic schemas = SOURCE OF TRUTH for API contract
│   │   │   ├── project.py
│   │   │   ├── alert.py
│   │   │   ├── dashboard.py
│   │   │   ├── investigation.py
│   │   │   ├── map.py
│   │   │   ├── analytics.py
│   │   │   ├── early_warning.py
│   │   │   ├── compliance.py
│   │   │   ├── demo.py
│   │   │   └── common.py                   # Pagination, ErrorResponse, Enums
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py                # aggregates all routers under /api/v1
│   │   │       └── endpoints/
│   │   │           ├── projects.py
│   │   │           ├── dashboard.py
│   │   │           ├── alerts.py
│   │   │           ├── investigation.py
│   │   │           ├── duplicates.py
│   │   │           ├── map.py
│   │   │           ├── analytics.py
│   │   │           ├── early_warning.py
│   │   │           ├── compliance.py
│   │   │           ├── demo.py
│   │   │           └── pipeline.py          # admin/internal ML trigger endpoints
│   │   └── ml/
│   │       ├── pipeline.py                  # orchestrates full run, writes risk_scores + alerts
│   │       ├── features.py                  # feature engineering shared by all detectors
│   │       └── detectors/
│   │           ├── expenditure_anomaly.py
│   │           ├── cost_overrun.py
│   │           ├── delay_detector.py
│   │           ├── payment_behavior.py
│   │           ├── duplicate_detector.py
│   │           ├── geo_anomaly.py
│   │           ├── compliance_rules.py
│   │           ├── spending_pattern.py
│   │           └── risk_scorer.py           # ensemble combiner → final risk_score/level
│   ├── data_pipeline/
│   │   ├── synthetic_generator.py           # generates realistic fake MPLADS dataset
│   │   ├── seed_data/                       # generated CSV/JSON checked into repo
│   │   │   ├── mps.csv
│   │   │   ├── projects.csv
│   │   │   ├── payments.csv
│   │   │   └── vendors.csv
│   │   └── load_seed.py                     # CSV → SQLite loader
│   ├── mplads.db                            # SQLite file (generated, gitignored, seed script recreates it)
│   ├── tests/
│   ├── requirements.txt
│   └── openapi_export.json                  # `python -m app.export_openapi` → consumed by frontend
│
├── frontend/                                # DEV 2 (shell) + DEV 3 (feature pages)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── router.tsx                       # DEV 2 owns route table
│   │   ├── layout/                          # DEV 2: Sidebar, Topbar, PageShell
│   │   ├── api/
│   │   │   ├── client.ts                    # axios/fetch instance, base URL, error interceptor
│   │   │   ├── projects.api.ts
│   │   │   ├── dashboard.api.ts
│   │   │   ├── alerts.api.ts
│   │   │   ├── investigation.api.ts
│   │   │   ├── duplicates.api.ts
│   │   │   ├── map.api.ts
│   │   │   ├── analytics.api.ts
│   │   │   ├── earlyWarning.api.ts
│   │   │   ├── compliance.api.ts
│   │   │   └── demo.api.ts
│   │   ├── types/
│   │   │   └── generated.ts                 # AUTO-GENERATED from openapi_export.json — DO NOT HAND-EDIT
│   │   ├── mocks/
│   │   │   ├── handlers.ts                  # MSW mock handlers, one per endpoint (§13)
│   │   │   └── fixtures/                    # static JSON matching §7 exactly
│   │   ├── pages/
│   │   │   ├── ExecutiveDashboard/          # DEV 2
│   │   │   ├── Projects/                    # DEV 2
│   │   │   ├── MapIntelligence/             # DEV 2
│   │   │   ├── AIAlerts/                    # DEV 3
│   │   │   ├── ProjectInvestigation/        # DEV 3
│   │   │   ├── Analytics/                   # DEV 3
│   │   │   ├── EarlyWarning/                # DEV 3
│   │   │   ├── Compliance/                  # DEV 3
│   │   │   └── DemoScenarios/               # DEV 3
│   │   ├── components/                      # shared dumb components (Badge, RiskPill, KpiCard...)
│   │   └── hooks/
│   ├── package.json
│   └── vite.config.ts
│
├── shared/
│   ├── types.ts                             # hand-written contract types, frozen at kickoff (§7)
│   └── enums.md                             # canonical enum values (§4) — copy-pasted into both sides
│
└── docs/
    ├── ARCHITECTURE.md                      # this file
    └── DEMO_SCRIPT.md                       # judge-facing walkthrough (§11)
```

---

## 2. Integration Ownership Matrix

| Module | Backend endpoints | Frontend page | Owner |
|---|---|---|---|
| Auth/health | `/health` | — | Dev 1 |
| Projects | `/projects*` | Projects | Dev 1 (API) / Dev 2 (UI) |
| Dashboard | `/dashboard*` | Executive Dashboard | Dev 1 (API) / Dev 2 (UI) |
| Map | `/map*` | Map Intelligence | Dev 1 (API) / Dev 2 (UI) |
| Alerts | `/alerts*` | AI Alerts | Dev 1 (API) / Dev 3 (UI) |
| Investigation | `/investigation*` | Project Investigation | Dev 1 (API) / Dev 3 (UI) |
| Duplicates | `/duplicates*` | (panel inside Investigation + Analytics) | Dev 1 (API) / Dev 3 (UI) |
| Analytics | `/analytics*` | Analytics | Dev 1 (API) / Dev 3 (UI) |
| Early Warning | `/early-warning*` | Early Warning | Dev 1 (API) / Dev 3 (UI) |
| Compliance | `/compliance*` | Compliance | Dev 1 (API) / Dev 3 (UI) |
| Demo | `/demo*` | Demo Scenarios | Dev 1 (API) / Dev 3 (UI) |
| ML Pipeline | `/pipeline*` | (admin-only, no dedicated page; small trigger button in Demo Scenarios page) | Dev 1 |

**Rule:** Dev 2 and Dev 3 build against `shared/types.ts` + MSW mocks (§13) from Day 1, never waiting on Dev 1's live server.

---

## 3. Database Schema (SQLite)

```sql
-- ===================== REFERENCE ENTITIES =====================

CREATE TABLE mps (
    mp_id           TEXT PRIMARY KEY,          -- e.g. 'MP-MH-014'
    name            TEXT NOT NULL,
    house           TEXT NOT NULL,             -- LOK_SABHA | RAJYA_SABHA | NOMINATED
    state           TEXT NOT NULL,
    constituency    TEXT,
    party           TEXT,
    term_start      DATE,
    term_end        DATE
);

CREATE TABLE constituencies (
    constituency_id TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    state           TEXT NOT NULL,
    district        TEXT NOT NULL,
    centroid_lat    REAL,
    centroid_lng    REAL,
    boundary_geojson TEXT                       -- optional polygon for containment checks
);

CREATE TABLE vendors (
    vendor_id       TEXT PRIMARY KEY,           -- e.g. 'VEN-00231'
    name            TEXT NOT NULL,
    registration_no TEXT,
    state           TEXT,
    total_projects_handled INTEGER DEFAULT 0,
    flagged_before  BOOLEAN DEFAULT 0
);

-- ===================== CORE ENTITY =====================

CREATE TABLE projects (
    project_id           TEXT PRIMARY KEY,      -- e.g. 'MPLADS-MH-2023-04521'
    mp_id                TEXT NOT NULL REFERENCES mps(mp_id),
    constituency_id      TEXT REFERENCES constituencies(constituency_id),
    state                TEXT NOT NULL,
    district             TEXT NOT NULL,
    latitude             REAL,
    longitude            REAL,
    work_category        TEXT NOT NULL,         -- enum, see §4
    work_description     TEXT NOT NULL,
    implementing_agency  TEXT,
    executing_agency     TEXT,
    vendor_id            TEXT REFERENCES vendors(vendor_id),
    sanctioned_amount    REAL NOT NULL,
    estimated_cost       REAL,
    released_amount      REAL NOT NULL DEFAULT 0,
    expenditure_amount   REAL NOT NULL DEFAULT 0,
    recommended_date     DATE,
    sanction_date        DATE,
    start_date           DATE,
    expected_completion_date DATE,
    actual_completion_date   DATE,
    status               TEXT NOT NULL,         -- enum, see §4
    utilization_certificate_filed BOOLEAN DEFAULT 0,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    payment_id      TEXT PRIMARY KEY,           -- e.g. 'PAY-000981'
    project_id      TEXT NOT NULL REFERENCES projects(project_id),
    installment_no  INTEGER NOT NULL,
    amount          REAL NOT NULL,
    payment_date    DATE NOT NULL,
    payment_mode    TEXT,                       -- DBT | CHEQUE | RTGS
    milestone_reached_pct REAL,                 -- % physical progress claimed at time of payment
    flagged         BOOLEAN DEFAULT 0
);

-- ===================== ML OUTPUT TABLES =====================

CREATE TABLE risk_scores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      TEXT NOT NULL REFERENCES projects(project_id),
    pipeline_run_id TEXT NOT NULL,
    risk_score      REAL NOT NULL,              -- 0-100
    risk_level      TEXT NOT NULL,              -- LOW | MEDIUM | HIGH | CRITICAL
    expenditure_anomaly_score REAL DEFAULT 0,
    cost_overrun_score        REAL DEFAULT 0,
    delay_score                REAL DEFAULT 0,
    payment_behavior_score     REAL DEFAULT 0,
    duplicate_score            REAL DEFAULT 0,
    geo_anomaly_score          REAL DEFAULT 0,
    compliance_score           REAL DEFAULT 0,
    spending_pattern_score     REAL DEFAULT 0,
    contributing_factors_json  TEXT,            -- JSON array, see §7 RiskBreakdown
    computed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_latest       BOOLEAN DEFAULT 1
);

CREATE TABLE alerts (
    alert_id        TEXT PRIMARY KEY,           -- e.g. 'ALT-000452'
    project_id      TEXT NOT NULL REFERENCES projects(project_id),
    alert_type      TEXT NOT NULL,              -- enum §4
    severity        TEXT NOT NULL,              -- LOW | MEDIUM | HIGH | CRITICAL
    status          TEXT NOT NULL DEFAULT 'OPEN',
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    evidence_json   TEXT,                       -- JSON: supporting numbers/fields for the alert
    detected_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolution_remarks TEXT
);

CREATE TABLE compliance_rules (
    rule_id         TEXT PRIMARY KEY,           -- e.g. 'RULE-FUND-01'
    category        TEXT NOT NULL,              -- enum §4
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    severity_if_violated TEXT NOT NULL
);

CREATE TABLE compliance_violations (
    violation_id    TEXT PRIMARY KEY,
    project_id      TEXT NOT NULL REFERENCES projects(project_id),
    rule_id         TEXT NOT NULL REFERENCES compliance_rules(rule_id),
    detected_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status          TEXT NOT NULL DEFAULT 'OPEN',
    details         TEXT
);

CREATE TABLE duplicate_clusters (
    cluster_id      TEXT PRIMARY KEY,           -- e.g. 'DUP-0012'
    similarity_score REAL NOT NULL,             -- 0-1
    cluster_reason  TEXT,                       -- 'TEXT_SIMILARITY' | 'GEO_PROXIMITY' | 'BOTH'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE duplicate_cluster_members (
    cluster_id      TEXT NOT NULL REFERENCES duplicate_clusters(cluster_id),
    project_id      TEXT NOT NULL REFERENCES projects(project_id),
    PRIMARY KEY (cluster_id, project_id)
);

CREATE TABLE pipeline_runs (
    pipeline_run_id TEXT PRIMARY KEY,
    started_at      TIMESTAMP,
    finished_at     TIMESTAMP,
    status          TEXT,                       -- RUNNING | SUCCESS | FAILED
    projects_processed INTEGER,
    alerts_generated   INTEGER,
    notes           TEXT
);

CREATE TABLE demo_scenarios (
    scenario_id     TEXT PRIMARY KEY,           -- e.g. 'ghost-project'
    title           TEXT NOT NULL,
    narrative       TEXT NOT NULL,
    highlight_project_ids TEXT                  -- JSON array of project_ids to spotlight
);
```

---

## 4. Canonical Enums (single source of truth — copy verbatim into Pydantic and TS)

```
House               = LOK_SABHA | RAJYA_SABHA | NOMINATED
ProjectStatus       = RECOMMENDED | SANCTIONED | IN_PROGRESS | COMPLETED | DELAYED | ABANDONED | ON_HOLD
WorkCategory        = DRINKING_WATER | EDUCATION | HEALTH | ROADS | IRRIGATION | ELECTRICITY |
                      SANITATION | SPORTS | RAILWAYS | PUBLIC_INFRASTRUCTURE | COMMUNITY_HALLS |
                      DISASTER_RELIEF | OTHER
RiskLevel           = LOW | MEDIUM | HIGH | CRITICAL
AlertType           = EXPENDITURE_ANOMALY | COST_OVERRUN | DELAY | PAYMENT_ANOMALY |
                      DUPLICATE_PROJECT | GEOGRAPHIC_ANOMALY | COMPLIANCE_VIOLATION | SPENDING_PATTERN
AlertSeverity       = LOW | MEDIUM | HIGH | CRITICAL
AlertStatus         = OPEN | ACKNOWLEDGED | UNDER_REVIEW | RESOLVED | DISMISSED | ESCALATED
ComplianceCategory  = FUND_LIMIT | PERMISSIBLE_WORK | TIMELINE | UTILIZATION_CERTIFICATE |
                      SANCTION_PROCESS | GEOGRAPHIC_JURISDICTION
ComplianceStatus    = OPEN | RESOLVED | WAIVED
PipelineStatus      = RUNNING | SUCCESS | FAILED
```

---

## 5. Canonical Project Object (THE most important shared contract)

Every endpoint that returns a project — list, detail, map, investigation, alerts' parent reference —
returns this **exact** shape (fields may be `null` but keys are never omitted).

```json
{
  "project_id": "MPLADS-MH-2023-04521",
  "mp": {
    "mp_id": "MP-MH-014",
    "name": "Smt. A. Deshmukh",
    "house": "LOK_SABHA",
    "state": "Maharashtra",
    "constituency": "Nashik"
  },
  "location": {
    "state": "Maharashtra",
    "district": "Nashik",
    "constituency_id": "PC-MH-014",
    "latitude": 19.9975,
    "longitude": 73.7898
  },
  "work_category": "DRINKING_WATER",
  "work_description": "Installation of 4 solar-powered borewell hand pumps in Deolali Gram Panchayat",
  "implementing_agency": "Nashik Zilla Parishad",
  "executing_agency": "PWD Nashik Division",
  "vendor": {
    "vendor_id": "VEN-00231",
    "name": "Shree Sai Constructions"
  },
  "financials": {
    "sanctioned_amount": 1250000,
    "estimated_cost": 1420000,
    "released_amount": 1250000,
    "expenditure_amount": 1180000,
    "utilization_pct": 94.4
  },
  "timeline": {
    "recommended_date": "2023-02-10",
    "sanction_date": "2023-03-05",
    "start_date": "2023-04-01",
    "expected_completion_date": "2023-10-01",
    "actual_completion_date": null
  },
  "status": "DELAYED",
  "utilization_certificate_filed": false,
  "risk": {
    "risk_score": 78.4,
    "risk_level": "HIGH",
    "top_factors": ["DELAY", "PAYMENT_ANOMALY"]
  },
  "flags": {
    "has_open_alerts": true,
    "open_alert_count": 2,
    "has_compliance_violation": true,
    "in_duplicate_cluster": false
  },
  "created_at": "2023-02-11T09:12:00Z",
  "updated_at": "2026-08-30T04:00:00Z"
}
```

**Rule:** `risk` and `flags` are always computed/joined server-side from `risk_scores` (latest) and `alerts`/`compliance_violations` — frontend never computes these.

---

## 6. Common Response Envelopes (used by every list/detail endpoint)

**Paginated list wrapper:**
```json
{
  "data": [ /* array of objects */ ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 543,
    "total_pages": 28
  }
}
```

**Single-object response:** returned bare (no wrapper), e.g. `GET /projects/{id}` → the Project object directly.

**Error response (all 4xx/5xx):**
```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project with id MPLADS-MH-2023-99999 not found"
  }
}
```

**Standard list query params** (supported on every `GET /x` list endpoint unless noted):
`page` (int, default 1), `page_size` (int, default 20, max 100), `sort_by`, `sort_order` (`asc`|`desc`), `search` (free text), plus endpoint-specific filters below.

---

## 7. API Contract

Base URL: `http://localhost:8000/api/v1`

### 7.1 Health

**GET `/health`**
Response `200`:
```json
{ "status": "ok", "db": "connected", "last_pipeline_run": "2026-09-04T02:00:00Z" }
```

---

### 7.2 Projects

**GET `/projects`**
Query: `page, page_size, search, state, status, work_category, risk_level, mp_id, min_amount, max_amount, sort_by (sanctioned_amount|risk_score|created_at), sort_order`
Response `200`: paginated wrapper of §5 Project objects (list items may omit `timeline`/`vendor` sub-detail for payload size — see "Project (Summary)" variant below).

```json
{
  "data": [
    {
      "project_id": "MPLADS-MH-2023-04521",
      "mp_name": "Smt. A. Deshmukh",
      "state": "Maharashtra",
      "district": "Nashik",
      "work_category": "DRINKING_WATER",
      "sanctioned_amount": 1250000,
      "expenditure_amount": 1180000,
      "status": "DELAYED",
      "risk_score": 78.4,
      "risk_level": "HIGH",
      "open_alert_count": 2
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 543, "total_pages": 28 }
}
```
*(This trimmed "Project Summary" shape is used everywhere lists render rows/cards. The full §5 object is only returned by the detail endpoint below and by Investigation.)*

**GET `/projects/{project_id}`**
Response `200`: full §5 Project object.
Response `404`: error envelope, `code: "PROJECT_NOT_FOUND"`.

**GET `/projects/{project_id}/timeline`**
Response `200`:
```json
{
  "project_id": "MPLADS-MH-2023-04521",
  "events": [
    { "event": "RECOMMENDED", "date": "2023-02-10", "note": null },
    { "event": "SANCTIONED", "date": "2023-03-05", "note": null },
    { "event": "PAYMENT", "date": "2023-04-15", "note": "Installment 1 of 3 — ₹4,00,000" },
    { "event": "EXPECTED_COMPLETION_MISSED", "date": "2023-10-01", "note": "No completion report filed" }
  ]
}
```

**GET `/projects/{project_id}/payments`**
Response `200`:
```json
{
  "project_id": "MPLADS-MH-2023-04521",
  "payments": [
    { "payment_id": "PAY-000981", "installment_no": 1, "amount": 400000, "payment_date": "2023-04-15", "payment_mode": "DBT", "milestone_reached_pct": 30, "flagged": false },
    { "payment_id": "PAY-000982", "installment_no": 2, "amount": 780000, "payment_date": "2023-04-22", "payment_mode": "DBT", "milestone_reached_pct": 35, "flagged": true }
  ]
}
```

**GET `/projects/filters/meta`** — populates dropdowns without hardcoding in frontend.
Response `200`:
```json
{
  "states": ["Maharashtra", "Karnataka", "Uttar Pradesh"],
  "work_categories": ["DRINKING_WATER", "EDUCATION", "ROADS"],
  "statuses": ["RECOMMENDED", "SANCTIONED", "IN_PROGRESS", "COMPLETED", "DELAYED", "ABANDONED", "ON_HOLD"],
  "risk_levels": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
}
```

---

### 7.3 Dashboard (Executive Dashboard — Dev 2)

**GET `/dashboard/summary`**
Response `200`:
```json
{
  "total_projects": 5432,
  "total_sanctioned_amount": 6785000000,
  "total_released_amount": 6120000000,
  "total_expenditure_amount": 5430000000,
  "utilization_pct": 88.7,
  "status_breakdown": { "COMPLETED": 3201, "IN_PROGRESS": 1450, "DELAYED": 612, "ABANDONED": 89, "RECOMMENDED": 80 },
  "risk_breakdown": { "LOW": 3900, "MEDIUM": 980, "HIGH": 420, "CRITICAL": 132 },
  "open_alerts": 287,
  "open_compliance_violations": 94,
  "avg_risk_score": 24.6
}
```

**GET `/dashboard/trends?period=monthly&months=12`**
Response `200`:
```json
{
  "period": "monthly",
  "points": [
    { "label": "2025-10", "sanctioned_amount": 512000000, "expenditure_amount": 470000000, "new_alerts": 24 },
    { "label": "2025-11", "sanctioned_amount": 498000000, "expenditure_amount": 455000000, "new_alerts": 31 }
  ]
}
```

**GET `/dashboard/state-comparison`**
Response `200`:
```json
{
  "states": [
    { "state": "Maharashtra", "total_projects": 612, "utilization_pct": 91.2, "avg_risk_score": 22.1, "critical_count": 14 },
    { "state": "Bihar", "total_projects": 543, "utilization_pct": 74.5, "avg_risk_score": 38.9, "critical_count": 41 }
  ]
}
```

**GET `/dashboard/top-risky-projects?limit=10`**
Response `200`: array of Project Summary objects (§7.2 shape), sorted by `risk_score` desc.

---

### 7.4 AI Alerts (Dev 3)

**GET `/alerts`**
Query: `page, page_size, severity, alert_type, status, project_id, date_from, date_to, sort_by, sort_order`
Response `200`:
```json
{
  "data": [
    {
      "alert_id": "ALT-000452",
      "project_id": "MPLADS-MH-2023-04521",
      "project_title": "Solar borewell hand pumps — Deolali GP",
      "alert_type": "PAYMENT_ANOMALY",
      "severity": "HIGH",
      "status": "OPEN",
      "title": "Payment released before milestone verification",
      "description": "Installment 2 (₹7,80,000) disbursed 7 days after installment 1 with only 5% additional physical progress reported.",
      "detected_at": "2026-08-20T06:00:00Z"
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 287, "total_pages": 15 }
}
```

**GET `/alerts/{alert_id}`**
Response `200`:
```json
{
  "alert_id": "ALT-000452",
  "project_id": "MPLADS-MH-2023-04521",
  "alert_type": "PAYMENT_ANOMALY",
  "severity": "HIGH",
  "status": "OPEN",
  "title": "Payment released before milestone verification",
  "description": "Installment 2 (₹7,80,000) disbursed 7 days after installment 1 with only 5% additional physical progress reported.",
  "evidence": {
    "installment_1_date": "2023-04-15",
    "installment_2_date": "2023-04-22",
    "days_between": 7,
    "progress_delta_pct": 5,
    "expected_min_days_between": 45
  },
  "detected_at": "2026-08-20T06:00:00Z",
  "updated_at": "2026-08-20T06:00:00Z",
  "resolution_remarks": null
}
```

**PATCH `/alerts/{alert_id}/status`**
Request:
```json
{ "status": "UNDER_REVIEW", "remarks": "Assigned to district vigilance cell for field verification." }
```
Response `200`: updated alert object (shape above).

**GET `/alerts/summary`**
Response `200`:
```json
{
  "by_severity": { "LOW": 90, "MEDIUM": 110, "HIGH": 65, "CRITICAL": 22 },
  "by_type": { "EXPENDITURE_ANOMALY": 40, "COST_OVERRUN": 55, "DELAY": 88, "PAYMENT_ANOMALY": 33, "DUPLICATE_PROJECT": 12, "GEOGRAPHIC_ANOMALY": 9, "COMPLIANCE_VIOLATION": 40, "SPENDING_PATTERN": 10 },
  "by_status": { "OPEN": 200, "ACKNOWLEDGED": 40, "UNDER_REVIEW": 30, "RESOLVED": 12, "DISMISSED": 3, "ESCALATED": 2 }
}
```

---

### 7.5 Project Investigation (Dev 3)

**GET `/investigation/{project_id}`** — the deep-dive "case file" view.
Response `200`:
```json
{
  "project": { /* full §5 Project object */ },
  "risk_breakdown": {
    "risk_score": 78.4,
    "risk_level": "HIGH",
    "components": [
      { "factor": "DELAY", "score": 82, "weight": 0.20, "explanation": "312 days past expected completion with no report filed." },
      { "factor": "PAYMENT_ANOMALY", "score": 74, "weight": 0.15, "explanation": "Installment 2 released 7 days after installment 1." },
      { "factor": "COST_OVERRUN", "score": 12, "weight": 0.15, "explanation": "Expenditure within sanctioned limit." }
    ]
  },
  "open_alerts": [ /* array of Alert Summary — see §7.4 list shape */ ],
  "compliance_violations": [ /* array — see §7.9 shape */ ],
  "related_projects": {
    "same_vendor": [ /* Project Summary[] */ ],
    "same_mp": [ /* Project Summary[] */ ],
    "same_constituency": [ /* Project Summary[] */ ]
  },
  "duplicate_cluster": null
}
```

**GET `/investigation/{project_id}/related-projects?relation=vendor|mp|constituency`**
Response `200`: `{ "relation": "vendor", "projects": [ /* Project Summary[] */ ] }`

**GET `/investigation/{project_id}/risk-breakdown`**
Response `200`: same shape as the `risk_breakdown` object above, standalone (used for lazy-loading the risk tab separately).

**POST `/investigation/{project_id}/notes`**
Request: `{ "author": "Analyst A", "note": "Field visit scheduled for 12 Sep." }`
Response `201`: `{ "note_id": "NOTE-0091", "project_id": "...", "author": "Analyst A", "note": "...", "created_at": "2026-09-04T10:00:00Z" }`

---

### 7.6 Duplicate Detection (Dev 3)

**GET `/duplicates`**
Query: `page, page_size, min_similarity`
Response `200`:
```json
{
  "data": [
    {
      "cluster_id": "DUP-0012",
      "similarity_score": 0.93,
      "cluster_reason": "BOTH",
      "member_count": 3,
      "total_sanctioned_amount": 3600000,
      "states_involved": ["Maharashtra"]
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 41, "total_pages": 3 }
}
```

**GET `/duplicates/{cluster_id}`**
Response `200`:
```json
{
  "cluster_id": "DUP-0012",
  "similarity_score": 0.93,
  "cluster_reason": "BOTH",
  "members": [ /* Project Summary[] */ ],
  "similarity_matrix_note": "Pairwise cosine similarity on work_description (TF-IDF) combined with <500m geographic proximity."
}
```

---

### 7.7 Map Intelligence (Dev 2)

**GET `/map/projects`**
Query: `state, status, risk_level, work_category` (no pagination — capped at 2000 points server-side for demo dataset)
Response `200`:
```json
{
  "points": [
    { "project_id": "MPLADS-MH-2023-04521", "latitude": 19.9975, "longitude": 73.7898, "status": "DELAYED", "risk_level": "HIGH", "sanctioned_amount": 1250000 }
  ],
  "total_returned": 1842
}
```

**GET `/map/clusters`** — geographic anomaly clusters (e.g. implausibly many projects at near-identical coordinates).
Response `200`:
```json
{
  "clusters": [
    {
      "cluster_id": "GEO-0004",
      "centroid": { "latitude": 25.601, "longitude": 85.104 },
      "radius_meters": 120,
      "project_count": 9,
      "reason": "9 projects registered within 120m radius across 3 different MPs — unusually dense for rural coordinates.",
      "project_ids": ["MPLADS-BR-2024-0091", "MPLADS-BR-2024-0092"]
    }
  ]
}
```

**GET `/map/state-summary`** — for choropleth layer.
Response `200`:
```json
{
  "states": [
    { "state": "Maharashtra", "total_projects": 612, "avg_risk_score": 22.1, "total_sanctioned_amount": 765000000 }
  ]
}
```

---

### 7.8 Analytics (Dev 3)

**GET `/analytics/expenditure-distribution`**
Response `200`: `{ "buckets": [ { "range": "0-5L", "count": 1200 }, { "range": "5-10L", "count": 2100 } ] }`

**GET `/analytics/category-breakdown`**
Response `200`: `{ "categories": [ { "work_category": "ROADS", "project_count": 1400, "total_amount": 980000000, "avg_risk_score": 28.4 } ] }`

**GET `/analytics/vendor-analysis?min_projects=3`**
Response `200`:
```json
{
  "vendors": [
    { "vendor_id": "VEN-00231", "name": "Shree Sai Constructions", "project_count": 14, "total_amount": 16800000, "avg_risk_score": 61.2, "flagged_project_count": 6 }
  ]
}
```

**GET `/analytics/mp-performance`**
Response `200`:
```json
{
  "mps": [
    { "mp_id": "MP-MH-014", "name": "Smt. A. Deshmukh", "utilization_pct": 94.4, "avg_completion_delay_days": 45, "avg_risk_score": 31.0, "total_projects": 62 }
  ]
}
```

**GET `/analytics/correlation?x=cost_overrun&y=delay`**
Response `200`:
```json
{
  "x_field": "cost_overrun_pct",
  "y_field": "delay_days",
  "points": [ { "project_id": "MPLADS-MH-2023-04521", "x": 12.4, "y": 312 } ],
  "correlation_coefficient": 0.61
}
```

---

### 7.9 Early Warning (Dev 3)

**GET `/early-warning/predictions`**
Query: `page, page_size, min_probability, horizon_days (default 90)`
Response `200`:
```json
{
  "data": [
    {
      "project_id": "MPLADS-UP-2024-01187",
      "prediction_type": "LIKELY_DELAY",
      "probability": 0.82,
      "predicted_by": "2026-11-15",
      "key_drivers": ["Only 20% expenditure at 60% of timeline elapsed", "Executing agency has 3 other delayed projects"]
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 156, "total_pages": 8 }
}
```

**GET `/early-warning/{project_id}/forecast`**
Response `200`:
```json
{
  "project_id": "MPLADS-UP-2024-01187",
  "prediction_type": "LIKELY_DELAY",
  "probability": 0.82,
  "expected_completion_forecast": "2027-01-20",
  "original_expected_completion": "2026-11-15",
  "drivers": [
    { "feature": "expenditure_pace", "contribution": 0.41 },
    { "feature": "agency_track_record", "contribution": 0.29 }
  ]
}
```

---

### 7.10 Compliance (Dev 3)

**GET `/compliance/rules`**
Response `200`:
```json
{
  "rules": [
    { "rule_id": "RULE-FUND-01", "category": "FUND_LIMIT", "title": "Annual entitlement cap", "description": "Total sanctioned amount per MP per financial year must not exceed ₹5 crore.", "severity_if_violated": "CRITICAL" }
  ]
}
```

**GET `/compliance/violations`**
Query: `page, page_size, category, status, project_id`
Response `200`:
```json
{
  "data": [
    {
      "violation_id": "VIO-000221",
      "project_id": "MPLADS-BR-2024-0091",
      "rule_id": "RULE-WORK-03",
      "rule_title": "Non-permissible work category",
      "category": "PERMISSIBLE_WORK",
      "status": "OPEN",
      "detected_at": "2026-07-11T00:00:00Z",
      "details": "Project funds a religious structure renovation, which is on the MPLADS non-permissible list."
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_items": 94, "total_pages": 5 }
}
```

**GET `/compliance/summary`**
Response `200`:
```json
{
  "by_category": { "FUND_LIMIT": 8, "PERMISSIBLE_WORK": 22, "TIMELINE": 31, "UTILIZATION_CERTIFICATE": 25, "SANCTION_PROCESS": 5, "GEOGRAPHIC_JURISDICTION": 3 },
  "total_open": 94,
  "total_resolved": 41
}
```

**GET `/compliance/{project_id}/checklist`**
Response `200`:
```json
{
  "project_id": "MPLADS-BR-2024-0091",
  "checklist": [
    { "rule_id": "RULE-FUND-01", "title": "Annual entitlement cap", "status": "PASS" },
    { "rule_id": "RULE-WORK-03", "title": "Non-permissible work category", "status": "VIOLATED" },
    { "rule_id": "RULE-UC-01", "title": "Utilization certificate filed within 1 year", "status": "PENDING" }
  ]
}
```

---

### 7.11 Demo Scenarios (Dev 3, backed by Dev 1 fixtures)

**GET `/demo/scenarios`**
Response `200`:
```json
{
  "scenarios": [
    {
      "scenario_id": "ghost-project",
      "title": "The Ghost Project",
      "narrative": "A sanctioned drinking-water project shows full expenditure and payment but no GPS-verifiable location match and no completion report.",
      "highlight_project_ids": ["MPLADS-BR-2024-0091"]
    }
  ]
}
```

**POST `/demo/scenarios/{scenario_id}/activate`**
Request: `{}`
Response `200`: `{ "scenario_id": "ghost-project", "activated": true, "navigate_to": "/investigation/MPLADS-BR-2024-0091" }`
*(Activation just tells the frontend where to route/what filter to pre-apply — it does not mutate data, keeping the demo idempotent and safe to replay.)*

**POST `/demo/reset`**
Response `200`: `{ "reset": true }`

---

### 7.12 ML Pipeline (internal/admin — Dev 1 only, exposed for the Demo Scenarios page's "Re-run AI Engine" button)

**POST `/pipeline/run`**
Request: `{}`
Response `202`: `{ "pipeline_run_id": "RUN-20260904-0200", "status": "RUNNING" }`

**GET `/pipeline/status?run_id=RUN-20260904-0200`**
Response `200`: `{ "pipeline_run_id": "RUN-20260904-0200", "status": "SUCCESS", "started_at": "...", "finished_at": "...", "projects_processed": 5432, "alerts_generated": 287 }`

**GET `/pipeline/models/info`**
Response `200`:
```json
{
  "detectors": [
    { "name": "expenditure_anomaly", "method": "IsolationForest", "trained_on": "5432 projects", "last_updated": "2026-09-04T02:00:00Z" },
    { "name": "delay_predictor", "method": "GradientBoostingClassifier", "trained_on": "5432 projects", "last_updated": "2026-09-04T02:00:00Z" }
  ]
}
```

---

## 8. Shared TypeScript Interfaces (`shared/types.ts`)

```typescript
// ==== Enums ====
export type House = "LOK_SABHA" | "RAJYA_SABHA" | "NOMINATED";
export type ProjectStatus = "RECOMMENDED" | "SANCTIONED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "ABANDONED" | "ON_HOLD";
export type WorkCategory = "DRINKING_WATER" | "EDUCATION" | "HEALTH" | "ROADS" | "IRRIGATION" | "ELECTRICITY" | "SANITATION" | "SPORTS" | "RAILWAYS" | "PUBLIC_INFRASTRUCTURE" | "COMMUNITY_HALLS" | "DISASTER_RELIEF" | "OTHER";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertType = "EXPENDITURE_ANOMALY" | "COST_OVERRUN" | "DELAY" | "PAYMENT_ANOMALY" | "DUPLICATE_PROJECT" | "GEOGRAPHIC_ANOMALY" | "COMPLIANCE_VIOLATION" | "SPENDING_PATTERN";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED" | "ESCALATED";
export type ComplianceCategory = "FUND_LIMIT" | "PERMISSIBLE_WORK" | "TIMELINE" | "UTILIZATION_CERTIFICATE" | "SANCTION_PROCESS" | "GEOGRAPHIC_JURISDICTION";

// ==== Envelopes ====
export interface Paginated<T> {
  data: T[];
  meta: { page: number; page_size: number; total_items: number; total_pages: number };
}
export interface ApiError {
  error: { code: string; message: string };
}

// ==== Core ====
export interface ProjectSummary {
  project_id: string;
  mp_name: string;
  state: string;
  district: string;
  work_category: WorkCategory;
  sanctioned_amount: number;
  expenditure_amount: number;
  status: ProjectStatus;
  risk_score: number;
  risk_level: RiskLevel;
  open_alert_count: number;
}

export interface Project {
  project_id: string;
  mp: { mp_id: string; name: string; house: House; state: string; constituency: string };
  location: { state: string; district: string; constituency_id: string | null; latitude: number | null; longitude: number | null };
  work_category: WorkCategory;
  work_description: string;
  implementing_agency: string | null;
  executing_agency: string | null;
  vendor: { vendor_id: string; name: string } | null;
  financials: { sanctioned_amount: number; estimated_cost: number | null; released_amount: number; expenditure_amount: number; utilization_pct: number };
  timeline: { recommended_date: string | null; sanction_date: string | null; start_date: string | null; expected_completion_date: string | null; actual_completion_date: string | null };
  status: ProjectStatus;
  utilization_certificate_filed: boolean;
  risk: { risk_score: number; risk_level: RiskLevel; top_factors: AlertType[] };
  flags: { has_open_alerts: boolean; open_alert_count: number; has_compliance_violation: boolean; in_duplicate_cluster: boolean };
  created_at: string;
  updated_at: string;
}

export interface Alert {
  alert_id: string;
  project_id: string;
  project_title?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  evidence?: Record<string, unknown>;
  detected_at: string;
  updated_at?: string;
  resolution_remarks?: string | null;
}

export interface RiskBreakdown {
  risk_score: number;
  risk_level: RiskLevel;
  components: { factor: AlertType; score: number; weight: number; explanation: string }[];
}

export interface ComplianceViolation {
  violation_id: string;
  project_id: string;
  rule_id: string;
  rule_title: string;
  category: ComplianceCategory;
  status: "OPEN" | "RESOLVED" | "WAIVED";
  detected_at: string;
  details: string;
}

export interface DuplicateCluster {
  cluster_id: string;
  similarity_score: number;
  cluster_reason: "TEXT_SIMILARITY" | "GEO_PROXIMITY" | "BOTH";
  member_count: number;
  total_sanctioned_amount: number;
  states_involved: string[];
}

export interface MapPoint {
  project_id: string;
  latitude: number;
  longitude: number;
  status: ProjectStatus;
  risk_level: RiskLevel;
  sanctioned_amount: number;
}

export interface EarlyWarningPrediction {
  project_id: string;
  prediction_type: "LIKELY_DELAY" | "LIKELY_OVERRUN";
  probability: number;
  predicted_by?: string;
  key_drivers: string[];
}

export interface DemoScenario {
  scenario_id: string;
  title: string;
  narrative: string;
  highlight_project_ids: string[];
}

export interface DashboardSummary {
  total_projects: number;
  total_sanctioned_amount: number;
  total_released_amount: number;
  total_expenditure_amount: number;
  utilization_pct: number;
  status_breakdown: Record<ProjectStatus, number>;
  risk_breakdown: Record<RiskLevel, number>;
  open_alerts: number;
  open_compliance_violations: number;
  avg_risk_score: number;
}
```

---

## 9. ML Pipeline

```
synthetic_generator.py → seed_data/*.csv → SQLite (projects, payments, mps, vendors)
                                                │
                                                ▼
                                   app/ml/pipeline.py (orchestrator)
                                                │
        ┌───────────────┬───────────────┬──────┴────────┬────────────────┬─────────────────┐
        ▼               ▼               ▼               ▼                ▼                 ▼
 expenditure_    cost_overrun.py  delay_detector.py  payment_       duplicate_        geo_anomaly.py
 anomaly.py                                          behavior.py    detector.py
        │               │               │               │                │                 │
        └───────────────┴───────────────┴───────┬───────┴────────────────┴─────────────────┘
                                                  ▼
                                     compliance_rules.py (rule engine, not ML)
                                                  ▼
                                     spending_pattern.py (time-series / clustering)
                                                  ▼
                                          risk_scorer.py (ensemble)
                                                  │
                          writes → risk_scores table (versioned by pipeline_run_id)
                          writes → alerts table (one row per fired detector rule)
                          writes → compliance_violations table
                          writes → duplicate_clusters + duplicate_cluster_members
```

**Detector methods (all synthetic-data-appropriate, explainable, no black boxes):**

| Detector | Technique | Output |
|---|---|---|
| Expenditure anomaly | Z-score / IsolationForest on `expenditure_amount` normalized within (work_category, state) peer group | 0–100 score, flags projects far outside peer norms |
| Cost overrun / estimate deviation | Cost overrun = `(expenditure_amount - sanctioned_amount) / sanctioned_amount`; Estimate deviation = `(estimated_cost - comparable_peer_benchmark) / comparable_peer_benchmark` | 0–100 score; cost overrun is based on actual expenditure exceeding sanction, while estimate deviation identifies projects whose estimated cost is unusually high compared with comparable peer projects |
| Delay | Rule: days past `expected_completion_date` with status ≠ COMPLETED; severity scales with days overdue | 0–100 score |
| Payment behavior | Feature engineering: days-between-installments, milestone-progress-vs-payment ratio, round-number bias, payments clustered near fiscal year-end → IsolationForest on the feature vector | 0–100 score |
| Duplicate/similar project | TF-IDF vectorization of `work_description` + cosine similarity (threshold ≥0.85) combined with haversine distance (≤500m) between projects in same district; union-find clustering | Cluster membership + similarity score |
| Geographic anomaly | DBSCAN on (lat, lng) per state to find abnormally dense clusters; containment check against constituency boundary polygon where available | Cluster + score |
| Compliance | Deterministic rule engine evaluating each project against `compliance_rules` (fund cap, permissible work list, UC filing deadline, sanction-to-recommendation gap, jurisdiction match) | Violation records, not a score per se — feeds into risk as a fixed penalty |
| Spending pattern | Per-MP time series of monthly expenditure; flags fiscal-year-end spending spikes (>2x monthly average in March) via rolling z-score | 0–100 score |

### Cost Metrics Definitions

The system distinguishes between actual cost overrun and estimate deviation.

**Cost Overrun**

Measures whether actual expenditure has exceeded the sanctioned amount.

Formula:

`cost_overrun_pct = (expenditure_amount - sanctioned_amount) / sanctioned_amount`

Example:

Sanctioned amount = ₹10 lakh  
Expenditure = ₹12 lakh  
Cost overrun = 20%.

**Estimate Deviation**

Measures whether the estimated project cost is unusually high compared with comparable projects.

Formula:

`estimate_deviation_pct = (estimated_cost - comparable_peer_benchmark) / comparable_peer_benchmark`

The comparable peer benchmark should be calculated from similar projects using dimensions such as:

- work category
- state
- district
- project type
- project scale

A project can therefore have:

- high estimate deviation but no actual cost overrun yet, or
- actual cost overrun even when its original estimate was reasonable.

Both signals should remain independently visible in the Project Investigation page.

**Feature engineering (`features.py`)** builds one wide feature table per project (joins projects + payments aggregates + vendor stats + peer-group benchmarks) that every detector reads from — this is what keeps the 8 detectors consistent and fast to iterate on independently.

---

## 10. Risk Scoring Methodology

1. Each detector outputs a **sub-score 0–100** (already normalized in-detector; e.g. IsolationForest anomaly scores are min-max scaled per run).
2. Sub-scores are combined via a **weighted ensemble**:

```
risk_score = 
    0.20 * delay_score +
    0.15 * cost_overrun_score +
    0.15 * payment_behavior_score +
    0.15 * expenditure_anomaly_score +
    0.15 * compliance_score +
    0.10 * duplicate_score +
    0.05 * geo_anomaly_score +
    0.05 * spending_pattern_score
```

Weights live in `app/core/config.py` as named constants — tunable without touching detector code, and **the weights, not the raw formula, are what you'd tweak live during a judge Q&A** to show the system is configurable.

3. **Risk level thresholds:** `LOW: 0–29`, `MEDIUM: 30–54`, `HIGH: 55–74`, `CRITICAL: 75–100`.
4. **Explainability:** the top 2–3 contributing components (by weighted contribution) are stored as `top_factors` on the project and expanded into the full `contributing_factors_json` for the Investigation page's risk breakdown — this is what makes the tool feel like a real audit aid rather than a black-box score.
5. Every pipeline run is versioned (`pipeline_run_id`); old rows are kept with `is_latest = 0` so a "risk score history" chart is possible on the Investigation page with zero extra schema work later.

---

## 11. Frontend Page Structure & Routing

```
/                          → redirect to /dashboard
/dashboard                 → Executive Dashboard        [Dev 2]
/projects                  → Projects (searchable table + filters)   [Dev 2]
/projects/:id              → redirects to /investigation/:id (single detail experience)
/map                       → Map Intelligence            [Dev 2]
/alerts                    → AI Alerts                   [Dev 3]
/alerts/:id                → Alert detail drawer/panel   [Dev 3]
/investigation/:id         → Project Investigation       [Dev 3]
/analytics                 → Analytics                   [Dev 3]
/early-warning             → Early Warning               [Dev 3]
/compliance                → Compliance                  [Dev 3]
/demo                      → Demo Scenarios              [Dev 3]
```

Routing rule:

`/projects/:id` is a convenience route from the Projects table.
It must redirect immediately to `/investigation/:id`.

The user-facing detailed project experience exists only at
`/investigation/:id`.

Backend:
- `GET /projects/{project_id}` returns the canonical Project object.
- `GET /investigation/{project_id}` returns the full investigation/case-file view.

The frontend may call both APIs, but there must be only one detailed
project investigation screen.

Dev 2:
Owns the Projects list and `/projects/:id` redirect behavior.

Dev 3:
Owns `/investigation/:id` and the detailed project investigation experience.

Dev 2 owns `router.tsx`, `layout/Sidebar.tsx`, `layout/Topbar.tsx`, and the global `RiskPill`, `KpiCard`, `Badge` components used across all pages — Dev 3's pages import these rather than re-implementing them, so the app looks like one product.

---

## 12. API Versioning & Change Control

- All routes are prefixed `/api/v1`. A breaking change (removing a field, renaming a key, changing a type) requires either (a) an additive-only fix if possible, or (b) bumping to `/api/v2` for that specific router only.
- Adding new optional fields to a response is **not** a breaking change and doesn't require a version bump.
- Any schema change to §5, §7, or §8 must be announced in the team channel and this file updated in the same PR — the PR description must say what changed and why.
- Dev 1 regenerates `backend/openapi_export.json` on every schema change (`python -m app.export_openapi`); Dev 2/3 run `npx openapi-typescript openapi_export.json -o src/types/generated.ts` to stay in sync instead of hand-editing types.

---

## 13. Integration Rules Between the Three Developers

1. **Contract-first, not backend-first.** This document + `shared/types.ts` are written and agreed on Day 0, before any feature code. Nobody waits on anybody else to start.
2. **Dev 1 ships mock fixtures on Day 1**, not just live endpoints: static JSON files under `backend/data_pipeline/seed_data/` and mirrored under `frontend/src/mocks/fixtures/`, matching §7 exactly. Dev 2 and Dev 3 wire up **MSW (Mock Service Worker)** so the whole frontend runs and demos correctly even if the FastAPI server is down or mid-change.
3. **No cross-editing.** Dev 2 never edits Dev 3's page folders and vice versa; both only edit `layout/` and `components/` via PR review since those are shared.
4. **Backend changes are additive by default.** Dev 1 does not remove or rename a field once Dev 2/3 have started consuming it without a heads-up + this doc updated in the same PR (§12).
5. **CORS is open (`allow_origins=["*"]`) for the hackathon** — no auth friction between the three dev servers running on different ports.
6. **Env-driven base URL.** Frontend reads `VITE_API_BASE_URL` from `.env`; defaults to `http://localhost:8000/api/v1`, so Dev 2/3 can point at Dev 1's laptop, a teammate's laptop, or MSW mocks by just flipping an env flag (`VITE_USE_MOCKS=true`).
7. **IDs are strings everywhere**, never numeric auto-increment exposed to the frontend (`project_id`, `alert_id`, etc. are all human-readable prefixed strings per §3) — this avoids off-by-one/type bugs and makes demo data readable in the UI itself.
8. **Dates are ISO 8601 strings** (`YYYY-MM-DD` for dates, full ISO timestamp with `Z` for datetimes) on the wire, always. Currency is always a raw number in ₹ (no formatting, no strings) — frontend formats for display.
9. **Daily 10-minute sync** (or async standup message) covering: any schema fields added/changed, any new endpoint ready, any blocker. Given only 3 people and a hackathon timeline, this replaces heavier process.
10. **Git branching:** `dev1/*`, `dev2/*`, `dev3/*` feature branches → PR into `main`. `shared/types.ts` and this `ARCHITECTURE.md` require a second person's approval to merge changes to them, since both other devs depend on them.

---

## 14. Demo Scenarios (for the judges)

Each scenario is a small, deliberately-seeded story in the synthetic dataset, surfaced through `/demo/scenarios`. Recommend 5 for a hackathon demo — enough to show range without dragging:

| Scenario ID | Title | What it demonstrates |
|---|---|---|
| `ghost-project` | The Ghost Project | Full expenditure & payments recorded, but no completion report and GPS coordinates that don't match the claimed village — expenditure anomaly + compliance violation together |
| `copy-paste-contractor` | The Copy-Paste Contractor | 3 "different" projects across 2 states with near-identical work descriptions and the same vendor — duplicate detection |
| `election-rush` | The Election-Season Rush | A visible spike in sanctions and expenditure in the 60 days before a known election date, most with incomplete UC filings — spending pattern + compliance |
| `serial-delayer` | The Serial Delayer | One executing agency responsible for a disproportionate share of the state's delayed projects — early warning + analytics (vendor/agency-level aggregation) |
| `quiet-overrun` | The Quiet Overrun | A project where expenditure creeps past sanctioned amount in small increments across many small "released" updates rather than one obvious jump — cost overrun detector catching what a human skim would miss |

`POST /demo/scenarios/{id}/activate` simply returns a `navigate_to` route + implicitly the data is already seeded with these patterns baked in from `synthetic_generator.py` (deterministic seed, e.g. `numpy.random.seed(26102)`) — no runtime data mutation needed, so the demo is 100% reproducible and safe to replay for multiple judges back-to-back.

---

## 15. Definition of Done (per developer, for hackathon judging readiness)

- **Dev 1:** all endpoints in §7 return real data from SQLite (not hardcoded), `POST /pipeline/run` visibly changes `risk_scores`/`alerts` when re-run, OpenAPI docs live at `/docs`.
- **Dev 2:** Dashboard, Projects, Map all render from live API (not mocks) with loading/empty/error states handled per §6's error envelope.
- **Dev 3:** Alerts, Investigation, Analytics, Early Warning, Compliance, Demo Scenarios all render from live API; Investigation page visibly shows the risk breakdown explanation (§10 point 4) — this is the single highest-impact screen for judges evaluating "is this real AI or a hardcoded demo."
