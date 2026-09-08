import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { PageShell } from '@/layout/PageShell';
import { KpiCard } from '@/components/KpiCard';
import { RiskPill } from '@/components/RiskPill';
import { Badge } from '@/components/Badge';
import {
    getDashboardSummary,
    getDashboardTrends,
    getDashboardStateComparison,
    getTopRiskyProjects,
} from '@/api/dashboard.api';
import {
    DashboardSummary,
    DashboardTrends,
    StateComparison,
    ProjectSummary,
} from '@shared/types';
import {
    LayoutDashboard,
    AlertTriangle,
    ShieldCheck,
    TrendingUp,
    Activity,
    MapPin,
    ArrowUpRight,
    RefreshCw,
} from 'lucide-react';

// ── Currency formatter ───────────────────────────────────────────────────────
function fmtInr(value: number): string {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
}

function fmtInrCr(value: number): string {
    return `₹${(value / 10_000_000).toFixed(1)} Cr`;
}

// ── Chart color palettes ─────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
    LOW: '#10B981',
    MEDIUM: '#F59E0B',
    HIGH: '#F97316',
    CRITICAL: '#EF4444',
};

const STATUS_COLORS: Record<string, string> = {
    COMPLETED: '#10B981',
    IN_PROGRESS: '#3B82F6',
    DELAYED: '#F97316',
    ABANDONED: '#EF4444',
    RECOMMENDED: '#8B5CF6',
    SANCTIONED: '#6B7280',
    ON_HOLD: '#D97706',
};

// ── Status badge helper ──────────────────────────────────────────────────────
function statusVariant(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
        case 'COMPLETED': return 'success';
        case 'IN_PROGRESS': return 'info';
        case 'DELAYED': return 'warning';
        case 'ABANDONED': return 'danger';
        default: return 'neutral';
    }
}

// ── Skeleton component ───────────────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

// ── Main page ────────────────────────────────────────────────────────────────
export const ExecutiveDashboardPage: React.FC = () => {
    const navigate = useNavigate();

    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [trends, setTrends] = useState<DashboardTrends | null>(null);
    const [stateComparison, setStateComparison] = useState<StateComparison | null>(null);
    const [topRisky, setTopRisky] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stateSortKey, setStateSortKey] = useState<'utilization_pct' | 'avg_risk_score' | 'total_projects'>('avg_risk_score');
    const [stateSortDir, setStateSortDir] = useState<'asc' | 'desc'>('desc');

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, t, sc, tr] = await Promise.all([
                getDashboardSummary(),
                getDashboardTrends(),
                getDashboardStateComparison(),
                getTopRiskyProjects(10),
            ]);
            setSummary(s);
            setTrends(t);
            setStateComparison(sc);
            setTopRisky(tr);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Derived chart data
    const riskChartData = summary
        ? (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((level) => ({
              name: level,
              count: summary.risk_breakdown[level] ?? 0,
              fill: RISK_COLORS[level],
          }))
        : [];

    const statusChartData = summary
        ? Object.entries(summary.status_breakdown)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => ({ name: k, count: v, fill: STATUS_COLORS[k] ?? '#6B7280' }))
        : [];

    const trendChartData =
        trends?.points.map((p) => ({
            month: p.label,
            Sanctioned: parseFloat((p.sanctioned_amount / 10_000_000).toFixed(2)),
            Expenditure: parseFloat((p.expenditure_amount / 10_000_000).toFixed(2)),
            Alerts: p.new_alerts,
        })) ?? [];

    const sortedStates = stateComparison
        ? [...stateComparison.states].sort((a, b) => {
              const dir = stateSortDir === 'asc' ? 1 : -1;
              return (a[stateSortKey] - b[stateSortKey]) * dir;
          })
        : [];

    function toggleStateSort(key: typeof stateSortKey) {
        if (stateSortKey === key) {
            setStateSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setStateSortKey(key);
            setStateSortDir('desc');
        }
    }

    // ── Error state ──────────────────────────────────────────────────────
    if (error) {
        return (
            <PageShell title="Executive Dashboard">
                <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64 space-y-4">
                    <AlertTriangle className="w-10 h-10 text-orange-500" />
                    <p className="text-sm text-[#64748B]">{error}</p>
                    <button
                        onClick={loadAll}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell title="Executive Dashboard">
            <div className="space-y-6 max-w-7xl mx-auto pb-8">
                {/* ── Page header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5 text-orange-600" />
                            Executive Audit Dashboard
                        </h1>
                        <p className="text-xs text-[#64748B] mt-0.5">
                            Macro portfolio overview · {summary ? summary.total_projects.toLocaleString('en-IN') : '—'} monitored MPLADS projects
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-[#64748B] bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            Demo data — not official government statistics
                        </span>
                        <button
                            onClick={loadAll}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-700 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ── KPI Row ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                    ) : summary ? (
                        <>
                            <KpiCard
                                title="Total Projects"
                                value={summary.total_projects.toLocaleString('en-IN')}
                                subtitle="Active MPLADS works"
                                icon={LayoutDashboard}
                                accentColor="#3B82F6"
                            />
                            <KpiCard
                                title="Total Sanctioned"
                                value={fmtInrCr(summary.total_sanctioned_amount)}
                                subtitle="Cumulative approvals"
                                icon={TrendingUp}
                                accentColor="#10B981"
                            />
                            <KpiCard
                                title="Total Released"
                                value={fmtInrCr(summary.total_released_amount)}
                                subtitle="Funds disbursed to districts"
                                icon={Activity}
                                accentColor="#8B5CF6"
                            />
                            <KpiCard
                                title="Total Expenditure"
                                value={fmtInrCr(summary.total_expenditure_amount)}
                                subtitle="Reported spend to date"
                                icon={Activity}
                                accentColor="#F59E0B"
                            />
                            <KpiCard
                                title="Utilization Rate"
                                value={`${summary.utilization_pct.toFixed(1)}%`}
                                subtitle="Expenditure / sanctioned"
                                accentColor={summary.utilization_pct >= 85 ? '#10B981' : '#F59E0B'}
                                trend={{ value: summary.utilization_pct >= 85 ? 'On Track' : 'Below Target', isPositive: summary.utilization_pct >= 85 }}
                            />
                            <KpiCard
                                title="Open Alerts"
                                value={summary.open_alerts.toLocaleString('en-IN')}
                                subtitle="Potential anomalies requiring review"
                                icon={AlertTriangle}
                                accentColor="#EF4444"
                            />
                            <KpiCard
                                title="Compliance Violations"
                                value={summary.open_compliance_violations.toLocaleString('en-IN')}
                                subtitle="Open rule violations"
                                icon={ShieldCheck}
                                accentColor="#F97316"
                            />
                            <KpiCard
                                title="Avg Risk Score"
                                value={summary.avg_risk_score.toFixed(1)}
                                subtitle="Portfolio-wide risk (0–100)"
                                accentColor={summary.avg_risk_score < 30 ? '#10B981' : summary.avg_risk_score < 55 ? '#F59E0B' : '#EF4444'}
                            />
                        </>
                    ) : null}
                </div>

                {/* ── Charts Row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Risk Breakdown */}
                    <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm">
                        <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-3">Risk Breakdown</h2>
                        {loading ? (
                            <Skeleton className="h-40" />
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={riskChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <Tooltip
                                        formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString('en-IN') : String(v), 'Projects']}
                                        labelStyle={{ fontSize: 11 }}
                                        contentStyle={{ fontSize: 11 }}
                                    />
                                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                        {riskChartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm">
                        <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-3">Status Breakdown</h2>
                        {loading ? (
                            <Skeleton className="h-40" />
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={statusChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#64748B' }} width={80} />
                                    <Tooltip
                                        formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString('en-IN') : String(v ?? ''), 'Projects'] as [string, string]}
                                        labelStyle={{ fontSize: 11 }}
                                        contentStyle={{ fontSize: 11 }}
                                    />
                                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                                        {statusChartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Monthly Alerts Trend (sparkline) */}
                    <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm">
                        <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-3">Monthly New Alerts</h2>
                        {loading ? (
                            <Skeleton className="h-40" />
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={trendChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748B' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <Tooltip contentStyle={{ fontSize: 11 }} labelStyle={{ fontSize: 11 }} />
                                    <Line
                                        type="monotone"
                                        dataKey="Alerts"
                                        stroke="#EF4444"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#EF4444' }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ── Monthly Expenditure Trend ── */}
                <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm">
                    <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-3">
                        Monthly Sanctioned vs. Expenditure (₹ Cr)
                    </h2>
                    {loading ? (
                        <Skeleton className="h-52" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={trendChartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
                                <YAxis
                                    tickFormatter={(v) => `₹${v}Cr`}
                                    tick={{ fontSize: 10, fill: '#64748B' }}
                                />
                                <Tooltip
                                    formatter={(v: unknown) => [`₹${typeof v === 'number' ? v.toFixed(2) : v} Cr`, '']}
                                    labelStyle={{ fontSize: 11 }}
                                    contentStyle={{ fontSize: 11 }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line
                                    type="monotone"
                                    dataKey="Sanctioned"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Expenditure"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* ── State Comparison + Top Risky ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* State Comparison Table */}
                    <div className="bg-white rounded border border-[#E5E7EB] shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[#E5E7EB]">
                            <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                                State-wise Comparison
                            </h2>
                        </div>
                        {loading ? (
                            <div className="p-4 space-y-2">
                                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] font-mono text-[#64748B]">
                                            <th className="p-2.5 text-left">State</th>
                                            <th
                                                className="p-2.5 text-right cursor-pointer hover:text-[#111827] select-none"
                                                onClick={() => toggleStateSort('total_projects')}
                                            >
                                                Projects {stateSortKey === 'total_projects' ? (stateSortDir === 'desc' ? '↓' : '↑') : ''}
                                            </th>
                                            <th
                                                className="p-2.5 text-right cursor-pointer hover:text-[#111827] select-none"
                                                onClick={() => toggleStateSort('utilization_pct')}
                                            >
                                                Util% {stateSortKey === 'utilization_pct' ? (stateSortDir === 'desc' ? '↓' : '↑') : ''}
                                            </th>
                                            <th
                                                className="p-2.5 text-right cursor-pointer hover:text-[#111827] select-none"
                                                onClick={() => toggleStateSort('avg_risk_score')}
                                            >
                                                Avg Risk {stateSortKey === 'avg_risk_score' ? (stateSortDir === 'desc' ? '↓' : '↑') : ''}
                                            </th>
                                            <th className="p-2.5 text-right">Critical</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {sortedStates.map((row) => (
                                            <tr key={row.state} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-semibold text-[#111827]">{row.state}</td>
                                                <td className="p-2.5 text-right font-mono">{row.total_projects.toLocaleString('en-IN')}</td>
                                                <td className="p-2.5 text-right font-mono">
                                                    <span className={row.utilization_pct >= 85 ? 'text-emerald-700' : 'text-amber-700'}>
                                                        {row.utilization_pct.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right font-mono">
                                                    <span
                                                        className={
                                                            row.avg_risk_score >= 55
                                                                ? 'text-red-600 font-bold'
                                                                : row.avg_risk_score >= 30
                                                                ? 'text-amber-700'
                                                                : 'text-emerald-700'
                                                        }
                                                    >
                                                        {row.avg_risk_score.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    {row.critical_count > 0 ? (
                                                        <span className="text-red-600 font-bold">{row.critical_count}</span>
                                                    ) : (
                                                        <span className="text-slate-400">0</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Top Risky Projects */}
                    <div className="bg-white rounded border border-[#E5E7EB] shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
                            <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                Top High-Risk Projects
                            </h2>
                            <button
                                onClick={() => navigate('/projects?sort_by=risk_score&sort_order=desc')}
                                className="text-[11px] text-orange-600 font-semibold hover:underline flex items-center gap-1"
                            >
                                View all <ArrowUpRight className="w-3 h-3" />
                            </button>
                        </div>
                        {loading ? (
                            <div className="p-4 space-y-2">
                                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                            </div>
                        ) : (
                            <div className="divide-y divide-[#E5E7EB]">
                                {topRisky.map((p) => (
                                    <button
                                        key={p.project_id}
                                        onClick={() => navigate(`/investigation/${p.project_id}`)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left group"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-mono font-bold text-[#111827] truncate">{p.project_id}</p>
                                            <p className="text-[11px] text-[#64748B] truncate">{p.mp_name} · {p.district}, {p.state}</p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3 shrink-0">
                                            <Badge variant={statusVariant(p.status)} size="sm">{p.status}</Badge>
                                            <RiskPill level={p.risk_level} score={p.risk_score} size="sm" />
                                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 transition-colors" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="p-3 border-t border-[#E5E7EB] bg-amber-50/50">
                            <p className="text-[11px] text-amber-700 font-mono">
                                ⚠ Potential anomalies flagged by AI — each requires independent field verification before any official action.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </PageShell>
    );
};
