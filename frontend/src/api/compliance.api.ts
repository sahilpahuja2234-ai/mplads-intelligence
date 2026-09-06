import { apiFetch } from './client';
import { ComplianceViolation, Paginated } from '@shared/types';

export interface ComplianceRule {
  rule_id: string;
  category: string;
  title: string;
  description: string;
  severity_if_violated: string;
}

export async function getComplianceRules() {
  return apiFetch<{ rules: ComplianceRule[] }>('/compliance/rules');
}

export async function getComplianceViolations(params?: Record<string, string>): Promise<Paginated<ComplianceViolation>> {
  const query = new URLSearchParams(params).toString();
  return apiFetch<Paginated<ComplianceViolation>>(`/compliance/violations${query ? `?${query}` : ''}`);
}

export async function getComplianceSummary() {
  return apiFetch<{
    by_category: Record<string, number>;
    total_open: number;
    total_resolved: number;
  }>('/compliance/summary');
}

export async function getProjectComplianceChecklist(projectId: string) {
  return apiFetch<{
    project_id: string;
    checklist: { rule_id: string; title: string; status: 'PASS' | 'VIOLATED' | 'PENDING' }[];
  }>(`/compliance/${projectId}/checklist`);
}
