import React from 'react';
import { PageShell } from '@/layout/PageShell';
import { KpiCard } from '@/components/KpiCard';
import { LayoutDashboard, FolderGit2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const ExecutiveDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <PageShell title="Executive Dashboard (Dev 2)">
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#111827]">Executive Audit Dashboard</h1>
                        <p className="text-xs text-[#64748B]">Macro portfolio overview across 5,432 monitored MPLADS projects</p>
                    </div>
                    <button
                        onClick={() => navigate('/investigation/MPLADS-MH-2023-04521')}
                        className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded hover:bg-orange-700 shadow-sm"
                    >
                        Launch AI Investigator Case File →
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    <KpiCard title="Total Monitored Projects" value="5,432" subtitle="Active MPLADS Works" />
                    <KpiCard title="Total Sanctioned" value="₹678.5 Cr" subtitle="Financial Sanctions" />
                    <KpiCard title="Total Expenditure" value="₹543.0 Cr" subtitle="88.7% Utilization Rate" />
                    <KpiCard title="Active Open Alerts" value="287" subtitle="Flagged Anomalies" accentColor="#EA580C" />
                </div>
                <div className="bg-white rounded border border-[#E5E7EB] p-6 text-center space-y-3">
                    <ShieldCheck className="w-10 h-10 text-orange-600 mx-auto" />
                    <h3 className="text-base font-bold text-[#111827]">AI Intelligence Core Active</h3>
                    <p className="text-xs text-[#64748B] max-w-xl mx-auto">
                        The Executive Dashboard displays systemic health metrics. To inspect specific flagged projects, use the AI Alerts or Project Investigation case file experience.
                    </p>
                </div>
            </div>
        </PageShell>
    );
};
