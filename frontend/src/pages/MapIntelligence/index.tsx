import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PageShell } from '@/layout/PageShell';
import { getMapProjects, getMapClusters, MapProjectsFilters } from '@/api/map.api';
import { MapPoint, MapCluster, RiskLevel, WorkCategory, ProjectStatus } from '@shared/types';
import {
    MapPin,
    Layers,
    AlertTriangle,
    RefreshCw,
    X,
    SlidersHorizontal,
    Eye,
    EyeOff,
} from 'lucide-react';

// ── Risk color palette (matching Architecture §10 risk thresholds) ────────────
const RISK_COLORS: Record<RiskLevel, string> = {
    LOW: '#10B981',
    MEDIUM: '#F59E0B',
    HIGH: '#F97316',
    CRITICAL: '#EF4444',
};

const RISK_FILL_OPACITY: Record<RiskLevel, number> = {
    LOW: 0.5,
    MEDIUM: 0.55,
    HIGH: 0.6,
    CRITICAL: 0.7,
};

// ── Currency formatter ────────────────────────────────────────────────────────
function fmtInr(value: number): string {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
}

// ── India bounds for map extent ───────────────────────────────────────────────
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const INDIA_ZOOM = 5;

// ── Fit-view helper (resets map view) ────────────────────────────────────────
const ResetView: React.FC<{ trigger: number }> = ({ trigger }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(INDIA_CENTER, INDIA_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger]);
    return null;
};

// ── Work categories for filter ────────────────────────────────────────────────
const WORK_CATEGORIES: { value: WorkCategory | ''; label: string }[] = [
    { value: '', label: 'All Categories' },
    { value: 'DRINKING_WATER', label: 'Drinking Water' },
    { value: 'ROADS', label: 'Roads' },
    { value: 'HEALTH', label: 'Health' },
    { value: 'EDUCATION', label: 'Education' },
    { value: 'ELECTRICITY', label: 'Electricity' },
    { value: 'SANITATION', label: 'Sanitation' },
    { value: 'IRRIGATION', label: 'Irrigation' },
    { value: 'SPORTS', label: 'Sports' },
    { value: 'PUBLIC_INFRASTRUCTURE', label: 'Public Infrastructure' },
    { value: 'COMMUNITY_HALLS', label: 'Community Halls' },
    { value: 'DISASTER_RELIEF', label: 'Disaster Relief' },
    { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: { value: ProjectStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'DELAYED', label: 'Delayed' },
    { value: 'ABANDONED', label: 'Abandoned' },
    { value: 'ON_HOLD', label: 'On Hold' },
];

const RISK_OPTIONS: { value: RiskLevel | ''; label: string }[] = [
    { value: '', label: 'All Risk Levels' },
    { value: 'LOW', label: 'Low Risk' },
    { value: 'MEDIUM', label: 'Medium Risk' },
    { value: 'HIGH', label: 'High Risk' },
    { value: 'CRITICAL', label: 'Critical Risk' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export const MapIntelligencePage: React.FC = () => {
    const navigate = useNavigate();

    const [points, setPoints] = useState<MapPoint[]>([]);
    const [clusters, setClusters] = useState<MapCluster[]>([]);
    const [loading, setLoading] = useState(true);
    const [clustersLoading, setClustersLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showClusters, setShowClusters] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);

    // Filters
    const [stateFilter, setStateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
    const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('');
    const [categoryFilter, setCategoryFilter] = useState<WorkCategory | ''>('');

    const fetchPoints = useCallback(async () => {
        setLoading(true);
        setError(null);
        const filters: MapProjectsFilters = {};
        if (stateFilter) filters.state = stateFilter;
        if (statusFilter) filters.status = statusFilter;
        if (riskFilter) filters.risk_level = riskFilter;
        if (categoryFilter) filters.work_category = categoryFilter;

        try {
            const res = await getMapProjects(filters);
            setPoints(res.points);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load map data');
        } finally {
            setLoading(false);
        }
    }, [stateFilter, statusFilter, riskFilter, categoryFilter]);

    useEffect(() => { fetchPoints(); }, [fetchPoints]);

    const toggleClusters = useCallback(async () => {
        if (showClusters) {
            setShowClusters(false);
            return;
        }
        if (clusters.length === 0) {
            setClustersLoading(true);
            try {
                const res = await getMapClusters();
                setClusters(res.clusters);
            } catch (_) {
                /* non-critical */
            } finally {
                setClustersLoading(false);
            }
        }
        setShowClusters(true);
    }, [showClusters, clusters.length]);

    function clearFilters() {
        setStateFilter('');
        setStatusFilter('');
        setRiskFilter('');
        setCategoryFilter('');
        setResetTrigger((n) => n + 1);
    }

    const activeFilterCount = [stateFilter, statusFilter, riskFilter, categoryFilter].filter(Boolean).length;

    // Indian states for state filter (derived from fixtures)
    const INDIAN_STATES = [
        'Maharashtra', 'Bihar', 'Uttar Pradesh', 'Rajasthan',
        'Madhya Pradesh', 'Tamil Nadu', 'Karnataka', 'Gujarat',
        'West Bengal', 'Odisha',
    ];

    return (
        <PageShell title="Map Intelligence">
            <div className="max-w-7xl mx-auto pb-8 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-orange-600" />
                            GIS Map Intelligence
                        </h1>
                        <p className="text-xs text-[#64748B] mt-0.5">
                            Geographic anomaly visualization · {loading ? '…' : `${points.length} project markers`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Cluster toggle */}
                        <button
                            id="map-cluster-toggle"
                            onClick={toggleClusters}
                            disabled={clustersLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${showClusters
                                ? 'bg-purple-100 border-purple-300 text-purple-700'
                                : 'bg-white border-[#E5E7EB] text-[#64748B] hover:border-slate-400'
                                }`}
                        >
                            {clustersLoading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : showClusters ? (
                                <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                                <Eye className="w-3.5 h-3.5" />
                            )}
                            {showClusters ? 'Hide' : 'Show'} Geo-Clusters
                            {showClusters && clusters.length > 0 && (
                                <span className="bg-purple-700 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                                    {clusters.length}
                                </span>
                            )}
                        </button>

                        {activeFilterCount > 0 && (
                            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 font-medium">
                                <X className="w-3 h-3" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter strip */}
                <div className="bg-white rounded border border-[#E5E7EB] p-3 shadow-sm flex flex-wrap items-center gap-3">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#64748B] shrink-0" />

                    <select
                        id="map-filter-state"
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                    >
                        <option value="">All States</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select
                        id="map-filter-status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
                        className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                    >
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <select
                        id="map-filter-risk"
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value as RiskLevel | '')}
                        className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                    >
                        {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <select
                        id="map-filter-category"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as WorkCategory | '')}
                        className="text-xs px-2 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#64748B] focus:outline-none focus:border-orange-500"
                    >
                        {WORK_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {loading && <span className="text-xs text-[#64748B] flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Updating…</span>}
                </div>

                {/* Error state */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-4 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-xs text-red-700">{error}</p>
                        <button onClick={fetchPoints} className="ml-auto flex items-center gap-1 text-xs text-red-700 font-semibold hover:underline">
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                    </div>
                )}

                {/* Map */}
                <div className="relative rounded border border-[#E5E7EB] shadow-sm overflow-hidden" style={{ height: '560px' }}>
                    {/* Loading overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/70 z-[1000] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
                                <p className="text-xs font-semibold text-[#111827]">Loading map data…</p>
                            </div>
                        </div>
                    )}

                    <MapContainer
                        center={INDIA_CENTER}
                        zoom={INDIA_ZOOM}
                        style={{ width: '100%', height: '100%' }}
                        zoomControl={true}
                    >
                        <ResetView trigger={resetTrigger} />
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        {/* Project markers (CircleMarker = pixel radius, good for point data) */}
                        {points.map((pt) => (
                            <CircleMarker
                                key={pt.project_id}
                                center={[pt.latitude, pt.longitude]}
                                radius={pt.risk_level === 'CRITICAL' ? 9 : pt.risk_level === 'HIGH' ? 7 : 6}
                                pathOptions={{
                                    color: RISK_COLORS[pt.risk_level],
                                    fillColor: RISK_COLORS[pt.risk_level],
                                    fillOpacity: RISK_FILL_OPACITY[pt.risk_level],
                                    weight: 1.5,
                                }}
                            >
                                <Popup minWidth={220}>
                                    <div className="space-y-1.5 py-1">
                                        <p className="font-mono font-bold text-xs text-[#111827]">{pt.project_id}</p>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                style={{ background: RISK_COLORS[pt.risk_level] + '22', color: RISK_COLORS[pt.risk_level], border: `1px solid ${RISK_COLORS[pt.risk_level]}44` }}
                                            >
                                                {pt.risk_level} RISK
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono">{pt.status}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-600">
                                            Sanctioned: <span className="font-semibold">{fmtInr(pt.sanctioned_amount)}</span>
                                        </p>
                                        <hr className="border-slate-200" />
                                        <button
                                            onClick={() => navigate(`/investigation/${pt.project_id}`)}
                                            className="w-full text-[11px] font-bold text-orange-600 hover:text-orange-800 text-left flex items-center gap-1"
                                        >
                                            View Investigation →
                                        </button>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}

                        {/* Geo-anomaly clusters — Circle (meters-based radius per §7.7 story) */}
                        {showClusters && clusters.map((cluster) => (
                            <Circle
                                key={cluster.cluster_id}
                                center={[cluster.centroid.latitude, cluster.centroid.longitude]}
                                radius={cluster.radius_meters}
                                pathOptions={{
                                    color: '#7C3AED',
                                    fillColor: '#8B5CF6',
                                    fillOpacity: 0.18,
                                    weight: 2,
                                    dashArray: '6 4',
                                }}
                            >
                                <Popup minWidth={260}>
                                    <div className="space-y-1.5 py-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                                GEO-ANOMALY CLUSTER
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500">{cluster.cluster_id}</span>
                                        </div>
                                        <p className="text-[11px] font-semibold text-[#111827]">
                                            {cluster.project_count} projects within {cluster.radius_meters}m radius
                                        </p>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">{cluster.reason}</p>
                                        <hr className="border-slate-200" />
                                        <p className="text-[10px] text-amber-700 font-mono">
                                            ⚠ High-risk pattern — requires field investigation
                                        </p>
                                        {cluster.project_ids.slice(0, 3).map((pid) => (
                                            <button
                                                key={pid}
                                                onClick={() => navigate(`/investigation/${pid}`)}
                                                className="block text-[11px] font-mono text-orange-600 hover:text-orange-800 text-left"
                                            >
                                                {pid} →
                                            </button>
                                        ))}
                                    </div>
                                </Popup>
                            </Circle>
                        ))}
                    </MapContainer>

                    {/* Legend (bottom-left, inside map) */}
                    <div className="absolute bottom-6 left-3 z-[500] bg-white rounded border border-[#E5E7EB] shadow-md p-2.5 space-y-1.5">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Risk Level</p>
                        {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((level) => (
                            <div key={level} className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full border-2"
                                    style={{ backgroundColor: RISK_COLORS[level] + '99', borderColor: RISK_COLORS[level] }}
                                />
                                <span className="text-[11px] font-mono text-[#111827]">{level}</span>
                            </div>
                        ))}
                        {showClusters && (
                            <>
                                <hr className="border-slate-200" />
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border-2 border-purple-600 bg-purple-200" style={{ borderStyle: 'dashed' }} />
                                    <span className="text-[11px] font-mono text-purple-700">Geo Cluster</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Stats overlay (top-right) */}
                    {!loading && (
                        <div className="absolute top-3 right-3 z-[500] bg-white rounded border border-[#E5E7EB] shadow-md px-3 py-2 flex items-center gap-3">
                            <Layers className="w-3.5 h-3.5 text-[#64748B]" />
                            <span className="text-xs font-mono text-[#111827]">
                                <span className="font-bold">{points.length}</span> projects
                            </span>
                            {activeFilterCount > 0 && (
                                <span className="text-[10px] font-mono text-orange-600 border border-orange-200 bg-orange-50 px-1.5 py-0.5 rounded">
                                    {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Cluster list panel (visible when clusters toggled) */}
                {showClusters && clusters.length > 0 && (
                    <div className="bg-white rounded border border-[#E5E7EB] shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-[#E5E7EB] flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                            <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Geographic Anomaly Clusters</h2>
                        </div>
                        <div className="divide-y divide-[#E5E7EB]">
                            {clusters.map((cluster) => (
                                <div key={cluster.cluster_id} className="p-3 flex items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-purple-700">{cluster.cluster_id}</span>
                                            <span className="text-[10px] text-slate-500">{cluster.project_count} projects · {cluster.radius_meters}m radius</span>
                                        </div>
                                        <p className="text-xs text-[#64748B]">{cluster.reason}</p>
                                        <p className="text-[11px] text-amber-700 font-mono">
                                            ⚠ Potential anomaly — requires field verification before any official action
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {cluster.project_ids.slice(0, 2).map((pid) => (
                                            <button
                                                key={pid}
                                                onClick={() => navigate(`/investigation/${pid}`)}
                                                className="text-[10px] font-mono px-2 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded hover:bg-purple-100"
                                            >
                                                {pid.split('-').slice(-1)[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PageShell>
    );
};
