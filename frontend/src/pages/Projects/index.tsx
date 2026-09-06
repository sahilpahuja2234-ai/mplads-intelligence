import React, { useEffect, useState } from 'react';
import { PageShell } from '@/layout/PageShell';
import { RiskPill } from '@/components/RiskPill';
import { Badge } from '@/components/Badge';
import { apiFetch } from '@/api/client';
import { ProjectSummary } from '@shared/types';
import { FolderGit2, Search, ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
export const ProjectsPage: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    // §11 Routing Rule: /projects/:id redirects to /investigation/:id
    useEffect(() => {
        if (id) {
            navigate(`/investigation/${id}`, { replace: true });
        }
    }, [id, navigate]);
    useEffect(() => {
        apiFetch<{ data: ProjectSummary[] }>('/projects')
            .then((res) => setProjects(res.data))
            .catch(() => { });
    }, []);
    return (
        <PageShell title="Projects Directory (Dev 2)">
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#111827]">Projects Master Registry</h1>
                        <p className="text-xs text-[#64748B]">Searchable table of all MPLADS works across states and districts</p>
                    </div>
                </div>
                <div className="bg-white rounded border border-[#E5E7EB] shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] font-mono text-[#64748B]">
                                <th className="p-3">Project ID</th>
                                <th className="p-3">MP Representative</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Sanctioned</th>
                                <th className="p-3">Risk Score</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                            {projects.map((p) => (
                                <tr key={p.project_id} className="hover:bg-slate-50 font-mono">
                                    <td className="p-3 font-bold text-[#111827]">{p.project_id}</td>
                                    <td className="p-3 font-sans font-semibold">{p.mp_name}</td>
                                    <td className="p-3 font-sans text-[#64748B]">{p.district}, {p.state}</td>
                                    <td className="p-3"><Badge variant="neutral">{p.work_category}</Badge></td>
                                    <td className="p-3 font-bold">₹{(p.sanctioned_amount / 100000).toFixed(2)}L</td>
                                    <td className="p-3"><RiskPill level={p.risk_level} score={p.risk_score} size="sm" /></td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => navigate(`/investigation/${p.project_id}`)}
                                            className="px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 font-bold rounded hover:bg-orange-100"
                                        >
                                            Investigate →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageShell>
    );
};
