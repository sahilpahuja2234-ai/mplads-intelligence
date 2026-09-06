import { apiFetch } from './client';
import { DemoScenario } from '@shared/types';
export async function getDemoScenarios() {
    return apiFetch<{ scenarios: DemoScenario[] }>('/demo/scenarios');
}
export async function activateDemoScenario(scenarioId: string) {
    return apiFetch<{ scenario_id: string; activated: boolean; navigate_to: string }>(`/demo/scenarios/${scenarioId}/activate`, {
        method: 'POST',
        body: JSON.stringify({}),
    });
}
export async function resetDemo() {
    return apiFetch<{ reset: boolean }>('/demo/reset', { method: 'POST' });
}
