import { apiFetch } from './client';
import { Paginated, Project, ProjectSummary, FiltersMeta } from '@shared/types';

export interface ProjectsQueryParams {
    page?: number;
    page_size?: number;
    search?: string;
    state?: string;
    status?: string;
    work_category?: string;
    risk_level?: string;
    mp_id?: string;
    min_amount?: number;
    max_amount?: number;
    sort_by?: 'sanctioned_amount' | 'risk_score' | 'created_at';
    sort_order?: 'asc' | 'desc';
}

export function getProjects(params: ProjectsQueryParams = {}): Promise<Paginated<ProjectSummary>> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
    });
    const query = qs.toString();
    return apiFetch<Paginated<ProjectSummary>>(`/projects${query ? `?${query}` : ''}`);
}

export function getProject(id: string): Promise<Project> {
    return apiFetch<Project>(`/projects/${id}`);
}

export function getFiltersMeta(): Promise<FiltersMeta> {
    return apiFetch<FiltersMeta>('/projects/filters/meta');
}
