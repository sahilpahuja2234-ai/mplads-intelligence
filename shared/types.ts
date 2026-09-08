// shared/types.ts
// Frozen contract — see ARCHITECTURE.md §8 (SIH 2026 | Problem ID 26102)
// Any change to this file requires a second-person approval per §13 rule 10.

// ==== Enums ====
export type House = "LOK_SABHA" | "RAJYA_SABHA" | "NOMINATED";
export type ProjectStatus =
  | "RECOMMENDED"
  | "SANCTIONED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "ABANDONED"
  | "ON_HOLD";
export type WorkCategory =
  | "DRINKING_WATER"
  | "EDUCATION"
  | "HEALTH"
  | "ROADS"
  | "IRRIGATION"
  | "ELECTRICITY"
  | "SANITATION"
  | "SPORTS"
  | "RAILWAYS"
  | "PUBLIC_INFRASTRUCTURE"
  | "COMMUNITY_HALLS"
  | "DISASTER_RELIEF"
  | "OTHER";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertType =
  | "EXPENDITURE_ANOMALY"
  | "COST_OVERRUN"
  | "DELAY"
  | "PAYMENT_ANOMALY"
  | "DUPLICATE_PROJECT"
  | "GEOGRAPHIC_ANOMALY"
  | "COMPLIANCE_VIOLATION"
  | "SPENDING_PATTERN";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "DISMISSED"
  | "ESCALATED";
export type ComplianceCategory =
  | "FUND_LIMIT"
  | "PERMISSIBLE_WORK"
  | "TIMELINE"
  | "UTILIZATION_CERTIFICATE"
  | "SANCTION_PROCESS"
  | "GEOGRAPHIC_JURISDICTION";

// ==== Envelopes ====
export interface Paginated<T> {
  data: T[];
  meta: { page: number; page_size: number; total_items: number; total_pages: number };
}
export interface ApiError {
  error: { code: string; message: string };
}

// ==== Core (from §8) ====
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

// ==== Additional response shapes for §7 endpoints (additive, not in §8) ====

/** GET /dashboard/trends */
export interface TrendPoint {
  label: string;               // e.g. "2025-10"
  sanctioned_amount: number;
  expenditure_amount: number;
  new_alerts: number;
}
export interface DashboardTrends {
  period: string;
  points: TrendPoint[];
}

/** GET /dashboard/state-comparison */
export interface StateComparisonRow {
  state: string;
  total_projects: number;
  utilization_pct: number;
  avg_risk_score: number;
  critical_count: number;
}
export interface StateComparison {
  states: StateComparisonRow[];
}

/** GET /map/clusters */
export interface MapCluster {
  cluster_id: string;
  centroid: { latitude: number; longitude: number };
  radius_meters: number;
  project_count: number;
  reason: string;
  project_ids: string[];
}
export interface MapClustersResponse {
  clusters: MapCluster[];
}

/** GET /map/state-summary */
export interface MapStateSummaryRow {
  state: string;
  total_projects: number;
  avg_risk_score: number;
  total_sanctioned_amount: number;
}
export interface MapStateSummaryResponse {
  states: MapStateSummaryRow[];
}

/** GET /map/projects */
export interface MapProjectsResponse {
  points: MapPoint[];
  total_returned: number;
}

/** GET /projects/filters/meta */
export interface FiltersMeta {
  states: string[];
  work_categories: WorkCategory[];
  statuses: ProjectStatus[];
  risk_levels: RiskLevel[];
}

/** Shorthand for a single component row inside RiskBreakdown.components[] */
export type RiskComponent = RiskBreakdown['components'][number];

/** Single payment installment from GET /projects/:id/payments */
export interface PaymentItem {
  payment_id: string;
  installment_no: number;
  amount: number;
  payment_date: string;
  payment_mode: string | null;
  milestone_reached_pct: number | null;
  flagged: boolean;
}

/** Single event from GET /projects/:id/timeline */
export interface TimelineEvent {
  event: string;
  date: string;
  note: string | null;
}

