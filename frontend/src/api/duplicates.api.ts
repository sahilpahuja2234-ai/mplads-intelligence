import { apiFetch } from './client';
import { DuplicateCluster, Paginated } from '@shared/types';
export async function getDuplicates(params?: Record<string, string>): Promise<Paginated<DuplicateCluster>> {
    const query = new URLSearchParams(params).toString();
    return apiFetch<Paginated<DuplicateCluster>>(`/duplicates${query ? `?${query}` : ''}`);
}
export async function getDuplicateDetail(clusterId: string): Promise<DuplicateCluster> {
    return apiFetch<DuplicateCluster>(`/duplicates/${clusterId}`);
}
