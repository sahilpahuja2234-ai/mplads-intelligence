import { apiFetch } from './client';
export async function getExpenditureDistribution() {
    return apiFetch<{ buckets: { range: string; count: number }[] }>('/analytics/expenditure-distribution');
}
export async function getCategoryBreakdown() {
    return apiFetch<{ categories: { work_category: string; project_count: number; total_amount: number; avg_risk_score: number }[] }>('/analytics/category-breakdown');
}
export async function getVendorAnalysis(minProjects = 3) {
    return apiFetch<{ vendors: { vendor_id: string; name: string; project_count: number; total_amount: number; avg_risk_score: number; flagged_project_count: number }[] }>(`/analytics/vendor-analysis?min_projects=${minProjects}`);
}
export async function getMpPerformance() {
    return apiFetch<{ mps: { mp_id: string; name: string; utilization_pct: number; avg_completion_delay_days: number; avg_risk_score: number; total_projects: number }[] }>('/analytics/mp-performance');
}
export async function getCorrelation(x = 'cost_overrun', y = 'delay') {
    return apiFetch<{ x_field: string; y_field: string; points: { project_id: string; x: number; y: number }[]; correlation_coefficient: number }>(`/analytics/correlation?x=${x}&y=${y}`);
}
