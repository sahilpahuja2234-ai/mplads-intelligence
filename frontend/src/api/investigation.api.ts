import { apiFetch } from './client';
import { Project, RiskBreakdown, Alert, ComplianceViolation, ProjectSummary, PaymentItem, TimelineEvent } from '@shared/types';

export interface InvestigationData {
  project: Project;
  risk_breakdown: RiskBreakdown;
  open_alerts: Alert[];
  compliance_violations: ComplianceViolation[];
  related_projects: {
    same_vendor: ProjectSummary[];
    same_mp: ProjectSummary[];
    same_constituency: ProjectSummary[];
  };
  duplicate_cluster: {
    cluster_id: string;
    similarity_score: number;
    cluster_reason: "TEXT_SIMILARITY" | "GEO_PROXIMITY" | "BOTH";
    member_count: number;
    members?: ProjectSummary[];
  } | null;
}

export async function getInvestigation(projectId: string): Promise<InvestigationData> {
  return apiFetch<InvestigationData>(`/investigation/${projectId}`);
}

export async function getRiskBreakdown(projectId: string): Promise<RiskBreakdown> {
  return apiFetch<RiskBreakdown>(`/investigation/${projectId}/risk-breakdown`);
}

export async function getRelatedProjects(projectId: string, relation: 'vendor' | 'mp' | 'constituency'): Promise<{ relation: string; projects: ProjectSummary[] }> {
  return apiFetch<{ relation: string; projects: ProjectSummary[] }>(`/investigation/${projectId}/related-projects?relation=${relation}`);
}

export async function getProjectPayments(projectId: string): Promise<{ project_id: string; payments: PaymentItem[] }> {
  return apiFetch<{ project_id: string; payments: PaymentItem[] }>(`/projects/${projectId}/payments`);
}

export async function getProjectTimeline(projectId: string): Promise<{ project_id: string; events: TimelineEvent[] }> {
  return apiFetch<{ project_id: string; events: TimelineEvent[] }>(`/projects/${projectId}/timeline`);
}

export async function addInvestigationNote(projectId: string, note: { author: string; note: string }) {
  return apiFetch<{ note_id: string; created_at: string }>(`/investigation/${projectId}/notes`, {
    method: 'POST',
    body: JSON.stringify(note),
  });
}
