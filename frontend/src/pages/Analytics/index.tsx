import React, { useEffect, useState } from 'react';
import { PageShell } from '@/layout/PageShell';
import { getVendorAnalysis, getCategoryBreakdown, getExpenditureDistribution } from '@/api/analytics.api';
import { BarChart3, Building2, Layers } from 'lucide-react';
export const AnalyticsPage: React.FC = () => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [distribution, setDistribution] = useState<any[]>([]);
    useEffect(() => {
        Promise.all([getVendorAnalysis(), getCategoryBreakdown(), getExpenditureDistribution()])
            .then(([vRes, cRes, dRes]) => {
                setVendors(vRes.vendors);
                setCategories(cRes.categories);
                setDistribution(dRes.buckets);
            });
    }, []);
    return (
        <PageShell title="Portfolio & Vendor Analytics">
            <div className="space-y-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Audit Analytics & Expenditure Patterns</h1>
                    <p className="text-xs text-[#64748B]">Macro systemic analysis across vendors, work categories, and expenditure buckets</p>
                </div>
                {/* Categories Grid */}
                <div className="bg-white rounded border border-[#E5E7EB] p-5 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold font-mono text-[#64748B] uppercase">Work Category Risk Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {categories.map((c) => (
                            <div key={c.work_category} className="p-3 bg-[#F8F9FA] rounded border border-[#E5E7EB]">
                                <span className="text-xs font-bold text-[#111827] block font-mono">{c.work_category}</span>
                                <span className="text-lg font-bold font-mono text-orange-600 block mt-1">{c.project_count} Projects</span>
                                <span className="text-xs text-[#64748B]">Avg Risk: {c.avg_risk_score.toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Vendors Analysis */}
                <div className="bg-white rounded border border-[#E5E7EB] p-5 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold font-mono text-[#64748B] uppercase">High-Risk Vendor Profiling</h3>
                    <div className="divide-y divide-[#E5E7EB]">
                        {vendors.map((v) => (
                            <div key={v.vendor_id} className="py-3 flex items-center justify-between text-xs">
                                <div>
                                    <div className="font-bold text-[#111827] font-mono">{v.name} ({v.vendor_id})</div>
                                    <div className="text-[#64748B]">{v.project_count} total projects • ₹{(v.total_amount / 100000).toFixed(2)} Lakh total contract value</div>
                                </div>
                                <div className="text-right font-mono">
                                    <span className="text-red-600 font-bold block">{v.flagged_project_count} Flagged Projects</span>
                                    <span className="text-xs text-[#64748B]">Avg Risk: {v.avg_risk_score.toFixed(1)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageShell>
    );
};