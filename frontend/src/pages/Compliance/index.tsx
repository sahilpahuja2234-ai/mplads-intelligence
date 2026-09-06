import React, { useEffect, useState } from 'react';
import { PageShell } from '@/layout/PageShell';
import { Badge } from '@/components/Badge';
import { getComplianceRules, getComplianceViolations, ComplianceRule } from '@/api/compliance.api';
import { ComplianceViolation } from '@shared/types';
import { FileCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const CompliancePage: React.FC = () => {
    const [rules, setRules] = useState<ComplianceRule[]>([]);
    const [violations, setViolations] = useState<ComplianceViolation[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        Promise.all([getComplianceRules(), getComplianceViolations()])
            .then(([rRes, vRes]) => {
                setRules(rRes.rules);
                setViolations(vRes.data);
            });
    }, []);
    return (
        <PageShell title="Statutory Compliance Rule Engine">
            <div className="space-y-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Compliance & Statutory Audit</h1>
                    <p className="text-xs text-[#64748B]">Automated check against official MPLADS guidelines and entitlement caps</p>
                </div>
                {/* Rules Table */}
                <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold font-mono text-[#64748B] uppercase">Active Statutory Compliance Rules</h3>
                    <div className="divide-y divide-[#E5E7EB] text-xs">
                        {rules.map((rule) => (
                            <div key={rule.rule_id} className="py-2.5 flex items-center justify-between">
                                <div>
                                    <span className="font-mono font-bold text-[#111827]">{rule.rule_id}</span>
                                    <span className="ml-2 font-semibold text-[#111827]">{rule.title}</span>
                                    <p className="text-[#64748B] mt-0.5">{rule.description}</p>
                                </div>
                                <Badge variant="danger">{rule.severity_if_violated}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Violations */}
                <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold font-mono text-[#64748B] uppercase">Open Statutory Violations</h3>
                    <div className="space-y-2">
                        {violations.map((vio) => (
                            <div key={vio.violation_id} className="p-3 border border-red-200 bg-red-50/50 rounded flex items-center justify-between text-xs">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-red-950">{vio.violation_id}</span>
                                        <Badge variant="danger">{vio.category}</Badge>
                                    </div>
                                    <p className="font-semibold text-red-900 mt-1">{vio.rule_title}: {vio.details}</p>
                                    <span className="text-[11px] font-mono text-slate-500">Project: {vio.project_id}</span>
                                </div>
                                <button
                                    onClick={() => navigate(`/investigation/${vio.project_id}`)}
                                    className="px-3 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700"
                                >
                                    View Case
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageShell>
    );
};
