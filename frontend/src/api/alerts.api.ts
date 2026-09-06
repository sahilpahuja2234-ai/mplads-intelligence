import { apiFetch } from './client';
import { Alert, Paginated, AlertStatus } from '@shared/types';

export async function getAlerts(params?: Record<string, string>): Promise<Paginated<Alert>> {
  const query = new URLSearchParams(params).toString();
  return apiFetch<Paginated<Alert>>(`/alerts${query ? `?${query}` : ''}`);
}

export async function getAlertDetail(alertId: string): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${alertId}`);
}

export async function updateAlertStatus(alertId: string, status: AlertStatus, remarks?: string): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${alertId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, remarks }),
  });
}

export async function getAlertsSummary() {
  return apiFetch<{
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  }>('/alerts/summary');
}
