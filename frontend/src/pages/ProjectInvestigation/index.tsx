import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '@/layout/PageShell';
import { RiskPill } from '@/components/RiskPill';
import { Badge } from '@/components/Badge';
import { KpiCard } from '@/components/KpiCard';
import {
    getInvestigation,
    getProjectPayments,
    getProjectTimeline,
    InvestigationData,
} from '@/api/investigation.api';
import { PaymentItem, TimelineEvent } from '@shared/types';
import {
    Bot,
    HelpCircle,
    FileText,
    AlertTriangle,
    Clock,
    DollarSign,
    FileCheck,
    CheckCircle2,
    Building2,
    User,
    MapPin,
    Calendar,
    Layers,
    ArrowRight,
    ShieldAlert,
} from 'lucide-react';
// Import the 6 DEV 3 USP Components
import { AIInvestigationSummary } from './components/AIInvestigationSummary';
import { WhyThisProjectModal } from './components/WhyThisProjectModal';
import { RiskFingerprint } from './components/RiskFingerprint';
import { RiskSimulator } from './components/RiskSimulator';
import { RelationshipGraph } from './components/RelationshipGraph';
import { AuditReportView } from './components/AuditReportView';
export const ProjectInvestigationPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const projectId = id || 'MPLADS-MH-2023-04521';
    // State Management
    const [data, setData] = useState<InvestigationData | null>(null);
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Modals state
    const [isWhyModalOpen, setIsWhyModalOpen] = useState<boolean>(false);
    const [isAuditReportOpen, setIsAuditReportOpen] = useState<boolean>(false);
    // Active evidence tab
    const [activeTab, setActiveTab] = useState<'alerts' | 'financials' | 'timeline' | 'compliance' | 'related'>('alerts');
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        Promise.all([
            getInvestigation(projectId),
            getProjectPayments(projectId).catch(() => ({ project_id: projectId, payments: [] })),
            getProjectTimeline(projectId).catch(() => ({ project_id: projectId, events: [] })),
        ])
            .then(([invData, payData, timeData]) => {
                if (isMounted) {
                    setData(invData);
                    setPayments(payData.payments);
                    setTimeline(timeData.events);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err.message || 'Failed to load project investigation case file.');
                    setLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [projectId]);
    if (loading) {
        return (
            <PageShell title="Project Investigation Case File">
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-mono text-[#64748B]">Loading Investigation Case File for {projectId}...</p>
                </div>
            </PageShell>
        );
    }
    if (error || !data) {
        return (
            <PageShell title="Project Investigation Case File">
                <div className="bg-red-50 border border-red-200 rounded p-6 text-center max-w-lg mx-auto my-12 space-y-3">
                    <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
                    <h3 className="text-base font-bold text-red-900">Case File Unavailable</h3>
                    <p className="text-xs text-red-700">{error || 'Project data could not be retrieved.'}</p>
                    <button
                        onClick={() => navigate('/projects')}
                        className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                    >
                        Return to Projects List
                    </button>
                </div>
            </PageShell>
        );
    }
    const { project, risk_breakdown, open_alerts, compliance_violations, related_projects, duplicate_cluster } = data;
    return (
        <PageShell title={`Case File: ${project.project_id}`}>
            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* 1. CASE HEADER BAR */}
                <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
                        <div>
                            <div className="flex items-center space-x-3">
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                                    CASE FILE
                                </span>
                                <span className="text-xs font-mono text-[#64748B]">{project.project_id}</span>
                                <Badge variant="neutral">{project.work_category}</Badge>
                                <Badge variant={project.status === 'DELAYED' ? 'danger' : 'info'}>{project.status}</Badge>
                            </div>
                            <h1 className="text-xl font-bold text-[#111827] mt-1.5 tracking-tight">
                                {project.work_description}
                            </h1>
                            <div className="flex items-center space-x-4 text-xs text-[#64748B] mt-2 font-mono">
                                <span className="flex items-center space-x-1">
                                    <User className="w-3.5 h-3.5" />
                                    <span>{project.mp.name} ({project.mp.house})</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{project.mp.constituency}, {project.mp.state}</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>{project.vendor ? project.vendor.name : 'Unassigned Vendor'}</span>
                                </span>
                            </div>
                        </div>
                        {/* Official Risk Score & Risk Pill */}
                        <div className="flex items-center space-x-4 bg-[#F8F9FA] p-3 rounded border border-[#E5E7EB] shrink-0">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block">
                                    Official Risk Score
                                </span>
                                <span className="text-2xl font-bold font-mono text-[#111827]">
                                    {project.risk.risk_score.toFixed(1)}
                                </span>
                                <span className="text-xs text-[#64748B]"> / 100</span>
                            </div>
                            <RiskPill level={project.risk.risk_level} score={project.risk.risk_score} size="lg" />
                        </div>
                    </div>
                    {/* Primary AI Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center space-x-2 text-xs text-[#64748B]">
                            <ShieldAlert className="w-4 h-4 text-orange-600" />
                            <span>Investigator Action Workflow: <strong>Detect → Explain → Connect → Simulate → Act</strong></span>
                        </div>
                        <div className="flex items-center space-x-2">
                            {/* Action 1: Why This Project? */}
                            <button
                                onClick={() => setIsWhyModalOpen(true)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#111827] hover:border-orange-500 rounded text-xs font-semibold shadow-sm transition-all"
                            >
                                <HelpCircle className="w-4 h-4 text-orange-600" />
                                <span>Why Is This Risky?</span>
                            </button>
                            {/* Action 2: Audit Report */}
                            <button
                                onClick={() => setIsAuditReportOpen(true)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-bold hover:bg-orange-700 shadow-sm transition-all"
                            >
                                <FileText className="w-4 h-4" />
                                <span>Generate Audit Report</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* 2. TOP GRID: RISK OVERVIEW & AI SUMMARY */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1: Risk Fingerprint & Overview */}
                    <div className="lg:col-span-1 space-y-6">
                        <RiskFingerprint riskBreakdown={risk_breakdown} />
                        {/* Quick KPI Financial Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <KpiCard
                                title="Sanctioned"
                                value={`₹${(project.financials.sanctioned_amount / 100000).toFixed(1)}L`}
                                subtitle="Approved Fund"
                            />
                            <KpiCard
                                title="Spent"
                                value={`₹${(project.financials.expenditure_amount / 100000).toFixed(1)}L`}
                                subtitle={`${project.financials.utilization_pct.toFixed(1)}% Utilized`}
                                accentColor="#EA580C"
                            />
                        </div>
                    </div>
                    {/* Column 2 & 3: AI Investigation Summary Component */}
                    <div className="lg:col-span-2 space-y-6">
                        <AIInvestigationSummary
                            project={project}
                            riskBreakdown={risk_breakdown}
                            openAlerts={open_alerts}
                            complianceViolations={compliance_violations}
                        />
                        {/* Relationship Intelligence Graph */}
                        <RelationshipGraph
                            project={project}
                            openAlerts={open_alerts}
                            relatedProjects={related_projects}
                            duplicateCluster={duplicate_cluster}
                        />
                    </div>
                </div>
                {/* 3. INVESTIGATION EVIDENCE TABS */}
                <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
                    <div className="border-b border-[#E5E7EB] bg-[#F8F9FA] px-4 flex items-center space-x-1">
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${activeTab === 'alerts'
                                ? 'border-orange-600 text-orange-600 bg-white'
                                : 'border-transparent text-[#64748B] hover:text-[#111827]'
                                }`}
                        >
                            Open Alerts ({open_alerts.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('financials')}
                            className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${activeTab === 'financials'
                                ? 'border-orange-600 text-orange-600 bg-white'
                                : 'border-transparent text-[#64748B] hover:text-[#111827]'
                                }`}
                        >
                            Financial & Payment Milestones
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${activeTab === 'timeline'
                                ? 'border-orange-600 text-orange-600 bg-white'
                                : 'border-transparent text-[#64748B] hover:text-[#111827]'
                                }`}
                        >
                            Timeline & Milestones
                        </button>
                        <button
                            onClick={() => setActiveTab('compliance')}
                            className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${activeTab === 'compliance'
                                ? 'border-orange-600 text-orange-600 bg-white'
                                : 'border-transparent text-[#64748B] hover:text-[#111827]'
                                }`}
                        >
                            Compliance ({compliance_violations.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('related')}
                            className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${activeTab === 'related'
                                ? 'border-orange-600 text-orange-600 bg-white'
                                : 'border-transparent text-[#64748B] hover:text-[#111827]'
                                }`}
                        >
                            Related Projects
                        </button>
                    </div>
                    <div className="p-5">
                        {/* Tab 1: Alerts */}
                        {activeTab === 'alerts' && (
                            <div className="space-y-3">
                                {open_alerts.length > 0 ? (
                                    open_alerts.map((alert) => (
                                        <div
                                            key={alert.alert_id}
                                            className="p-4 rounded border border-[#E5E7EB] bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
                                        >
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-mono font-bold text-[#111827]">{alert.alert_id}</span>
                                                    <Badge variant={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'danger' : 'warning'}>
                                                        {alert.severity}
                                                    </Badge>
                                                    <Badge variant="ai">{alert.alert_type}</Badge>
                                                </div>
                                                <h4 className="text-sm font-bold text-[#111827] mt-1">{alert.title}</h4>
                                                <p className="text-xs text-[#64748B] mt-0.5">{alert.description}</p>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/alerts`)}
                                                className="text-xs font-semibold text-orange-600 hover:text-orange-700 shrink-0"
                                            >
                                                Inspect Alert →
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-[#64748B] py-4 text-center">No active open alerts for this project.</p>
                                )}
                            </div>
                        )}
                        {/* Tab 2: Financials */}
                        {activeTab === 'financials' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-xs font-mono p-3 bg-[#F8F9FA] rounded border border-[#E5E7EB]">
                                    <div>
                                        <span className="text-[#64748B] block">Sanctioned:</span>
                                        <span className="font-bold text-[#111827]">₹{project.financials.sanctioned_amount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#64748B] block">Estimated Cost:</span>
                                        <span className="font-bold text-[#111827]">
                                            {project.financials.estimated_cost ? `₹${project.financials.estimated_cost.toLocaleString()}` : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#64748B] block">Actual Expenditure:</span>
                                        <span className="font-bold text-orange-600">₹{project.financials.expenditure_amount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <h4 className="text-xs font-bold text-[#64748B] uppercase font-mono tracking-wider">Disbursement Milestones</h4>
                                {payments.length > 0 ? (
                                    <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded">
                                        {payments.map((p) => (
                                            <div key={p.payment_id} className="p-3 flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-mono font-bold text-[#111827]">Installment #{p.installment_no}</span>
                                                    <span className="text-[#64748B] ml-2 font-mono">({p.payment_date})</span>
                                                    {p.flagged && <Badge variant="danger" className="ml-2">FLAGGED ANOMALY</Badge>}
                                                </div>
                                                <div className="font-mono">
                                                    <span className="font-bold text-[#111827]">₹{p.amount.toLocaleString()}</span>
                                                    <span className="text-[#64748B] ml-3">Claimed Progress: {p.milestone_reached_pct}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#64748B]">No milestone payments logged yet.</p>
                                )}
                            </div>
                        )}
                        {/* Tab 3: Timeline */}
                        {activeTab === 'timeline' && (
                            <div className="space-y-3">
                                {timeline.length > 0 ? (
                                    <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                                        {timeline.map((event, idx) => (
                                            <div key={idx} className="relative text-xs space-y-0.5">
                                                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-orange-600 border-2 border-white"></span>
                                                <div className="font-bold text-[#111827] font-mono">{event.event.replace(/_/g, ' ')} — {event.date}</div>
                                                {event.note && <p className="text-[#64748B]">{event.note}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#64748B]">Timeline log unavailable.</p>
                                )}
                            </div>
                        )}
                        {/* Tab 4: Compliance */}
                        {activeTab === 'compliance' && (
                            <div className="space-y-3">
                                {compliance_violations.length > 0 ? (
                                    compliance_violations.map((vio) => (
                                        <div key={vio.violation_id} className="p-3 rounded border border-red-200 bg-red-50 text-xs">
                                            <div className="flex items-center justify-between font-bold text-red-900">
                                                <span>{vio.rule_title} ({vio.rule_id})</span>
                                                <Badge variant="danger">{vio.status}</Badge>
                                            </div>
                                            <p className="text-red-700 mt-1">{vio.details}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-[#64748B] py-2">No statutory compliance violations detected.</p>
                                )}
                            </div>
                        )}
                        {/* Tab 5: Related Projects */}
                        {activeTab === 'related' && (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-[#64748B] uppercase font-mono tracking-wider mb-2">Same Vendor Projects</h4>
                                    {related_projects.same_vendor.length > 0 ? (
                                        <div className="space-y-2">
                                            {related_projects.same_vendor.map((p) => (
                                                <div key={p.project_id} className="p-2.5 border border-[#E5E7EB] rounded text-xs flex justify-between items-center">
                                                    <div>
                                                        <span className="font-mono font-bold">{p.project_id}</span>
                                                        <span className="text-[#64748B] ml-2">{p.work_category}</span>
                                                    </div>
                                                    <RiskPill level={p.risk_level} score={p.risk_score} size="sm" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[#64748B]">No other projects linked to vendor.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* 4. RISK SIMULATOR (WHAT-IF ANALYSIS) */}
                <RiskSimulator project={project} riskBreakdown={risk_breakdown} />
            </div>
            {/* Modals */}
            <WhyThisProjectModal
                isOpen={isWhyModalOpen}
                onClose={() => setIsWhyModalOpen(false)}
                riskBreakdown={risk_breakdown}
                projectId={project.project_id}
            />
            <AuditReportView
                isOpen={isAuditReportOpen}
                onClose={() => setIsAuditReportOpen(false)}
                project={project}
                riskBreakdown={risk_breakdown}
                openAlerts={open_alerts}
                complianceViolations={compliance_violations}
                payments={payments}
                timeline={timeline}
            />
        </PageShell>
    );
};
