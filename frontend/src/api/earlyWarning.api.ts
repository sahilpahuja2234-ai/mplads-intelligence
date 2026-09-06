import { apiFetch } from './client';
import { EarlyWarningPrediction, Paginated } from '@shared/types';
export async function getPredictions(params?: Record<string, string>): Promise<Paginated<EarlyWarningPrediction>> {
    const query = new URLSearchParams(params).toString();
    return apiFetch<Paginated<EarlyWarningPrediction>>(`/early-warning/predictions${query ? `?${query}` : ''}`);
}
export async function getForecast(projectId: string) {
    return apiFetch<{
        project_id: string;
        prediction_type: string;
        probability: number;
        expected_completion_forecast: string;
        original_expected_completion: string;
        drivers: { feature: string; contribution: number }[];
    }>(`/early-warning/${projectId}/forecast`);
}
