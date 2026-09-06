import React from 'react';
import { Project, RiskBreakdown, Alert, ComplianceViolation, PaymentItem, TimelineEvent } from '@shared/types';
import { Printer, ShieldCheck, X, FileText } from 'lucide-react';
import { RiskPill } from '@/components/RiskPill';
interface AuditReportViewProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    riskBreakdown: RiskBreakdown;
    openAlerts: Alert[];
    complianceViolations: ComplianceViolation[];
    payments: PaymentItem[];
    timeline: TimelineEvent[];
}
export const AuditReportView: React.FC<AuditReportViewProps> = ({
    isOpen,
    onClose,
    project,
    riskBreakdown,
    openAlerts,
    complianceViolations,
    payments,
    timeline,
}) => {
    if (!isOpen) return null;
    const generatedTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const handlePrint = () => {
        window.print();
    };
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl border border-[#E5E7EB] w-full max-w-4xl max-h-[95vh] flex flex-col my-auto no-print-container">
                {/* Top Control Bar (Hidden on print) */}
                <div className="no-print px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <div>
                            <h3 className="text-base font-bold text-[#111827]">Official Case Audit Report</h3>
                            <p className="text-xs text-[#64748B]">Printable government financial intelligence audit document</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-orange-600 text-white rounded text-xs font-bold hover:bg-orange-700 transition-colors shadow-sm"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print / Save as PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-[#64748B] hover:text-[#111827] rounded hover:bg-slate-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {/* Audit Document Body (Printable Area) */}
                <div className="p-8 overflow-y-auto space-y-6 audit-report-container font-sans text-[#111827]">
                    {/* Document Header */}
                    <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2 text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">
                                <span>Government of India</span>
                                <span>•</span>
                                <span>MPLADS Vigilance & Audit Cell</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                                SPECIAL AUDIT & INVESTIGATION REPORT
                            </h1>
                            <p className="text-xs font-mono text-slate-600 mt-0.5">
                                Case ID: AUDIT-{project.project_id}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded">
                                CONFIDENTIAL
                            </span>
                            <p className="text-[10px] font-mono text-slate-500 mt-2">
                                Generated: {generatedTimestamp}
                            </p>
                        </div>
                    </div>
                    {/* Executive Summary Box */}
                    <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">
                                1. Executive Audit Finding
                            </span>
                            <RiskPill level={riskBreakdown.risk_level} score={riskBreakdown.risk_score} size="md" />
                        </div>
                        <p className="text-xs text-slate-900 leading-relaxed font-medium">
                            Project {project.project_id} has been formally flagged with an official risk score of{' '}
                            <strong>{riskBreakdown.risk_score.toFixed(1)}/100 ({riskBreakdown.risk_level} RISK)</strong>.
                            Principal risk contributors include{' '}
                            {project.risk.top_factors.map((f) => f.replace(/_/g, ' ')).join(', ')}.
                        </p>
                    </div>
                    {/* Section 2: Project Metadata */}
                    <div className="space-y-2">
                        <h2 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider border-b border-slate-200 pb-1">
                            2. Project Identification & Governance
                        </h2>
                        <table className="w-full text-xs border-collapse border border-slate-300 text-left">
                            <tbody>
                                <tr className="border-b border-slate-300">
                                    <td className="p-2 bg-slate-100 font-semibold w-1/4">Project ID</td>
                                    <td className="p-2 font-mono">{project.project_id}</td>
                                    <td className="p-2 bg-slate-100 font-semibold w-1/4">Work Category</td>
                                    <td className="p-2">{project.work_category}</td>
                                </tr>
                                <tr className="border-b border-slate-300">
                                    <td className="p-2 bg-slate-100 font-semibold">Description</td>
                                    <td className="p-2" colSpan={3}>{project.work_description}</td>
                                </tr>
                                <tr className="border-b border-slate-300">
                                    <td className="p-2 bg-slate-100 font-semibold">MP Representative</td>
                                    <td className="p-2">{project.mp.name} ({project.mp.house})</td>
                                    <td className="p-2 bg-slate-100 font-semibold">Constituency / State</td>
                                    <td className="p-2">{project.mp.constituency}, {project.mp.state}</td>
                                </tr>
                                <tr className="border-b border-slate-300">
                                    <td className="p-2 bg-slate-100 font-semibold">Implementing Agency</td>
                                    <td className="p-2">{project.implementing_agency || 'N/A'}</td>
                                    <td className="p-2 bg-slate-100 font-semibold">Executing Vendor</td>
                                    <td className="p-2">{project.vendor ? project.vendor.name : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 bg-slate-100 font-semibold">Sanctioned Amount</td>
                                    <td className="p-2 font-mono">₹{(project.financials.sanctioned_amount / 100000).toFixed(2)} Lakh</td>
                                    <td className="p-2 bg-slate-100 font-semibold">Disbursed Expenditure</td>
                                    <td className="p-2 font-mono">₹{(project.financials.expenditure_amount / 100000).toFixed(2)} Lakh ({project.financials.utilization_pct.toFixed(1)}%)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {/* Section 3: Risk Factor Breakdown */}
                    <div className="space-y-2">
                        <h2 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider border-b border-slate-200 pb-1">
                            3. Risk Factor Breakdown & Model Contributions
                        </h2>
                        <table className="w-full text-xs border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-300 font-mono text-slate-700">
                                    <th className="p-2">Factor</th>
                                    <th className="p-2">Score</th>
                                    <th className="p-2">Weight</th>
                                    <th className="p-2">Explanation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskBreakdown.components.map((comp) => (
                                    <tr key={comp.factor} className="border-b border-slate-300">
                                        <td className="p-2 font-bold font-mono">{comp.factor.replace(/_/g, ' ')}</td>
                                        <td className="p-2 font-mono font-semibold">{comp.score}/100</td>
                                        <td className="p-2 font-mono">{(comp.weight * 100).toFixed(0)}%</td>
                                        <td className="p-2 text-slate-700">{comp.explanation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Section 4: Active Alerts & Compliance */}
                    <div className="space-y-2">
                        <h2 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider border-b border-slate-200 pb-1">
                            4. Operational Alerts & Compliance Breaches
                        </h2>
                        {openAlerts.length > 0 ? (
                            <div className="space-y-1.5">
                                {openAlerts.map((a) => (
                                    <div key={a.alert_id} className="p-2.5 border border-slate-300 rounded text-xs bg-slate-50">
                                        <div className="flex justify-between font-bold">
                                            <span>{a.title} ({a.alert_type})</span>
                                            <span className="font-mono">{a.severity}</span>
                                        </div>
                                        <p className="text-slate-700 mt-1">{a.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600">No active unhandled operational alerts.</p>
                        )}
                    </div>
                    {/* Section 5: Recommended Action */}
                    <div className="p-4 bg-orange-50 border-2 border-orange-500 rounded space-y-1">
                        <h3 className="text-xs font-bold text-orange-950 uppercase font-mono">
                            5. Final Audit Recommendation
                        </h3>
                        <p className="text-xs text-orange-900">
                            Recommend immediate field inspection by District Vigilance Officer before issuing further installment clearances.
                        </p>
                    </div>
                    {/* Signatures */}
                    <div className="pt-12 flex justify-between text-xs font-mono text-slate-600">
                        <div>
                            <div className="w-48 border-b border-slate-400 mb-1"></div>
                            <p>Investigating Auditor Signature</p>
                        </div>
                        <div className="text-right">
                            <div className="w-48 border-b border-slate-400 mb-1 ml-auto"></div>
                            <p>Vigilance Officer Approval</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
