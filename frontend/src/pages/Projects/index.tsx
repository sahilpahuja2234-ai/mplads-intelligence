import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '@/layout/PageShell';
import { RiskPill } from '@/components/RiskPill';
import { Badge } from '@/components/Badge';
import { getProjects, getFiltersMeta } from '@/api/projects.api';
import { Paginated, ProjectSummary, FiltersMeta } from '@shared/types';
import {
    Search,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    AlertTriangle,
    RefreshCw,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    X,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtInr(value: number): string {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
}

function statusVariant(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
        case 'COMPLETED': return 'success';
        case 'IN_PROGRESS': return 'info';
        case 'DELAYED': return 'warning';
        case 'ABANDONED': return 'danger';
        default: return 'neutral';
    }
}

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

// ── Sort icon helper ──────────────────────────────────────────────────────────
const SortIcon: React.FC<{ field: string; current: string; dir: 'asc' | 'desc' }> = ({ field, current, dir }) => {
    if (current !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-400 inline ml-0.5" />;
    return dir === 'asc'
        ? <ChevronUp className="w-3 h-3 text-orange-500 inline ml-0.5" />
        : <ChevronDown className="w-3 h-3 text-orange-500 inline ml-0.5" />;
};

// ── Main page ────────────────────────────────────────────────────────────────
export const ProjectsPage: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    // §11: /projects/:id must redirect to /investigation/:id immediately
    useEffect(() => {
        if (id) navigate(`/investigation/${id}`, { replace: true });
    }, [id, navigate]);

    // ── State ──────────────────────────────────────────────────────────
    const [result, setResult] = useState<Paginated<ProjectSummary> | null>(null);
    const [meta, setMeta] = useState<FiltersMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [riskFilter, setRiskFilter] = useState('');
    const [sortBy, setSortBy] = useState<'sanctioned_amount' | 'risk_score' | 'created_at' | ''>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [filtersOpen, setFiltersOpen] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce search input 300ms
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search]);

    // ── Fetch filters/meta once ────────────────────────────────────────
    useEffect(() => {
        getFiltersMeta().then(setMeta).catch(() => {/* non-critical */});
    }, []);

    // ── Fetch projects on params change ───────────────────────────────
    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getProjects({
                page,
                page_size: pageSize,
                search: debouncedSearch || undefined,
                state: stateFilter || undefined,
                status: statusFilter || undefined,
                work_category: categoryFilter || undefined,
                risk_level: riskFilter || undefined,
                sort_by: sortBy || undefined,
                sort_order: sortOrder,
            });
            setResult(res);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch, stateFilter, statusFilter, categoryFilter, riskFilter, sortBy, sortOrder]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    // Reset to page 1 on filter changes
    const resetPage = () => setPage(1);

    function handleColumnSort(field: 'sanctioned_amount' | 'risk_score') {
        if (sortBy === field) {
            setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        resetPage();
    }

    function clearFilters() {
        setSearch('');
        setDebouncedSearch('');
        setStateFilter('');
        setStatusFilter('');
        setCategoryFilter('');
        setRiskFilter('');
        setSortBy('');
        setSortOrder('desc');
        setPage(1);
    }

    const activeFilterCount = [stateFilter, statusFilter, categoryFilter, riskFilter].filter(Boolean).length;
    const projects = result?.data ?? [];
    const pagination = result?.meta;

    // ── Render ────────────────────────────────────────────────────────
    return (
        <PageShell title="Projects Directory">
            <div className="space-y-4 max-w-7xl mx-auto pb-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#111827]">Projects Master Registry</h1>
                        <p className="text-xs text-[#64748B]">
                            {pagination ? `${pagination.total_items.toLocaleString('en-IN')} projects` : 'Loading...'} · Searchable across all states and districts
                        </p>
                    </div>
                </div>

                {/* Search + Filter Controls */}
                <div className="bg-white rounded border border-[#E5E7EB] p-3 shadow-sm space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
                            <input
                                id="projects-search"
                                type="text"
                                placeholder="Search by Project ID, MP, state, district..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#111827] placeholder-[#64748B] focus:outline-none focus:border-orange-500 font-mono"
                            />
                            {search && (
                                <button onClick={() => { setSearch(''); setDebouncedSearch(''); resetPage(); }} className="absolute right-2 top-2">
                                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                                </button>
                            )}
                        </div>

                        {/* Filter toggle button */}
                        <button
                            id="projects-filter-toggle"
                            onClick={() => setFiltersOpen((o) => !o)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${filtersOpen || activeFilterCount > 0
                                ? 'bg-orange-50 border-orange-300 text-orange-700'
                                : 'bg-white border-[#E5E7EB] text-[#64748B] hover:border-slate-400'
                                }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="bg-orange-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Sort dropdown (for created_at, and general sort) */}
                        <div className="flex items-center gap-2">
                            <select
                                id="projects-sort-by"
                                value={sortBy}
                                onChange={(e) => { setSortBy(e.target.value as typeof sortBy); resetPage(); }}
                                className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                            >
                                <option value="">Sort by…</option>
                                <option value="risk_score">Risk Score</option>
                                <option value="sanctioned_amount">Sanctioned Amount</option>
                                <option value="created_at">Date Added</option>
                            </select>
                            <button
                                onClick={() => { setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); resetPage(); }}
                                className="p-1.5 border border-[#E5E7EB] rounded bg-[#F8F9FA] hover:border-slate-400"
                                title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                            >
                                {sortOrder === 'desc'
                                    ? <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                                    : <ChevronUp className="w-3.5 h-3.5 text-[#64748B]" />}
                            </button>
                        </div>

                        {(activeFilterCount > 0 || search || sortBy) && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 font-medium"
                            >
                                <X className="w-3.5 h-3.5" /> Clear all
                            </button>
                        )}
                    </div>

                    {/* Expandable filter dropdowns */}
                    {filtersOpen && (
                        <div className="flex flex-wrap gap-3 pt-2 border-t border-[#E5E7EB]">
                            <select
                                id="projects-filter-state"
                                value={stateFilter}
                                onChange={(e) => { setStateFilter(e.target.value); resetPage(); }}
                                className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                            >
                                <option value="">All States</option>
                                {meta?.states.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                id="projects-filter-status"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
                                className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                            >
                                <option value="">All Statuses</option>
                                {meta?.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                id="projects-filter-category"
                                value={categoryFilter}
                                onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}
                                className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                            >
                                <option value="">All Categories</option>
                                {meta?.work_categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                            </select>
                            <select
                                id="projects-filter-risk"
                                value={riskFilter}
                                onChange={(e) => { setRiskFilter(e.target.value); resetPage(); }}
                                className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                            >
                                <option value="">All Risk Levels</option>
                                {meta?.risk_levels.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Error state */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded p-4 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-xs text-red-700">{error}</p>
                        <button onClick={fetchProjects} className="ml-auto flex items-center gap-1 text-xs text-red-700 font-semibold hover:underline">
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded border border-[#E5E7EB] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] font-mono text-[#64748B] whitespace-nowrap">
                                    <th className="p-3">Project ID</th>
                                    <th className="p-3">MP Representative</th>
                                    <th className="p-3">Location</th>
                                    <th className="p-3">Category</th>
                                    <th
                                        className="p-3 cursor-pointer hover:text-[#111827] select-none"
                                        onClick={() => handleColumnSort('sanctioned_amount')}
                                    >
                                        Sanctioned <SortIcon field="sanctioned_amount" current={sortBy} dir={sortOrder} />
                                    </th>
                                    <th className="p-3">Expenditure</th>
                                    <th
                                        className="p-3 cursor-pointer hover:text-[#111827] select-none"
                                        onClick={() => handleColumnSort('risk_score')}
                                    >
                                        Risk <SortIcon field="risk_score" current={sortBy} dir={sortOrder} />
                                    </th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Alerts</th>
                                    <th className="p-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {loading ? (
                                    Array.from({ length: pageSize }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 10 }).map((__, j) => (
                                                <td key={j} className="p-3">
                                                    <Skeleton className="h-4" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : projects.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-12 text-center">
                                            <p className="text-sm font-semibold text-[#111827]">No projects match your filters</p>
                                            <p className="text-xs text-[#64748B] mt-1">Try adjusting your search terms or clearing filters</p>
                                            <button onClick={clearFilters} className="mt-3 text-xs text-orange-600 font-semibold hover:underline">
                                                Clear all filters
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((p) => (
                                        <tr
                                            key={p.project_id}
                                            className="hover:bg-orange-50/30 font-mono cursor-pointer transition-colors group"
                                            onClick={() => navigate(`/investigation/${p.project_id}`)}
                                        >
                                            <td className="p-3 font-bold text-[#111827] whitespace-nowrap">{p.project_id}</td>
                                            <td className="p-3 font-sans font-semibold text-[#111827] whitespace-nowrap">{p.mp_name}</td>
                                            <td className="p-3 font-sans text-[#64748B] whitespace-nowrap">{p.district}, {p.state}</td>
                                            <td className="p-3">
                                                <Badge variant="neutral">{p.work_category.replace(/_/g, ' ')}</Badge>
                                            </td>
                                            <td className="p-3 font-bold text-[#111827] whitespace-nowrap">{fmtInr(p.sanctioned_amount)}</td>
                                            <td className="p-3 text-[#64748B] whitespace-nowrap">{fmtInr(p.expenditure_amount)}</td>
                                            <td className="p-3 whitespace-nowrap">
                                                <RiskPill level={p.risk_level} score={p.risk_score} size="sm" />
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <Badge variant={statusVariant(p.status)} size="sm">{p.status}</Badge>
                                            </td>
                                            <td className="p-3 text-center">
                                                {p.open_alert_count > 0 ? (
                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] border border-red-200">
                                                        {p.open_alert_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">–</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/investigation/${p.project_id}`); }}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 font-bold rounded hover:bg-orange-100 whitespace-nowrap"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Investigate
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {pagination && pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between text-xs text-[#64748B]">
                        <p>
                            Showing{' '}
                            <span className="font-semibold text-[#111827]">
                                {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, pagination.total_items)}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-[#111827]">{pagination.total_items.toLocaleString('en-IN')}</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                id="projects-prev-page"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded border border-[#E5E7EB] hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-7 h-7 rounded border text-xs font-mono ${page === pageNum
                                            ? 'bg-orange-600 text-white border-orange-600'
                                            : 'border-[#E5E7EB] text-[#64748B] hover:border-slate-400'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {pagination.total_pages > 5 && <span className="px-1">…</span>}
                            <button
                                id="projects-next-page"
                                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                                disabled={page === pagination.total_pages}
                                className="p-1.5 rounded border border-[#E5E7EB] hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </PageShell>
    );
};
