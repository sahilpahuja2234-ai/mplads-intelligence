"""
synthetic_generator.py
=======================================================================
MPLADS Intelligence — Reproducible SYNTHETIC Dataset Generator
Owner: Dev 1 (Backend)

*** THIS SCRIPT PRODUCES SYNTHETIC DEMO DATA ONLY. ***
No real Members of Parliament, vendors, agencies, villages, projects,
or payments are represented. All names are fictionally generated from
generic name-part pools. States/districts are real Indian geographic
labels (needed for a realistic map/dashboard demo); everything else
attached to them — people, businesses, transactions, coordinates — is
invented by this script for SIH 2026 (Problem ID 26102) demo purposes.

Contract compliance
--------------------
Every column emitted here matches ARCHITECTURE.md §3 (Database Schema)
and §4 (Canonical Enums) verbatim. This script does not invent new
columns, rename existing ones, or change enum values. Where the task
brief asked for a field that does not exist in the frozen schema
(e.g. "project_name", "completion_percentage", "payment_count"), that
field is intentionally OMITTED here and left to be derived downstream:

    requested field          -> how it's actually obtained
    -----------------------  -------------------------------------------
    project_name             -> there is no such column; the canonical
                                 identifier is `project_id`, and the
                                 human-readable label is `work_description`
    description               -> `work_description`
    completion_percentage    -> derived at query time from
                                 (expenditure_amount / sanctioned_amount)
                                 or from payments.milestone_reached_pct —
                                 not stored redundantly on `projects`
    payment_count             -> COUNT(*) on `payments` grouped by
                                 project_id — not stored on `projects`

Reproducibility
----------------
A single fixed seed (26102 — the SIH Problem ID, also the seed named
in ARCHITECTURE.md §14) drives every random draw via
`numpy.random.default_rng(SEED)` plus `random.seed(SEED)` for the
stdlib `random` calls. Re-running this script produces byte-identical
CSVs every time.

Outputs (written to ./seed_data/, matching ARCHITECTURE.md §1 exactly
for the four listed files; three extra small files are additive-only
per §13 rule 4 and are called out below):

    mps.csv                  -> `mps` table                 (§3, listed)
    vendors.csv               -> `vendors` table              (§3, listed)
    projects.csv              -> `projects` table (10,000+)   (§3, listed)
    payments.csv               -> `payments` table             (§3, listed)
    constituencies.csv        -> `constituencies` table  [ADDITIVE: needed
                                  because projects.constituency_id is a
                                  real FK in the frozen schema]
    demo_scenarios.json       -> `demo_scenarios` table  [ADDITIVE: feeds
                                  /demo/scenarios exactly per §14 + §7.11]
    README.md                 -> synthetic-data notice + provenance
                                  [ADDITIVE: schema has no is_synthetic
                                  column, so the label lives here instead
                                  of mutating a frozen table]

Run:
    python synthetic_generator.py
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# ===========================================================================
# 0. CONFIG — fixed seed, output paths, reference "as of" date
# ===========================================================================

SEED = 26102  # SIH Problem ID — also the seed named in ARCHITECTURE.md §14
N_BASE_PROJECTS = 10_000  # baseline population before duplicate/flagship rows
OUTPUT_DIR = Path(__file__).resolve().parent / "seed_data"

# "Today" for computing delays/status/utilization — matches the reference
# timestamps used throughout ARCHITECTURE.md (e.g. §7.1 last_pipeline_run,
# §7.3 dashboard example dates all sit in 2026).
TODAY = date(2026, 9, 4)

# Fixed synthetic reference date used only to construct the "election-rush"
# demo scenario (§14). Not tied to any real election.
ELECTION_DATE = date(2024, 4, 19)

rng = np.random.default_rng(SEED)
random.seed(SEED)

# ===========================================================================
# 1. CANONICAL ENUMS — copied verbatim from ARCHITECTURE.md §4
# ===========================================================================

HOUSES = ["LOK_SABHA", "RAJYA_SABHA", "NOMINATED"]
HOUSE_WEIGHTS = [0.78, 0.17, 0.05]

WORK_CATEGORIES = [
    "DRINKING_WATER", "EDUCATION", "HEALTH", "ROADS", "IRRIGATION",
    "ELECTRICITY", "SANITATION", "SPORTS", "RAILWAYS",
    "PUBLIC_INFRASTRUCTURE", "COMMUNITY_HALLS", "DISASTER_RELIEF", "OTHER",
]
WORK_CATEGORY_WEIGHTS = [
    0.14, 0.13, 0.09, 0.20, 0.09, 0.08, 0.08, 0.05, 0.02, 0.06, 0.04, 0.01, 0.01,
]

PROJECT_STATUSES = [
    "RECOMMENDED", "SANCTIONED", "IN_PROGRESS", "COMPLETED",
    "DELAYED", "ABANDONED", "ON_HOLD",
]

PAYMENT_MODES = ["DBT", "CHEQUE", "RTGS"]
PAYMENT_MODE_WEIGHTS = [0.70, 0.10, 0.20]

# ===========================================================================
# 2. REFERENCE POOLS (all fictional except state/district geography)
# ===========================================================================

STATE_DISTRICTS: Dict[str, List[str]] = {
    "Maharashtra": ["Nashik", "Pune", "Nagpur", "Aurangabad", "Thane", "Kolhapur"],
    "Uttar Pradesh": ["Lucknow", "Varanasi", "Kanpur Nagar", "Agra", "Meerut", "Gorakhpur"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Murshidabad", "Nadia"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    "Karnataka": ["Bengaluru Urban", "Mysuru", "Belagavi", "Hubballi-Dharwad", "Mangaluru"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
    "Punjab": ["Amritsar", "Ludhiana", "Jalandhar", "Patiala"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Karnal"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Puri", "Sambalpur"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Korba"],
}

STATE_CODES: Dict[str, str] = {
    "Maharashtra": "MH", "Uttar Pradesh": "UP", "Bihar": "BR", "West Bengal": "WB",
    "Tamil Nadu": "TN", "Karnataka": "KA", "Rajasthan": "RJ", "Gujarat": "GJ",
    "Madhya Pradesh": "MP", "Andhra Pradesh": "AP", "Telangana": "TG",
    "Kerala": "KL", "Punjab": "PB", "Haryana": "HR", "Odisha": "OD",
    "Assam": "AS", "Jharkhand": "JH", "Chhattisgarh": "CG",
}

# Approximate real state centroids (lat, lng) — used only to jitter
# plausible-looking coordinates for the map demo. Not precise boundaries.
STATE_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "Maharashtra": (19.75, 75.71), "Uttar Pradesh": (26.85, 80.95),
    "Bihar": (25.10, 85.31), "West Bengal": (22.99, 87.86),
    "Tamil Nadu": (11.13, 78.66), "Karnataka": (15.32, 75.71),
    "Rajasthan": (27.02, 74.22), "Gujarat": (22.26, 71.19),
    "Madhya Pradesh": (22.97, 78.66), "Andhra Pradesh": (15.91, 79.74),
    "Telangana": (18.11, 79.02), "Kerala": (10.85, 76.27),
    "Punjab": (31.15, 75.34), "Haryana": (29.06, 76.09),
    "Odisha": (20.95, 85.10), "Assam": (26.20, 92.94),
    "Jharkhand": (23.61, 85.28), "Chhattisgarh": (21.28, 81.87),
}

STATES = list(STATE_DISTRICTS.keys())

TITLES = ["Shri", "Smt.", "Dr.", "Er."]
FIRST_NAMES = [
    "Ramesh", "Suresh", "Anita", "Deepak", "Meena", "Sanjay", "Kavita", "Vijay",
    "Pooja", "Manoj", "Rekha", "Ashok", "Sunita", "Rajesh", "Geeta", "Vikram",
    "Nisha", "Arun", "Shalini", "Prakash", "Farhan", "Imran", "Ayesha", "Kiran",
    "Bharti", "Naveen", "Lata", "Mahesh", "Usha", "Ravindra", "Seema", "Anil",
]
LAST_NAMES = [
    "Sharma", "Verma", "Patil", "Reddy", "Nair", "Iyer", "Singh", "Yadav",
    "Chauhan", "Mehta", "Joshi", "Kulkarni", "Gupta", "Naidu", "Rao", "Desai",
    "Pillai", "Choudhary", "Bhat", "Menon", "Thakur", "Pandey", "Shaikh", "Khan",
]
FICTIONAL_PARTIES = [
    "Bharat Nirman Morcha", "Jan Kalyan Party", "Pragatishil Manch",
    "Rashtriya Vikas Dal", "Loktantrik Ekta Party", "Independent",
]

VENDOR_PREFIX = [
    "Shree Sai", "Om", "Ganesh", "Bharat", "Jai Bharat", "Krishna", "Laxmi",
    "Vishwakarma", "New Age", "Sundar", "Divya", "Shakti", "Star", "Metro",
    "National", "United", "Prime", "Elite", "Reliable", "Trust", "Ananya",
    "Green Valley", "Silver Line", "Golden",
]
VENDOR_SUFFIX = [
    "Constructions", "Infra Projects", "Builders", "Engineering Works",
    "Contractors", "Enterprises", "Infrastructure Ltd", "Associates",
    "Works & Co", "Developers",
]

AGENCY_TEMPLATES = [
    "{district} Zilla Parishad",
    "{district} Municipal Corporation",
    "PWD {district} Division",
    "{district} Rural Development Agency",
    "{district} Panchayati Raj Department",
    "Cantonment Board {district}",
    "{state} Housing Board — {district} Circle",
]

VILLAGE_PREFIX = [
    "Deolali", "Rampur", "Shivpuri", "Ganeshpur", "Lakshmipur", "Chandpur",
    "Manpur", "Sundarpur", "Ravipur", "Devpur", "Hanumangarh", "Krishnanagar",
    "Vijaynagar", "Ambedkar Nagar", "Gandhi Nagar", "Bhagwanpur", "Nehru Nagar",
    "Kisanpur", "Anandpur", "Fatehpur",
]
VILLAGE_SUFFIX = ["", " Gram Panchayat", " village", " hamlet", " block"]

SCHOOL_LEVELS = ["Primary", "Upper Primary", "Secondary", "Senior Secondary"]

WORK_TEMPLATES: Dict[str, List[str]] = {
    "DRINKING_WATER": [
        "Installation of {n} solar-powered borewell hand pumps in {village}",
        "Construction of overhead water tank ({cap} KL capacity) at {village}",
        "Laying of {km} km drinking water supply pipeline in {village}",
    ],
    "EDUCATION": [
        "Construction of {n} additional classrooms at Government {level} School, {village}",
        "Renovation of school building and toilets at Government School, {village}",
        "Provision of furniture and computer lab to Government School, {village}",
    ],
    "HEALTH": [
        "Upgradation of Primary Health Centre, {village}",
        "Purchase of ambulance for {village} block",
        "Construction of sub-health centre building at {village}",
    ],
    "ROADS": [
        "Construction of {km} km cement concrete road from {village} to {village2}",
        "Widening and strengthening of village road at {village}",
        "Construction of bridge/culvert on approach road to {village}",
    ],
    "IRRIGATION": [
        "Construction of check dam near {village}",
        "Renovation of irrigation canal serving {village} farmers",
        "Installation of community lift irrigation scheme at {village}",
    ],
    "ELECTRICITY": [
        "Solar street lighting installation ({n} poles) in {village}",
        "Rural electrification of {village} hamlet",
        "Transformer capacity augmentation at {village} substation",
    ],
    "SANITATION": [
        "Construction of {n} community toilet complexes in {village}",
        "Solid waste management unit at {village}",
        "Construction of underground drainage system in {village}",
    ],
    "SPORTS": [
        "Construction of village sports ground/stadium at {village}",
        "Provision of sports equipment to youth club, {village}",
        "Construction of open gymnasium at {village} community park",
    ],
    "RAILWAYS": [
        "Construction of railway station approach road at {village}",
        "Passenger amenities upgrade at {village} railway halt",
    ],
    "PUBLIC_INFRASTRUCTURE": [
        "Construction of public library at {village}",
        "Renovation of panchayat bhawan at {village}",
        "Construction of bus shelter/stand at {village}",
    ],
    "COMMUNITY_HALLS": [
        "Construction of community hall at {village}",
        "Renovation of marriage hall at {village} Gram Panchayat",
    ],
    "DISASTER_RELIEF": [
        "Flood-relief infrastructure repair at {village}",
        "Construction of raised flood shelter platform at {village}",
    ],
    "OTHER": [
        "Miscellaneous public welfare work at {village} as recommended by MP",
        "Development work under MPLADS at {village}",
    ],
}

# Typical (min, max) sanctioned amount in INR per work category.
AMOUNT_RANGES: Dict[str, Tuple[int, int]] = {
    "DRINKING_WATER": (300_000, 2_500_000),
    "EDUCATION": (500_000, 3_000_000),
    "HEALTH": (800_000, 4_000_000),
    "ROADS": (1_000_000, 6_000_000),
    "IRRIGATION": (800_000, 5_000_000),
    "ELECTRICITY": (300_000, 2_000_000),
    "SANITATION": (300_000, 1_500_000),
    "SPORTS": (500_000, 2_500_000),
    "RAILWAYS": (500_000, 3_000_000),
    "PUBLIC_INFRASTRUCTURE": (400_000, 2_500_000),
    "COMMUNITY_HALLS": (500_000, 2_000_000),
    "DISASTER_RELIEF": (300_000, 3_000_000),
    "OTHER": (200_000, 1_500_000),
}

# Typical execution duration in days (min, max) per work category.
DURATION_RANGES: Dict[str, Tuple[int, int]] = {
    "DRINKING_WATER": (90, 240), "EDUCATION": (120, 300), "HEALTH": (150, 400),
    "ROADS": (150, 450), "IRRIGATION": (150, 400), "ELECTRICITY": (60, 180),
    "SANITATION": (60, 200), "SPORTS": (120, 300), "RAILWAYS": (180, 400),
    "PUBLIC_INFRASTRUCTURE": (90, 270), "COMMUNITY_HALLS": (90, 240),
    "DISASTER_RELIEF": (30, 150), "OTHER": (60, 240),
}


def _choice(pool: List, weights: Optional[List[float]] = None):
    if weights:
        return pool[rng.choice(len(pool), p=weights)]
    return pool[rng.integers(0, len(pool))]


def village_name() -> str:
    return f"{_choice(VILLAGE_PREFIX)}{_choice(VILLAGE_SUFFIX)}"


def make_work_description(category: str) -> str:
    template = _choice(WORK_TEMPLATES[category])
    return template.format(
        n=int(rng.integers(2, 10)),
        cap=int(_choice([20, 30, 50, 75, 100])),
        km=round(float(rng.uniform(0.5, 5.0)), 1),
        village=village_name(),
        village2=village_name(),
        level=_choice(SCHOOL_LEVELS),
    )


def make_vendor_name() -> str:
    return f"{_choice(VENDOR_PREFIX)} {_choice(VENDOR_SUFFIX)}"


def make_agency_name(state: str, district: str) -> str:
    template = _choice(AGENCY_TEMPLATES)
    return template.format(district=district, state=state)


def make_mp_name() -> str:
    return f"{_choice(TITLES)} {_choice(FIRST_NAMES)} {_choice(LAST_NAMES)}"


def jitter_coords(state: str, spread: float = 1.1) -> Tuple[float, float]:
    lat0, lng0 = STATE_CENTROIDS[state]
    lat = lat0 + float(rng.uniform(-spread, spread))
    lng = lng0 + float(rng.uniform(-spread, spread))
    return round(lat, 6), round(lng, 6)


def random_date(start: date, end: date) -> date:
    delta = (end - start).days
    if delta <= 0:
        return start
    return start + timedelta(days=int(rng.integers(0, delta + 1)))


# ===========================================================================
# 3. MPs
# ===========================================================================

def generate_mps(n_mps: int = 300) -> pd.DataFrame:
    rows = []
    # distribute MPs across states weighted by district count (proxy for size)
    weights = np.array([len(STATE_DISTRICTS[s]) for s in STATES], dtype=float)
    weights /= weights.sum()
    state_counts = rng.multinomial(n_mps, weights)

    seq_by_state: Dict[str, int] = {s: 0 for s in STATES}
    for state, count in zip(STATES, state_counts):
        districts = STATE_DISTRICTS[state]
        for _ in range(count):
            seq_by_state[state] += 1
            mp_id = f"MP-{STATE_CODES[state]}-{seq_by_state[state]:03d}"
            house = _choice(HOUSES, HOUSE_WEIGHTS)
            has_constituency = house == "LOK_SABHA"
            district = _choice(districts)
            constituency = f"{district}" if has_constituency else None
            term_start_year = int(_choice([2019, 2024]))
            term_start = date(term_start_year, 6, 1)
            term_end = date(term_start_year + 5, 5, 31)
            rows.append({
                "mp_id": mp_id,
                "name": make_mp_name(),
                "house": house,
                "state": state,
                "constituency": constituency,
                "_district": district,  # internal only, dropped before CSV export
                "party": _choice(FICTIONAL_PARTIES),
                "term_start": term_start.isoformat(),
                "term_end": term_end.isoformat(),
            })
    return pd.DataFrame(rows)


# ===========================================================================
# 4. Constituencies (derived 1:1 from LOK_SABHA MPs — ADDITIVE file, needed
#    for the projects.constituency_id FK in the frozen schema)
# ===========================================================================

def generate_constituencies(mps_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    ls_mps = mps_df[mps_df["house"] == "LOK_SABHA"].reset_index(drop=True)
    seq_by_state: Dict[str, int] = {s: 0 for s in STATES}
    constituency_id_by_mp: Dict[str, str] = {}
    for _, mp in ls_mps.iterrows():
        state = mp["state"]
        seq_by_state[state] += 1
        cid = f"PC-{STATE_CODES[state]}-{seq_by_state[state]:03d}"
        lat, lng = jitter_coords(state, spread=0.8)
        rows.append({
            "constituency_id": cid,
            "name": mp["constituency"],
            "state": state,
            "district": mp["_district"],
            "centroid_lat": lat,
            "centroid_lng": lng,
            "boundary_geojson": None,
        })
        constituency_id_by_mp[mp["mp_id"]] = cid
    return pd.DataFrame(rows), constituency_id_by_mp


# ===========================================================================
# 5. Vendors
# ===========================================================================

def generate_vendors(n_vendors: int = 900, n_power_vendors: int = 18) -> pd.DataFrame:
    rows = []
    for i in range(1, n_vendors + 1):
        state = _choice(STATES)
        rows.append({
            "vendor_id": f"VEN-{i:05d}",
            "name": make_vendor_name(),
            "registration_no": f"REG-{STATE_CODES[state]}-{int(rng.integers(100000, 999999))}",
            "state": state,
            "total_projects_handled": 0,  # filled in after projects are generated
            "flagged_before": False,       # filled in after anomaly injection
        })
    df = pd.DataFrame(rows)
    # "Power vendors" get a disproportionate share of projects later on —
    # picked deterministically as the first N ids after the seeded shuffle.
    power_vendor_ids = list(rng.choice(df["vendor_id"], size=n_power_vendors, replace=False))
    return df, power_vendor_ids


# ===========================================================================
# 6. Base projects
# ===========================================================================

@dataclass
class AnomalyTags:
    cost_overrun: List[int] = field(default_factory=list)
    high_expenditure: List[int] = field(default_factory=list)
    delayed_severe: List[int] = field(default_factory=list)
    geo_cluster: List[int] = field(default_factory=list)
    quiet_overrun: List[int] = field(default_factory=list)
    election_rush: List[int] = field(default_factory=list)
    payment_spike: List[int] = field(default_factory=list)
    bad_agency_project_ids: List[str] = field(default_factory=list)
    bad_agency_name: Optional[str] = None
    bad_agency_state: Optional[str] = None
    bad_vendor_ids: List[str] = field(default_factory=list)


def pick_status_and_dates(start_date: date, category: str):
    """Runs the project lifecycle forward to TODAY and returns
    (status, expected_completion, actual_completion, progress_fraction)."""
    dmin, dmax = DURATION_RANGES[category]
    duration = int(rng.integers(dmin, dmax + 1))
    expected_completion = start_date + timedelta(days=duration)

    if start_date > TODAY:
        return "SANCTIONED", expected_completion, None, 0.0

    elapsed = (TODAY - start_date).days
    progress_fraction = min(1.0, elapsed / duration) if duration > 0 else 1.0

    if TODAY < expected_completion:
        r = rng.random()
        if r < 0.90:
            status = "IN_PROGRESS"
        elif r < 0.96:
            status = "ON_HOLD"
        else:
            status = "ABANDONED"
        return status, expected_completion, None, progress_fraction

    # past expected completion
    r = rng.random()
    if r < 0.68:
        status = "COMPLETED"
        actual = expected_completion + timedelta(days=int(rng.integers(-30, 90)))
        actual = min(actual, TODAY)
        return status, expected_completion, actual, 1.0
    elif r < 0.93:
        return "DELAYED", expected_completion, None, progress_fraction
    else:
        return "ABANDONED", expected_completion, None, progress_fraction


def generate_base_projects(
    mps_df: pd.DataFrame,
    constituency_id_by_mp: Dict[str, str],
    vendors_df: pd.DataFrame,
    power_vendor_ids: List[str],
    n_projects: int,
) -> List[dict]:
    projects = []
    vendor_ids = vendors_df["vendor_id"].tolist()
    normal_vendor_ids = [v for v in vendor_ids if v not in power_vendor_ids]

    # 55% of projects go to the 18 "power vendors", 45% spread across the rest —
    # this alone creates realistic vendor concentration for analytics/serial
    # patterns, on top of the explicit misbehavior injection later.
    vendor_pool_choice = rng.random(n_projects) < 0.55

    seq_by_state: Dict[str, int] = {s: 0 for s in STATES}
    mps_by_state: Dict[str, pd.DataFrame] = {s: mps_df[mps_df["state"] == s] for s in STATES}

    for i in range(n_projects):
        state = _choice(STATES)
        mp_row = mps_by_state[state].iloc[int(rng.integers(0, len(mps_by_state[state])))]
        mp_id = mp_row["mp_id"]
        mp_home_district = mp_row["_district"]
        district = mp_home_district if rng.random() < 0.9 else _choice(STATE_DISTRICTS[state])
        constituency_id = constituency_id_by_mp.get(mp_id)  # None for RS/NOMINATED

        category = _choice(WORK_CATEGORIES, WORK_CATEGORY_WEIGHTS)
        lo, hi = AMOUNT_RANGES[category]
        sanctioned_amount = float(rng.integers(lo, hi))
        estimated_cost = round(sanctioned_amount * float(rng.uniform(0.95, 1.10)), 2)

        vendor_id = (
            _choice(power_vendor_ids) if vendor_pool_choice[i] else _choice(normal_vendor_ids)
        )

        project_year = int(_choice([2019, 2020, 2021, 2022, 2023, 2024, 2025],
                                    [0.08, 0.09, 0.10, 0.13, 0.18, 0.22, 0.20]))
        recommended_date = random_date(date(project_year, 4, 1), date(project_year, 12, 28))
        sanction_date = recommended_date + timedelta(days=int(rng.integers(15, 90)))
        start_date = sanction_date + timedelta(days=int(rng.integers(10, 120)))

        status, expected_completion, actual_completion, progress = pick_status_and_dates(
            start_date, category
        )

        if status in ("RECOMMENDED", "SANCTIONED") or start_date > TODAY:
            released_amount = 0.0
        elif status == "COMPLETED":
            released_amount = round(sanctioned_amount * float(rng.uniform(0.95, 1.0)), 2)
        elif status == "DELAYED":
            released_amount = round(sanctioned_amount * float(rng.uniform(0.4, 0.95)), 2)
        elif status == "ABANDONED":
            released_amount = round(sanctioned_amount * float(rng.uniform(0.1, 0.5)), 2)
        elif status == "ON_HOLD":
            released_amount = round(sanctioned_amount * float(rng.uniform(0.1, 0.6)), 2)
        else:  # IN_PROGRESS
            released_amount = round(sanctioned_amount * min(0.95, max(0.05, progress)) *
                                     float(rng.uniform(0.7, 1.05)), 2)

        expenditure_amount = round(released_amount * float(rng.uniform(0.85, 1.0)), 2)

        if status == "COMPLETED":
            days_since_completion = (TODAY - actual_completion).days if actual_completion else 0
            ucf_prob = 0.85 if days_since_completion > 180 else 0.35
            utilization_certificate_filed = bool(rng.random() < ucf_prob)
        else:
            utilization_certificate_filed = False

        lat, lng = jitter_coords(state)

        seq_by_state[state] += 1
        project_id = f"MPLADS-{STATE_CODES[state]}-{project_year}-{seq_by_state[state]:05d}"

        implementing_agency = make_agency_name(state, district)
        executing_agency = make_agency_name(state, district)

        projects.append({
            "project_id": project_id,
            "mp_id": mp_id,
            "constituency_id": constituency_id,
            "state": state,
            "district": district,
            "latitude": lat,
            "longitude": lng,
            "work_category": category,
            "work_description": make_work_description(category),
            "implementing_agency": implementing_agency,
            "executing_agency": executing_agency,
            "vendor_id": vendor_id,
            "sanctioned_amount": sanctioned_amount,
            "estimated_cost": estimated_cost,
            "released_amount": released_amount,
            "expenditure_amount": expenditure_amount,
            "recommended_date": recommended_date.isoformat(),
            "sanction_date": sanction_date.isoformat(),
            "start_date": start_date.isoformat() if start_date <= TODAY else None,
            "expected_completion_date": expected_completion.isoformat(),
            "actual_completion_date": actual_completion.isoformat() if actual_completion else None,
            "status": status,
            "utilization_certificate_filed": utilization_certificate_filed,
            "created_at": recommended_date.isoformat() + "T09:00:00Z",
            "updated_at": TODAY.isoformat() + "T04:00:00Z",
        })

    return projects


# ===========================================================================
# 7. Anomaly injection (operates on the in-memory list of project dicts)
# ===========================================================================

def disjoint_sample(pool_indices: List[int], k: int, used: set) -> List[int]:
    available = [i for i in pool_indices if i not in used]
    rng.shuffle(available)
    chosen = available[:k]
    used.update(chosen)
    return chosen


def inject_cost_overruns(projects: List[dict], used: set, frac: float = 0.03) -> List[int]:
    n = int(len(projects) * frac)
    idx = disjoint_sample(range(len(projects)), n, used)
    for i in idx:
        p = projects[i]
        overrun_mult = float(rng.uniform(1.15, 1.60))
        p["expenditure_amount"] = round(p["sanctioned_amount"] * overrun_mult, 2)
        p["released_amount"] = round(max(p["released_amount"], p["expenditure_amount"] * float(rng.uniform(1.0, 1.05))), 2)
    return idx


def inject_high_expenditure_outliers(projects: List[dict], used: set, frac: float = 0.02) -> List[int]:
    # peer benchmark = mean expenditure within (work_category, state)
    df = pd.DataFrame(projects)
    peer_avg = df.groupby(["work_category", "state"])["expenditure_amount"].transform("mean")
    idx_pool = list(range(len(projects)))
    n = int(len(projects) * frac)
    idx = disjoint_sample(idx_pool, n, used)
    for i in idx:
        p = projects[i]
        benchmark = float(peer_avg.iloc[i]) if peer_avg.iloc[i] > 0 else p["sanctioned_amount"]
        p["expenditure_amount"] = round(benchmark * float(rng.uniform(3.0, 6.0)), 2)
        p["released_amount"] = round(max(p["released_amount"], p["expenditure_amount"]), 2)
    return idx


def inject_delays(projects: List[dict], used: set, frac: float = 0.06) -> List[int]:
    eligible = [i for i, p in enumerate(projects) if p["status"] not in ("COMPLETED", "ABANDONED")]
    n = int(len(projects) * frac)
    idx = disjoint_sample(eligible, n, used)
    for i in idx:
        p = projects[i]
        p["status"] = "DELAYED"
        p["actual_completion_date"] = None
        overdue_days = int(rng.integers(120, 620))
        new_expected = TODAY - timedelta(days=overdue_days)
        p["expected_completion_date"] = new_expected.isoformat()
        p["released_amount"] = round(p["sanctioned_amount"] * float(rng.uniform(0.4, 0.9)), 2)
        p["expenditure_amount"] = round(p["released_amount"] * float(rng.uniform(0.6, 0.95)), 2)
        p["utilization_certificate_filed"] = False
    return idx


def inject_geo_clusters(projects: List[dict], used: set, n_clusters: int = 6) -> List[int]:
    touched: List[int] = []
    for _ in range(n_clusters):
        state = _choice(STATES)
        hotspot_lat, hotspot_lng = jitter_coords(state, spread=0.9)
        cluster_size = int(rng.integers(6, 11))
        state_indices = [i for i, p in enumerate(projects) if p["state"] == state]
        idx = disjoint_sample(state_indices, cluster_size, used)
        for i in idx:
            # ~120m radius: ~0.0011 degrees latitude/longitude
            dlat = float(rng.uniform(-0.0011, 0.0011))
            dlng = float(rng.uniform(-0.0011, 0.0011))
            projects[i]["latitude"] = round(hotspot_lat + dlat, 6)
            projects[i]["longitude"] = round(hotspot_lng + dlng, 6)
        touched.extend(idx)
    return touched


def inject_quiet_overrun_tags(projects: List[dict], used: set, frac: float = 0.02) -> List[int]:
    n = int(len(projects) * frac)
    eligible = [i for i, p in enumerate(projects) if p["status"] in ("IN_PROGRESS", "COMPLETED", "DELAYED")]
    idx = disjoint_sample(eligible, n, used)
    return idx  # actual payment-level creep is built during payment generation


def inject_election_rush_tags(projects: List[dict], used: set, frac: float = 0.03) -> List[int]:
    n = int(len(projects) * frac)
    idx = disjoint_sample(range(len(projects)), n, used)
    window_start = ELECTION_DATE - timedelta(days=60)
    window_end = ELECTION_DATE - timedelta(days=1)
    for i in idx:
        p = projects[i]
        new_sanction = random_date(window_start, window_end)
        new_start = new_sanction + timedelta(days=int(rng.integers(3, 15)))
        p["sanction_date"] = new_sanction.isoformat()
        p["recommended_date"] = (new_sanction - timedelta(days=int(rng.integers(10, 40)))).isoformat()
        p["start_date"] = new_start.isoformat() if new_start <= TODAY else None
        p["utilization_certificate_filed"] = False
    return idx


def inject_payment_spike_tags(projects: List[dict], used: set, frac: float = 0.025) -> List[int]:
    n = int(len(projects) * frac)
    eligible = [i for i, p in enumerate(projects) if p["released_amount"] > 0]
    idx = disjoint_sample(eligible, n, used)
    return idx  # realized during payment generation


def inject_vendor_agency_misbehavior(
    projects: List[dict], delayed_idx: List[int], bad_vendor_ids: List[str],
) -> Tuple[List[str], str, str]:
    """Concentrates a disproportionate share of delayed projects onto a
    small number of agencies/vendors per the 'serial-delayer' pattern."""
    bad_agency_state = _choice(STATES)
    bad_agency_name = f"{_choice(STATE_DISTRICTS[bad_agency_state])} Rural Development Agency (Special Cell)"

    state_delayed = [i for i in delayed_idx if projects[i]["state"] == bad_agency_state]
    # also pull in some already-delayed-by-baseline-logic projects in that state
    state_delayed += [
        i for i, p in enumerate(projects)
        if p["state"] == bad_agency_state and p["status"] == "DELAYED" and i not in state_delayed
    ]
    reassign_n = max(8, int(len(state_delayed) * 0.6))
    reassign_idx = list(dict.fromkeys(state_delayed))[:reassign_n]

    touched_project_ids = []
    for i in reassign_idx:
        projects[i]["executing_agency"] = bad_agency_name
        projects[i]["vendor_id"] = _choice(bad_vendor_ids)
        touched_project_ids.append(projects[i]["project_id"])

    return touched_project_ids, bad_agency_name, bad_agency_state


# ===========================================================================
# 8. Duplicate / near-duplicate project injection (appends NEW rows)
# ===========================================================================

def inject_duplicates(
    projects: List[dict], used: set, next_seq_by_state: Dict[str, int],
    n_clusters: int = 80,
) -> List[dict]:
    new_rows = []
    candidates = [i for i in range(len(projects)) if i not in used]
    rng.shuffle(candidates)
    anchors = candidates[:n_clusters]

    for anchor_i in anchors:
        anchor = projects[anchor_i]
        n_members = int(rng.integers(1, 3))  # 1 or 2 extra near-duplicates
        for _ in range(n_members):
            clone = dict(anchor)
            # near-identical description, tiny cost variance, same vendor,
            # short time offset — same district (classic split-billing pattern)
            clone_state = anchor["state"]
            next_seq_by_state[clone_state] += 1
            year = anchor["sanction_date"][:4]
            clone["project_id"] = f"MPLADS-{STATE_CODES[clone_state]}-{year}-{next_seq_by_state[clone_state]:05d}"
            clone["sanctioned_amount"] = round(anchor["sanctioned_amount"] * float(rng.uniform(0.92, 1.08)), 2)
            clone["estimated_cost"] = round(clone["sanctioned_amount"] * float(rng.uniform(0.97, 1.05)), 2)
            clone["released_amount"] = round(clone["sanctioned_amount"] * float(rng.uniform(0.5, 1.0)), 2)
            clone["expenditure_amount"] = round(clone["released_amount"] * float(rng.uniform(0.85, 1.0)), 2)
            offset_days = int(rng.integers(3, 45))
            clone["sanction_date"] = (date.fromisoformat(anchor["sanction_date"]) + timedelta(days=offset_days)).isoformat()
            new_rows.append(clone)
    return new_rows


# ===========================================================================
# 9. Flagship demo-scenario rows (deterministic, guaranteed-crisp examples)
# ===========================================================================

def build_flagship_scenarios(
    projects: List[dict], next_seq_by_state: Dict[str, int], power_vendor_ids: List[str],
    tags: AnomalyTags, mps_df: pd.DataFrame,
) -> Dict[str, dict]:
    """Appends a handful of hand-crafted rows so each of the 5 §14 demo
    scenarios has at least one unambiguous, guaranteed-reproducible example,
    on top of the broader randomly-injected anomaly pools used for ML
    training/detection at scale."""
    scenario_ids: Dict[str, dict] = {}
    flagship_rows: List[dict] = []

    def any_mp_id(state_name: str) -> str:
        pool = mps_df.loc[mps_df["state"] == state_name, "mp_id"].tolist()
        return _choice(pool)

    # ---- 1. ghost-project ----------------------------------------------
    state = "Bihar"
    district = "Gaya"
    next_seq_by_state[state] += 1
    pid = f"MPLADS-{STATE_CODES[state]}-2024-{next_seq_by_state[state]:05d}"
    sanctioned = 1_800_000.0
    ghost = {
        "project_id": pid, "mp_id": any_mp_id(state), "constituency_id": None,
        "state": state, "district": district,
        "latitude": 28.6139, "longitude": 77.2090,  # deliberately mismatched coordinates
        "work_category": "DRINKING_WATER",
        "work_description": f"Installation of solar-powered borewell hand pumps in {village_name()}",
        "implementing_agency": make_agency_name(state, district),
        "executing_agency": make_agency_name(state, district),
        "vendor_id": _choice(power_vendor_ids),
        "sanctioned_amount": sanctioned, "estimated_cost": sanctioned * 1.02,
        "released_amount": sanctioned, "expenditure_amount": sanctioned * 0.98,
        "recommended_date": "2024-01-10", "sanction_date": "2024-02-05",
        "start_date": "2024-03-01", "expected_completion_date": "2024-09-01",
        "actual_completion_date": None, "status": "IN_PROGRESS",
        "utilization_certificate_filed": False,
        "created_at": "2024-01-11T09:00:00Z", "updated_at": TODAY.isoformat() + "T04:00:00Z",
    }
    flagship_rows.append(ghost)
    scenario_ids["ghost-project"] = {"highlight_project_ids": [pid]}

    # ---- 2. copy-paste-contractor ---------------------------------------
    shared_vendor = _choice(power_vendor_ids)
    desc = f"Construction of {int(rng.integers(2,4))} km cement concrete road from {village_name()} to {village_name()}"
    members = []
    for s in ["Maharashtra", "Madhya Pradesh"]:
        d = _choice(STATE_DISTRICTS[s])
        for _ in range(1 if s == "Madhya Pradesh" else 2):
            next_seq_by_state[s] += 1
            year = "2023"
            cid = f"MPLADS-{STATE_CODES[s]}-{year}-{next_seq_by_state[s]:05d}"
            amt = round(2_400_000 * float(rng.uniform(0.97, 1.03)), 2)
            lat, lng = jitter_coords(s)
            row = {
                "project_id": cid, "mp_id": any_mp_id(s), "constituency_id": None,
                "state": s, "district": d, "latitude": lat, "longitude": lng,
                "work_category": "ROADS", "work_description": desc,
                "implementing_agency": make_agency_name(s, d),
                "executing_agency": make_agency_name(s, d),
                "vendor_id": shared_vendor,
                "sanctioned_amount": amt, "estimated_cost": amt * 1.03,
                "released_amount": amt * 0.9, "expenditure_amount": amt * 0.85,
                "recommended_date": "2023-05-01", "sanction_date": "2023-06-01",
                "start_date": "2023-07-01", "expected_completion_date": "2024-01-01",
                "actual_completion_date": None, "status": "IN_PROGRESS",
                "utilization_certificate_filed": False,
                "created_at": "2023-05-02T09:00:00Z", "updated_at": TODAY.isoformat() + "T04:00:00Z",
            }
            flagship_rows.append(row)
            members.append(cid)
    scenario_ids["copy-paste-contractor"] = {"highlight_project_ids": members}

    # ---- 3. quiet-overrun -------------------------------------------------
    state = "Karnataka"
    district = "Mysuru"
    next_seq_by_state[state] += 1
    pid = f"MPLADS-{STATE_CODES[state]}-2022-{next_seq_by_state[state]:05d}"
    sanctioned = 3_000_000.0
    lat, lng = jitter_coords(state)
    quiet = {
        "project_id": pid, "mp_id": any_mp_id(state), "constituency_id": None,
        "state": state, "district": district, "latitude": lat, "longitude": lng,
        "work_category": "IRRIGATION",
        "work_description": f"Renovation of irrigation canal serving {village_name()} farmers",
        "implementing_agency": make_agency_name(state, district),
        "executing_agency": make_agency_name(state, district),
        "vendor_id": _choice(power_vendor_ids),
        "sanctioned_amount": sanctioned, "estimated_cost": sanctioned * 1.01,
        "released_amount": sanctioned * 1.12, "expenditure_amount": sanctioned * 1.12,
        "recommended_date": "2022-04-01", "sanction_date": "2022-05-01",
        "start_date": "2022-06-01", "expected_completion_date": "2023-06-01",
        "actual_completion_date": "2023-08-15", "status": "COMPLETED",
        "utilization_certificate_filed": True,
        "created_at": "2022-04-02T09:00:00Z", "updated_at": TODAY.isoformat() + "T04:00:00Z",
    }
    flagship_rows.append(quiet)
    scenario_ids["quiet-overrun"] = {"highlight_project_ids": [pid], "_sanctioned": sanctioned}

    return scenario_ids, flagship_rows


# ===========================================================================
# 10. Payments
# ===========================================================================

def generate_payments(
    projects: List[dict], tags: AnomalyTags, quiet_overrun_pid: Optional[str],
) -> List[dict]:
    payments = []
    seq = 1
    project_by_id = {p["project_id"]: p for p in projects}
    spike_ids = {projects[i]["project_id"] for i in tags.payment_spike}
    quiet_ids = {projects[i]["project_id"] for i in tags.quiet_overrun}
    if quiet_overrun_pid:
        quiet_ids.add(quiet_overrun_pid)
    election_ids = {projects[i]["project_id"] for i in tags.election_rush}

    for p in projects:
        released = p["released_amount"]
        if not released or released <= 0:
            continue
        start = p["start_date"]
        if not start:
            continue
        start_date_ = date.fromisoformat(start)
        pid = p["project_id"]

        if pid in quiet_ids:
            # deliberately target 105-118% of the SANCTIONED amount (not just
            # of whatever was released so far) so the cumulative creep past
            # the sanctioned ceiling is guaranteed and detectable, however
            # gradually it's disbursed.
            target = p["sanctioned_amount"] * float(rng.uniform(1.05, 1.18))
            n_install = int(rng.integers(6, 10))
            base_amt = target / n_install
            amounts = [round(base_amt * float(rng.uniform(0.9, 1.15)), 2) for _ in range(n_install)]
            gap_days = [int(rng.integers(25, 55)) for _ in range(n_install)]
        elif pid in election_ids:
            n_install = int(rng.integers(2, 4))
            props = rng.dirichlet(np.ones(n_install)) * released
            amounts = [round(a, 2) for a in props]
            gap_days = [int(rng.integers(4, 14)) for _ in range(n_install)]
        else:
            n_install = int(_choice([1, 2, 3, 4, 5, 6], [0.10, 0.25, 0.28, 0.20, 0.12, 0.05]))
            props = rng.dirichlet(np.ones(n_install) * 2) * released
            amounts = [round(a, 2) for a in props]
            gap_days = [int(rng.integers(30, 90)) for _ in range(n_install)]

        # inject a spike on one mid-sequence installment
        if pid in spike_ids and n_install >= 2:
            spike_i = int(rng.integers(1, n_install))
            amounts[spike_i] = round(amounts[spike_i] * float(rng.uniform(4.0, 8.0)), 2)
            gap_days[spike_i] = int(rng.integers(3, 10))

        cur_date = start_date_ + timedelta(days=int(rng.integers(10, 45)))
        cum_amt = 0.0
        for inst_no in range(1, n_install + 1):
            amt = amounts[inst_no - 1]
            if inst_no > 1:
                cur_date = cur_date + timedelta(days=gap_days[inst_no - 1])
            if cur_date > TODAY:
                break
            cum_amt += amt
            milestone = min(100.0, round((cum_amt / p["sanctioned_amount"]) * 100 * float(rng.uniform(0.85, 1.1)), 1))
            if pid in spike_ids and inst_no - 1 == (spike_i if pid in spike_ids and n_install >= 2 else -1):
                milestone = min(100.0, milestone * float(rng.uniform(0.3, 0.5)))  # progress barely moved
            payments.append({
                "payment_id": f"PAY-{seq:06d}",
                "project_id": pid,
                "installment_no": inst_no,
                "amount": amt,
                "payment_date": cur_date.isoformat(),
                "payment_mode": _choice(PAYMENT_MODES, PAYMENT_MODE_WEIGHTS),
                "milestone_reached_pct": milestone,
                "flagged": False,  # set later by the ML pipeline (payment_behavior.py), not here
            })
            seq += 1

        # Reconcile the project's released_amount to the amount actually
        # disbursed via its own payment records — released_amount should
        # always equal sum(payments.amount) for that project_id, since
        # payments ARE the disbursement ledger. For the quiet-overrun pool,
        # expenditure_amount is also pinned to this total: the whole point
        # of the pattern is that every released rupee got quietly spent.
        p["released_amount"] = round(cum_amt, 2)
        if pid in quiet_ids:
            p["expenditure_amount"] = round(cum_amt, 2)

    return payments


# ===========================================================================
# 11. Assembly / main
# ===========================================================================

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[synthetic_generator] seed={SEED}  as_of={TODAY.isoformat()}")

    mps_df = generate_mps(n_mps=300)
    constituencies_df, constituency_id_by_mp = generate_constituencies(mps_df)
    vendors_df, power_vendor_ids = generate_vendors(n_vendors=900, n_power_vendors=18)

    projects = generate_base_projects(
        mps_df, constituency_id_by_mp, vendors_df, power_vendor_ids, N_BASE_PROJECTS
    )

    tags = AnomalyTags()
    used: set = set()

    tags.cost_overrun = inject_cost_overruns(projects, used, frac=0.03)
    tags.high_expenditure = inject_high_expenditure_outliers(projects, used, frac=0.02)
    tags.delayed_severe = inject_delays(projects, used, frac=0.06)
    tags.geo_cluster = inject_geo_clusters(projects, used, n_clusters=6)
    tags.quiet_overrun = inject_quiet_overrun_tags(projects, used, frac=0.02)
    tags.election_rush = inject_election_rush_tags(projects, used, frac=0.03)
    tags.payment_spike = inject_payment_spike_tags(projects, used, frac=0.025)

    # pick 3 real, existing vendor rows to become the "serial-delayer" bad
    # vendors (reused rather than orphaned so vendors.csv stays consistent)
    reused_bad_vendor_ids = list(rng.choice(
        [v for v in vendors_df["vendor_id"].tolist() if v not in power_vendor_ids],
        size=3, replace=False,
    ))
    tags.bad_vendor_ids = list(reused_bad_vendor_ids)
    for vid in reused_bad_vendor_ids:
        vendors_df.loc[vendors_df["vendor_id"] == vid, "name"] = make_vendor_name()

    bad_pids, bad_agency_name, bad_agency_state = inject_vendor_agency_misbehavior(
        projects, tags.delayed_severe, reused_bad_vendor_ids
    )
    tags.bad_agency_project_ids = bad_pids
    tags.bad_agency_name = bad_agency_name
    tags.bad_agency_state = bad_agency_state

    next_seq_by_state: Dict[str, int] = {}
    for p in projects:
        s, y, n = p["project_id"].split("-")[1], p["project_id"].split("-")[2], p["project_id"].split("-")[3]
        state_name = [k for k, v in STATE_CODES.items() if v == s][0]
        next_seq_by_state[state_name] = max(next_seq_by_state.get(state_name, 0), int(n))

    duplicate_rows = inject_duplicates(projects, used, next_seq_by_state, n_clusters=80)
    # keep track of one concrete duplicate cluster for reference/logging
    projects.extend(duplicate_rows)

    scenario_meta, flagship_rows = build_flagship_scenarios(
        projects, next_seq_by_state, power_vendor_ids, tags, mps_df
    )
    projects.extend(flagship_rows)

    payments = generate_payments(projects, tags, quiet_overrun_pid=scenario_meta["quiet-overrun"]["highlight_project_ids"][0])

    # generate_payments() reconciles released_amount to the realized sum of
    # each project's own payments. For in-progress projects whose future
    # installments fall after TODAY, that can truncate released_amount below
    # the expenditure_amount set earlier — except for the pools where
    # expenditure >= released is the deliberate anomaly signal (cost
    # overrun, peer-outlier expenditure, quiet overrun), clip expenditure
    # back down so "spent more than was ever released" isn't implied by
    # accident anywhere else in the dataset.
    intentional_overrun_idx = set(tags.cost_overrun) | set(tags.high_expenditure) | set(tags.quiet_overrun)
    quiet_flagship_id = scenario_meta["quiet-overrun"]["highlight_project_ids"][0]
    for i, p in enumerate(projects):
        if i in intentional_overrun_idx or p["project_id"] == quiet_flagship_id:
            continue
        if p["expenditure_amount"] > p["released_amount"]:
            p["expenditure_amount"] = p["released_amount"]

    # ---- election-rush / serial-delayer highlight ids ---------------------
    election_pids = sorted({projects[i]["project_id"] for i in tags.election_rush})[:5]
    scenario_meta["election-rush"] = {"highlight_project_ids": election_pids}
    scenario_meta["serial-delayer"] = {"highlight_project_ids": sorted(bad_pids)[:6]}

    # ---- finalize vendors: total_projects_handled + flagged_before --------
    projects_df = pd.DataFrame(projects)
    vendor_counts = projects_df["vendor_id"].value_counts()
    vendors_df["total_projects_handled"] = vendors_df["vendor_id"].map(vendor_counts).fillna(0).astype(int)

    flagged_vendor_ids = set(tags.bad_vendor_ids)
    # vendors heavily represented in cost-overrun/high-expenditure/payment-spike pools
    anomalous_indices = set(tags.cost_overrun) | set(tags.high_expenditure) | set(tags.payment_spike)
    anomalous_vendor_counts = pd.Series(
        [projects[i]["vendor_id"] for i in anomalous_indices if projects[i]["vendor_id"]]
    ).value_counts()
    flagged_vendor_ids |= set(anomalous_vendor_counts[anomalous_vendor_counts >= 3].index)
    vendors_df["flagged_before"] = vendors_df["vendor_id"].isin(flagged_vendor_ids)

    # ---- drop internal-only helper columns before export -------------------
    mps_export = mps_df.drop(columns=["_district"]).copy()

    projects_df = pd.DataFrame(projects)  # rebuild after all appends
    project_columns = [
        "project_id", "mp_id", "constituency_id", "state", "district",
        "latitude", "longitude", "work_category", "work_description",
        "implementing_agency", "executing_agency", "vendor_id",
        "sanctioned_amount", "estimated_cost", "released_amount",
        "expenditure_amount", "recommended_date", "sanction_date",
        "start_date", "expected_completion_date", "actual_completion_date",
        "status", "utilization_certificate_filed", "created_at", "updated_at",
    ]
    projects_df = projects_df[project_columns]

    payments_df = pd.DataFrame(payments)[
        ["payment_id", "project_id", "installment_no", "amount", "payment_date",
         "payment_mode", "milestone_reached_pct", "flagged"]
    ]

    # ---- write CSVs ----------------------------------------------------
    mps_export.to_csv(OUTPUT_DIR / "mps.csv", index=False)
    constituencies_df.to_csv(OUTPUT_DIR / "constituencies.csv", index=False)
    vendors_df.to_csv(OUTPUT_DIR / "vendors.csv", index=False)
    projects_df.to_csv(OUTPUT_DIR / "projects.csv", index=False)
    payments_df.to_csv(OUTPUT_DIR / "payments.csv", index=False)

    # ---- demo_scenarios.json --------------------------------------------
    demo_scenarios = [
        {
            "scenario_id": "ghost-project",
            "title": "The Ghost Project",
            "narrative": (
                "A sanctioned drinking-water project shows full expenditure and "
                "payment recorded, but no completion report has been filed and "
                "its GPS coordinates do not match the claimed village."
            ),
            "highlight_project_ids": scenario_meta["ghost-project"]["highlight_project_ids"],
        },
        {
            "scenario_id": "copy-paste-contractor",
            "title": "The Copy-Paste Contractor",
            "narrative": (
                "Three 'different' road projects across two states share a "
                "near-identical work description and the same vendor."
            ),
            "highlight_project_ids": scenario_meta["copy-paste-contractor"]["highlight_project_ids"],
        },
        {
            "scenario_id": "election-rush",
            "title": "The Election-Season Rush",
            "narrative": (
                "A visible spike in sanctions and expenditure in the 60 days "
                "before a known election date, most with incomplete utilization "
                "certificate filings."
            ),
            "highlight_project_ids": scenario_meta["election-rush"]["highlight_project_ids"],
        },
        {
            "scenario_id": "serial-delayer",
            "title": "The Serial Delayer",
            "narrative": (
                f"One executing agency ({bad_agency_name}) is responsible for a "
                "disproportionate share of delayed projects in its state."
            ),
            "highlight_project_ids": scenario_meta["serial-delayer"]["highlight_project_ids"],
        },
        {
            "scenario_id": "quiet-overrun",
            "title": "The Quiet Overrun",
            "narrative": (
                "A project's expenditure creeps past its sanctioned amount in "
                "small increments across many small 'released' updates rather "
                "than one obvious jump."
            ),
            "highlight_project_ids": scenario_meta["quiet-overrun"]["highlight_project_ids"],
        },
    ]
    with open(OUTPUT_DIR / "demo_scenarios.json", "w", encoding="utf-8") as f:
        json.dump({"scenarios": demo_scenarios}, f, indent=2)

    # ---- README / synthetic-data notice ---------------------------------
    readme = f"""# Seed Data — SYNTHETIC DEMO DATA ONLY

Generated by `synthetic_generator.py` for the MPLADS Intelligence SIH 2026
project (Problem ID 26102). **None of this represents real people, vendors,
government agencies, or transactions.** MP names, vendor names, and agency
names are fictionally generated from generic name-part pools. State and
district labels are real Indian geography (needed for a realistic map demo);
everything attached to them is invented.

- Fixed random seed: `{SEED}` (re-running `synthetic_generator.py` reproduces
  these files byte-for-byte)
- Generated as-of date: `{TODAY.isoformat()}`
- Total projects: `{len(projects_df)}`
- Total payments: `{len(payments_df)}`

## Files
| File | Table | Notes |
|---|---|---|
| `mps.csv` | `mps` | |
| `constituencies.csv` | `constituencies` | derived 1:1 from LOK_SABHA MPs |
| `vendors.csv` | `vendors` | includes 18 "power vendors" with concentrated project shares |
| `projects.csv` | `projects` | ≥10,000 rows, ~14% carry an injected anomaly |
| `payments.csv` | `payments` | `flagged` is left `False` — set later by `app/ml/detectors/payment_behavior.py` |
| `demo_scenarios.json` | `demo_scenarios` | the 5 canonical scenarios from ARCHITECTURE.md §14, with real `highlight_project_ids` |

## Injected anomaly patterns (see ARCHITECTURE.md §9/§14)
- Cost overruns (single large expenditure jump past sanctioned amount)
- Unusually high expenditure vs. (work_category, state) peer group
- Delayed projects (severe overdue, forced past baseline lifecycle logic)
- Duplicate/near-identical projects (same vendor, near-identical description)
- Geographically suspicious clusters (many projects within ~120m, different MPs)
- Unusual vendor/agency concentration (one agency owns most delays in a state)
- Abnormal spending velocity: "quiet overrun" (many small increments) and
  "election rush" (sanctions/expenditure clustered before a fixed election date)
- Sudden payment spikes (one installment 4-8x normal with minimal milestone progress)
"""
    with open(OUTPUT_DIR / "README.md", "w", encoding="utf-8") as f:
        f.write(readme)

    # ---- console summary --------------------------------------------------
    print(f"mps:            {len(mps_export):>6}")
    print(f"constituencies: {len(constituencies_df):>6}")
    print(f"vendors:        {len(vendors_df):>6}  (flagged_before={int(vendors_df['flagged_before'].sum())})")
    print(f"projects:       {len(projects_df):>6}")
    print(f"payments:       {len(payments_df):>6}")
    print("--- injected anomaly counts (disjoint pools) ---")
    print(f"cost_overrun:            {len(tags.cost_overrun)}")
    print(f"high_expenditure_outlier:{len(tags.high_expenditure)}")
    print(f"delayed_severe:          {len(tags.delayed_severe)}")
    print(f"geo_cluster_members:     {len(tags.geo_cluster)}")
    print(f"quiet_overrun_tagged:    {len(tags.quiet_overrun)}")
    print(f"election_rush_tagged:    {len(tags.election_rush)}")
    print(f"payment_spike_tagged:    {len(tags.payment_spike)}")
    print(f"duplicate_rows_appended: {len(duplicate_rows)}")
    print(f"serial_delayer_projects: {len(bad_pids)}  (agency={bad_agency_name}, state={bad_agency_state})")
    print(f"Wrote seed_data to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()