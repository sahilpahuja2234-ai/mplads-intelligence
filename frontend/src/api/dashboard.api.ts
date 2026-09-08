import { apiFetch } from './client';
import {
    DashboardSummary,
    DashboardTrends,
    StateComparison,
    ProjectSummary,
} from '@shared/types';

export function getDashboardSummary(): Promise<DashboardSummary> {
    return apiFetch<DashboardSummary>('/dashboard/summary');
}

export function getDashboardTrends(
    period: string = 'monthly',
    months: number = 12
): Promise<DashboardTrends> {
    return apiFetch<DashboardTrends>(`/dashboard/trends?period=${period}&months=${months}`);
}

export function getDashboardStateComparison(): Promise<StateComparison> {
    return apiFetch<StateComparison>('/dashboard/state-comparison');
}

export function getTopRiskyProjects(limit: number = 10): Promise<ProjectSummary[]> {
    return apiFetch<ProjectSummary[]>(`/dashboard/top-risky-projects?limit=${limit}`);
}
