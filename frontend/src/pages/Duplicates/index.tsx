import React, { useEffect, useState } from 'react';
import { PageShell } from '@/layout/PageShell';
import { Badge } from '@/components/Badge';
import { getDuplicates } from '@/api/duplicates.api';
import { DuplicateCluster } from '@shared/types';
import { Copy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const DuplicatesPage: React.FC = () => {
    const [clusters, setClusters] = useState<DuplicateCluster[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        getDuplicates().then((res) => setClusters(res.data));
    }, []);
    return (
        <PageShell title="Duplicate & Ghost Project Clusters">
            <div className="space-y-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Duplicate Project Detection</h1>
                    <p className="text-xs text-[#64748B]">TF-IDF work description similarity + GIS proximity clustering</p>
                </div>
                <div className="space-y-4">
                    {clusters.map((cluster) => (
                        <div key={cluster.cluster_id} className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-sm text-[#111827]">{cluster.cluster_id}</span>
                                    <Badge variant="warning">{cluster.cluster_reason}</Badge>
                                    <span className="text-xs font-mono font-bold text-orange-600">
                                        {(cluster.similarity_score * 100).toFixed(0)}% Match Score
                                    </span>
                                </div>
                                <span className="text-xs font-mono text-[#64748B]">
                                    {cluster.member_count} Member Projects • ₹{(cluster.total_sanctioned_amount / 100000).toFixed(2)} Lakh
                                </span>
                            </div>
                            <p className="text-xs text-[#64748B]">
                                States involved: {cluster.states_involved.join(', ')}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </PageShell>
    );
};
