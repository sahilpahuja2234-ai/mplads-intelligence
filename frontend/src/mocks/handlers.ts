import { http, HttpResponse } from 'msw';
import defaultInvestigation from './fixtures/investigation_MPLADS-MH-2023-04521.json';
import dashboardSummary from './fixtures/dashboard_summary.json';
import dashboardTrends from './fixtures/dashboard_trends.json';
import dashboardStateComparison from './fixtures/dashboard_state_comparison.json';
import projectsList from './fixtures/projects_list.json';
import mapProjects from './fixtures/map_projects.json';
import mapClusters from './fixtures/map_clusters.json';
import mapStateSummary from './fixtures/map_state_summary.json';

const BASE = 'http://localhost:8000/api/v1';

// ── Top-risky-projects derived data ────────────────────────────────────────
// Sort the projects list descending by risk_score, take top 10
const topRiskyProjects = [...projectsList]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 10);

// ── Filters meta derived from fixtures ─────────────────────────────────────
const filtersMeta = {
    states: [...new Set(projectsList.map((p) => p.state))].sort(),
    work_categories: [
        'DRINKING_WATER', 'EDUCATION', 'HEALTH', 'ROADS', 'IRRIGATION',
        'ELECTRICITY', 'SANITATION', 'SPORTS', 'RAILWAYS',
        'PUBLIC_INFRASTRUCTURE', 'COMMUNITY_HALLS', 'DISASTER_RELIEF', 'OTHER',
    ],
    statuses: [
        'RECOMMENDED', 'SANCTIONED', 'IN_PROGRESS', 'COMPLETED',
        'DELAYED', 'ABANDONED', 'ON_HOLD',
    ],
    risk_levels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
};

export const handlers = [
    // ── Health ────────────────────────────────────────────────────────────
    http.get(`${BASE}/health`, () => {
        return HttpResponse.json({ status: 'ok', db: 'connected', last_pipeline_run: '2026-09-04T02:00:00Z' });
    }),

    // ── Dashboard (Dev 2) ─────────────────────────────────────────────────
    http.get(`${BASE}/dashboard/summary`, () => {
        return HttpResponse.json(dashboardSummary);
    }),

    http.get(`${BASE}/dashboard/trends`, () => {
        return HttpResponse.json(dashboardTrends);
    }),

    http.get(`${BASE}/dashboard/state-comparison`, () => {
        return HttpResponse.json(dashboardStateComparison);
    }),

    http.get(`${BASE}/dashboard/top-risky-projects`, () => {
        return HttpResponse.json(topRiskyProjects);
    }),

    // ── Projects (Dev 2) ──────────────────────────────────────────────────
    // filters/meta must come BEFORE the :id pattern to avoid being swallowed
    http.get(`${BASE}/projects/filters/meta`, () => {
        return HttpResponse.json(filtersMeta);
    }),

    http.get(`${BASE}/projects`, ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') ?? '1', 10);
        const pageSize = parseInt(url.searchParams.get('page_size') ?? '20', 10);
        const search = (url.searchParams.get('search') ?? '').toLowerCase();
        const stateFilter = url.searchParams.get('state') ?? '';
        const statusFilter = url.searchParams.get('status') ?? '';
        const categoryFilter = url.searchParams.get('work_category') ?? '';
        const riskFilter = url.searchParams.get('risk_level') ?? '';
        const sortBy = url.searchParams.get('sort_by') ?? '';
        const sortOrder = url.searchParams.get('sort_order') ?? 'desc';
        const minAmount = parseFloat(url.searchParams.get('min_amount') ?? '0');
        const maxAmount = parseFloat(url.searchParams.get('max_amount') ?? 'Infinity');

        // Apply filters
        let filtered = [...projectsList] as typeof projectsList;

        if (search) {
            filtered = filtered.filter(
                (p) =>
                    p.project_id.toLowerCase().includes(search) ||
                    p.mp_name.toLowerCase().includes(search) ||
                    p.state.toLowerCase().includes(search) ||
                    p.district.toLowerCase().includes(search)
            );
        }
        if (stateFilter) filtered = filtered.filter((p) => p.state === stateFilter);
        if (statusFilter) filtered = filtered.filter((p) => p.status === statusFilter);
        if (categoryFilter) filtered = filtered.filter((p) => p.work_category === categoryFilter);
        if (riskFilter) filtered = filtered.filter((p) => p.risk_level === riskFilter);
        if (minAmount > 0) filtered = filtered.filter((p) => p.sanctioned_amount >= minAmount);
        if (isFinite(maxAmount)) filtered = filtered.filter((p) => p.sanctioned_amount <= maxAmount);

        // Apply sorting
        if (sortBy === 'sanctioned_amount') {
            filtered.sort((a, b) =>
                sortOrder === 'asc'
                    ? a.sanctioned_amount - b.sanctioned_amount
                    : b.sanctioned_amount - a.sanctioned_amount
            );
        } else if (sortBy === 'risk_score') {
            filtered.sort((a, b) =>
                sortOrder === 'asc' ? a.risk_score - b.risk_score : b.risk_score - a.risk_score
            );
        } else if (sortBy === 'created_at') {
            // Proxy sort by project_id (contains year, gives a reasonable ordering)
            filtered.sort((a, b) =>
                sortOrder === 'asc'
                    ? a.project_id.localeCompare(b.project_id)
                    : b.project_id.localeCompare(a.project_id)
            );
        }

        // Paginate
        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        return HttpResponse.json({
            data,
            meta: { page, page_size: pageSize, total_items: totalItems, total_pages: totalPages },
        });
    }),

    // Project detail
    http.get(`${BASE}/projects/:id`, ({ params }) => {
        if (params.id === 'MPLADS-MH-2023-04521') {
            return HttpResponse.json(defaultInvestigation.project);
        }
        return HttpResponse.json({
            ...defaultInvestigation.project,
            project_id: params.id as string,
        });
    }),

    // Payments & Timeline
    http.get(`${BASE}/projects/:id/payments`, () => {
        return HttpResponse.json({
            project_id: 'MPLADS-MH-2023-04521',
            payments: [
                { payment_id: 'PAY-000981', installment_no: 1, amount: 400000, payment_date: '2023-04-15', payment_mode: 'DBT', milestone_reached_pct: 30, flagged: false },
                { payment_id: 'PAY-000982', installment_no: 2, amount: 780000, payment_date: '2023-04-22', payment_mode: 'DBT', milestone_reached_pct: 35, flagged: true },
            ],
        });
    }),

    http.get(`${BASE}/projects/:id/timeline`, () => {
        return HttpResponse.json({
            project_id: 'MPLADS-MH-2023-04521',
            events: [
                { event: 'RECOMMENDED', date: '2023-02-10', note: 'Recommended by MP Nashik' },
                { event: 'SANCTIONED', date: '2023-03-05', note: 'Sanction order #NSK/2023/889' },
                { event: 'PAYMENT_INSTALMENT_1', date: '2023-04-15', note: 'Installment 1 of 2 — ₹4,00,000' },
                { event: 'PAYMENT_INSTALMENT_2', date: '2023-04-22', note: 'Installment 2 of 2 — ₹7,80,000 (Flagged)' },
                { event: 'EXPECTED_COMPLETION_MISSED', date: '2023-10-01', note: 'No physical completion certificate filed' },
            ],
        });
    }),

    // ── Map (Dev 2) ───────────────────────────────────────────────────────
    http.get(`${BASE}/map/projects`, ({ request }) => {
        const url = new URL(request.url);
        const stateFilter = url.searchParams.get('state') ?? '';
        const statusFilter = url.searchParams.get('status') ?? '';
        const riskFilter = url.searchParams.get('risk_level') ?? '';
        const categoryFilter = url.searchParams.get('work_category') ?? '';

        // Join with projects_list to filter by work_category (not in MapPoint)
        let points = [...mapProjects.points];

        if (stateFilter || categoryFilter) {
            const projectIndex = new Map(projectsList.map((p) => [p.project_id, p]));
            points = points.filter((pt) => {
                const meta = projectIndex.get(pt.project_id);
                if (stateFilter && meta?.state !== stateFilter) return false;
                if (categoryFilter && meta?.work_category !== categoryFilter) return false;
                return true;
            });
        }
        if (statusFilter) points = points.filter((pt) => pt.status === statusFilter);
        if (riskFilter) points = points.filter((pt) => pt.risk_level === riskFilter);

        return HttpResponse.json({ points, total_returned: points.length });
    }),

    http.get(`${BASE}/map/clusters`, () => {
        return HttpResponse.json(mapClusters);
    }),

    http.get(`${BASE}/map/state-summary`, () => {
        return HttpResponse.json(mapStateSummary);
    }),

    // ── Investigation ─────────────────────────────────────────────────────
    http.get(`${BASE}/investigation/:id`, ({ params }) => {
        if (params.id === 'MPLADS-BR-2024-0091') {
            return HttpResponse.json({
                project: {
                    project_id: 'MPLADS-BR-2024-0091',
                    mp: { mp_id: 'MP-BR-002', name: 'Shri R. P. Singh', house: 'LOK_SABHA', state: 'Bihar', constituency: 'Patna Sahib' },
                    location: { state: 'Bihar', district: 'Patna', constituency_id: 'PC-BR-002', latitude: 25.601, longitude: 85.104 },
                    work_category: 'DRINKING_WATER',
                    work_description: 'Construction of deep tube-well community drinking water point at Kankarbagh Ward 14',
                    implementing_agency: 'Patna Municipal Corporation',
                    executing_agency: 'M/S Apex Engineering Solutions',
                    vendor: { vendor_id: 'VEN-00892', name: 'Apex Engineering Solutions' },
                    financials: { sanctioned_amount: 2500000, estimated_cost: 2500000, released_amount: 2500000, expenditure_amount: 2500000, utilization_pct: 100 },
                    timeline: { recommended_date: '2024-01-10', sanction_date: '2024-02-01', start_date: '2024-02-15', expected_completion_date: '2024-06-30', actual_completion_date: '2024-07-10' },
                    status: 'COMPLETED',
                    utilization_certificate_filed: true,
                    risk: { risk_score: 91.5, risk_level: 'CRITICAL', top_factors: ['EXPENDITURE_ANOMALY', 'DUPLICATE_PROJECT', 'GEOGRAPHIC_ANOMALY'] },
                    flags: { has_open_alerts: true, open_alert_count: 3, has_compliance_violation: true, in_duplicate_cluster: true },
                    created_at: '2024-01-10T10:00:00Z',
                    updated_at: '2026-08-25T12:00:00Z',
                },
                risk_breakdown: {
                    risk_score: 91.5,
                    risk_level: 'CRITICAL',
                    components: [
                        { factor: 'EXPENDITURE_ANOMALY', score: 98, weight: 0.15, explanation: '100% funds drawn in single lump-sum check 2 days post sanction.' },
                        { factor: 'DUPLICATE_PROJECT', score: 92, weight: 0.10, explanation: 'High text similarity (93%) with 2 other projects in same ward.' },
                        { factor: 'GEOGRAPHIC_ANOMALY', score: 88, weight: 0.05, explanation: 'GPS coordinates map to an empty residential lot with no tubewell infrastructure.' },
                        { factor: 'COMPLIANCE_VIOLATION', score: 85, weight: 0.15, explanation: 'Non-permissible private land development flagged under Rule WORK-03.' },
                        { factor: 'PAYMENT_ANOMALY', score: 80, weight: 0.15, explanation: 'Full payment disbursed without field engineer sign-off.' },
                        { factor: 'DELAY', score: 30, weight: 0.20, explanation: 'Minor completion delay of 10 days.' },
                        { factor: 'COST_OVERRUN', score: 0, weight: 0.15, explanation: 'Expenditure matches sanctioned amount.' },
                        { factor: 'SPENDING_PATTERN', score: 70, weight: 0.05, explanation: 'Pre-election release burst pattern detected.' },
                    ],
                },
                open_alerts: [
                    {
                        alert_id: 'ALT-000991',
                        project_id: 'MPLADS-BR-2024-0091',
                        alert_type: 'EXPENDITURE_ANOMALY',
                        severity: 'CRITICAL',
                        status: 'OPEN',
                        title: 'Ghost Infrastructure Suspicion',
                        description: 'Full funds expended but site audit reveals zero physical construction match at recorded GPS coordinates.',
                        detected_at: '2026-08-15T00:00:00Z',
                    },
                ],
                compliance_violations: [
                    {
                        violation_id: 'VIO-000221',
                        project_id: 'MPLADS-BR-2024-0091',
                        rule_id: 'RULE-WORK-03',
                        rule_title: 'Non-permissible work category',
                        category: 'PERMISSIBLE_WORK',
                        status: 'OPEN',
                        detected_at: '2026-07-11T00:00:00Z',
                        details: 'Project land title belongs to private commercial owner.',
                    },
                ],
                related_projects: { same_vendor: [], same_mp: [], same_constituency: [] },
                duplicate_cluster: { cluster_id: 'DUP-0012', similarity_score: 0.93, cluster_reason: 'BOTH', member_count: 3 },
            });
        }
        return HttpResponse.json({
            ...defaultInvestigation,
            project: { ...defaultInvestigation.project, project_id: params.id as string },
        });
    }),

    // ── Alerts ────────────────────────────────────────────────────────────
    http.get(`${BASE}/alerts`, () => {
        return HttpResponse.json({
            data: defaultInvestigation.open_alerts,
            meta: { page: 1, page_size: 20, total_items: 2, total_pages: 1 },
        });
    }),

    http.get(`${BASE}/alerts/summary`, () => {
        return HttpResponse.json({
            by_severity: { LOW: 90, MEDIUM: 110, HIGH: 65, CRITICAL: 22 },
            by_type: { EXPENDITURE_ANOMALY: 40, COST_OVERRUN: 55, DELAY: 88, PAYMENT_ANOMALY: 33, DUPLICATE_PROJECT: 12, GEOGRAPHIC_ANOMALY: 9, COMPLIANCE_VIOLATION: 40, SPENDING_PATTERN: 10 },
            by_status: { OPEN: 200, ACKNOWLEDGED: 40, UNDER_REVIEW: 30, RESOLVED: 12, DISMISSED: 3, ESCALATED: 2 },
        });
    }),

    // ── Compliance ────────────────────────────────────────────────────────
    http.get(`${BASE}/compliance/rules`, () => {
        return HttpResponse.json({
            rules: [
                { rule_id: 'RULE-FUND-01', category: 'FUND_LIMIT', title: 'Annual entitlement cap', description: 'Total sanctioned amount per MP per FY must not exceed ₹5 crore.', severity_if_violated: 'CRITICAL' },
                { rule_id: 'RULE-WORK-03', category: 'PERMISSIBLE_WORK', title: 'Non-permissible work category', description: 'MPLADS funds cannot be spent on private or commercial properties.', severity_if_violated: 'HIGH' },
                { rule_id: 'RULE-UC-01', category: 'UTILIZATION_CERTIFICATE', title: 'UC Submission Deadline', description: 'Utilization certificate must be filed within 12 months of release.', severity_if_violated: 'HIGH' },
            ],
        });
    }),

    http.get(`${BASE}/compliance/violations`, () => {
        return HttpResponse.json({
            data: defaultInvestigation.compliance_violations,
            meta: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
        });
    }),

    http.get(`${BASE}/compliance/summary`, () => {
        return HttpResponse.json({
            by_category: { FUND_LIMIT: 8, PERMISSIBLE_WORK: 22, TIMELINE: 31, UTILIZATION_CERTIFICATE: 25, SANCTION_PROCESS: 5, GEOGRAPHIC_JURISDICTION: 3 },
            total_open: 94,
            total_resolved: 41,
        });
    }),

    http.get(`${BASE}/compliance/:id/checklist`, ({ params }) => {
        return HttpResponse.json({
            project_id: params.id as string,
            checklist: [
                { rule_id: 'RULE-FUND-01', title: 'Annual entitlement cap', status: 'PASS' },
                { rule_id: 'RULE-WORK-03', title: 'Permissible public work verification', status: 'PASS' },
                { rule_id: 'RULE-UC-01', title: 'Utilization certificate filed within 1 year', status: 'VIOLATED' },
            ],
        });
    }),

    // ── Duplicates ────────────────────────────────────────────────────────
    http.get(`${BASE}/duplicates`, () => {
        return HttpResponse.json({
            data: [
                { cluster_id: 'DUP-0012', similarity_score: 0.93, cluster_reason: 'BOTH', member_count: 3, total_sanctioned_amount: 3600000, states_involved: ['Maharashtra', 'Bihar'] },
            ],
            meta: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
        });
    }),

    // ── Analytics ─────────────────────────────────────────────────────────
    http.get(`${BASE}/analytics/expenditure-distribution`, () => {
        return HttpResponse.json({
            buckets: [
                { range: '0-5L', count: 1200 },
                { range: '5-10L', count: 2100 },
                { range: '10-25L', count: 1400 },
                { range: '25L-50L', count: 650 },
                { range: '>50L', count: 82 },
            ],
        });
    }),

    http.get(`${BASE}/analytics/category-breakdown`, () => {
        return HttpResponse.json({
            categories: [
                { work_category: 'DRINKING_WATER', project_count: 1420, total_amount: 1775000000, avg_risk_score: 34.2 },
                { work_category: 'ROADS', project_count: 1980, total_amount: 2970000000, avg_risk_score: 28.4 },
                { work_category: 'HEALTH', project_count: 850, total_amount: 1275000000, avg_risk_score: 22.1 },
                { work_category: 'EDUCATION', project_count: 1180, total_amount: 1416000000, avg_risk_score: 19.8 },
            ],
        });
    }),

    http.get(`${BASE}/analytics/vendor-analysis`, () => {
        return HttpResponse.json({
            vendors: [
                { vendor_id: 'VEN-00231', name: 'Shree Sai Constructions', project_count: 14, total_amount: 16800000, avg_risk_score: 61.2, flagged_project_count: 6 },
                { vendor_id: 'VEN-00892', name: 'Apex Engineering Solutions', project_count: 9, total_amount: 22500000, avg_risk_score: 84.0, flagged_project_count: 7 },
            ],
        });
    }),

    http.get(`${BASE}/analytics/mp-performance`, () => {
        return HttpResponse.json({
            mps: [
                { mp_id: 'MP-MH-014', name: 'Smt. A. Deshmukh', utilization_pct: 94.4, avg_completion_delay_days: 145, avg_risk_score: 41.0, total_projects: 42 },
                { mp_id: 'MP-BR-002', name: 'Shri R. P. Singh', utilization_pct: 88.0, avg_completion_delay_days: 210, avg_risk_score: 68.5, total_projects: 38 },
            ],
        });
    }),

    http.get(`${BASE}/analytics/correlation`, () => {
        return HttpResponse.json({
            x_field: 'cost_overrun_pct',
            y_field: 'delay_days',
            points: [
                { project_id: 'MPLADS-MH-2023-04521', x: 13.6, y: 312 },
                { project_id: 'MPLADS-BR-2024-0091', x: 0, y: 10 },
            ],
            correlation_coefficient: 0.61,
        });
    }),

    // ── Early Warning ─────────────────────────────────────────────────────
    http.get(`${BASE}/early-warning/predictions`, () => {
        return HttpResponse.json({
            data: [
                { project_id: 'MPLADS-UP-2024-01187', prediction_type: 'LIKELY_DELAY', probability: 0.82, predicted_by: '2026-11-15', key_drivers: ['Only 20% expenditure at 60% timeline elapsed', 'Executing agency has 3 other delayed projects'] },
                { project_id: 'MPLADS-MH-2023-04521', prediction_type: 'LIKELY_OVERRUN', probability: 0.74, predicted_by: '2026-12-01', key_drivers: ['Rapid Q4 expenditure pace', 'Unverified progress milestone'] },
            ],
            meta: { page: 1, page_size: 20, total_items: 2, total_pages: 1 },
        });
    }),

    // ── Demo Scenarios ────────────────────────────────────────────────────
    http.get(`${BASE}/demo/scenarios`, () => {
        return HttpResponse.json({
            scenarios: [
                { scenario_id: 'ghost-project', title: 'The Ghost Project', narrative: 'A sanctioned drinking-water project shows 100% fund withdrawal but zero physical construction at GPS coordinates.', highlight_project_ids: ['MPLADS-BR-2024-0091'] },
                { scenario_id: 'copy-paste-contractor', title: 'The Copy-Paste Contractor', narrative: '3 projects across 2 states with identical work descriptions and vendor.', highlight_project_ids: ['MPLADS-MH-2023-04521'] },
            ],
        });
    }),

    http.post(`${BASE}/demo/scenarios/:id/activate`, ({ params }) => {
        const nav = params.id === 'ghost-project' ? '/investigation/MPLADS-BR-2024-0091' : '/investigation/MPLADS-MH-2023-04521';
        return HttpResponse.json({ scenario_id: params.id as string, activated: true, navigate_to: nav });
    }),

    http.post(`${BASE}/demo/reset`, () => {
        return HttpResponse.json({ reset: true });
    }),
];
