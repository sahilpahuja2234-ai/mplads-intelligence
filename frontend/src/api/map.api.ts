import { apiFetch } from './client';
import { MapProjectsResponse, MapClustersResponse, MapStateSummaryResponse } from '@shared/types';

export interface MapProjectsFilters {
    state?: string;
    status?: string;
    risk_level?: string;
    work_category?: string;
}

export function getMapProjects(filters: MapProjectsFilters = {}): Promise<MapProjectsResponse> {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch<MapProjectsResponse>(`/map/projects${query ? `?${query}` : ''}`);
}

export function getMapClusters(): Promise<MapClustersResponse> {
    return apiFetch<MapClustersResponse>('/map/clusters');
}

export function getMapStateSummary(): Promise<MapStateSummaryResponse> {
    return apiFetch<MapStateSummaryResponse>('/map/state-summary');
}
