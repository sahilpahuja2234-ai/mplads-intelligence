import React, { useState } from 'react';
import { Project, Alert, ProjectSummary } from '@shared/types';
import { Network, User, Building2, MapPin, Copy, Bell, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
interface RelationshipGraphProps {
    project: Project;
    openAlerts: Alert[];
    relatedProjects: {
        same_vendor: ProjectSummary[];
        same_mp: ProjectSummary[];
        same_constituency: ProjectSummary[];
    };
    duplicateCluster: {
        cluster_id: string;
        similarity_score: number;
        member_count: number;
    } | null;
}
interface NodeDetail {
    id: string;
    type: 'PROJECT' | 'MP' | 'VENDOR' | 'CONSTITUENCY' | 'ALERT' | 'DUPLICATE';
    title: string;
    subtitle: string;
    details: string;
    route?: string;
}
export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
    project,
    openAlerts,
    relatedProjects,
    duplicateCluster,
}) => {
    const navigate = useNavigate();
    const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
    // Define nodes in visual layout around central project
    const nodes = [
        // Central Node
        {
            id: 'CENTER',
            type: 'PROJECT',
            title: project.project_id,
            subtitle: project.work_category,
            x: 250,
            y: 140,
            color: '#EA580C',
            icon: Network,
            details: `${project.work_description} (${project.status})`,
        },
        // Connected Nodes
        {
            id: 'MP_NODE',
            type: 'MP',
            title: project.mp.name,
            subtitle: `MP • ${project.mp.constituency}`,
            x: 70,
            y: 50,
            color: '#3B82F6',
            icon: User,
            details: `${project.mp.house} representative with ${relatedProjects.same_mp.length} other monitored project(s).`,
            route: `/analytics?mp_id=${project.mp.mp_id}`,
        },
        {
            id: 'VENDOR_NODE',
            type: 'VENDOR',
            title: project.vendor ? project.vendor.name : 'Unassigned Vendor',
            subtitle: project.vendor ? project.vendor.vendor_id : 'No Vendor Record',
            x: 430,
            y: 50,
            color: '#8B5CF6',
            icon: Building2,
            details: project.vendor
                ? `Executing vendor attached to ${relatedProjects.same_vendor.length} other project(s) in database.`
                : 'No registered vendor attached.',
            route: project.vendor ? `/analytics?vendor_id=${project.vendor.vendor_id}` : undefined,
        },
        {
            id: 'CONST_NODE',
            type: 'CONSTITUENCY',
            title: project.location.district,
            subtitle: `Constituency • ${project.location.state}`,
            x: 70,
            y: 230,
            color: '#10B981',
            icon: MapPin,
            details: `District location centroid (${project.location.latitude?.toFixed(4)}, ${project.location.longitude?.toFixed(4)}).`,
            route: `/map?district=${project.location.district}`,
        },
        {
            id: 'ALERT_NODE',
            type: 'ALERT',
            title: `${openAlerts.length} Active Alert(s)`,
            subtitle: openAlerts[0] ? openAlerts[0].title : 'No Alerts',
            x: 430,
            y: 230,
            color: '#EF4444',
            icon: Bell,
            details: openAlerts[0] ? openAlerts[0].description : 'All operational alerts resolved.',
            route: `/alerts?project_id=${project.project_id}`,
        },
    ];
    if (duplicateCluster) {
        nodes.push({
            id: 'DUP_NODE',
            type: 'DUPLICATE',
            title: `Cluster ${duplicateCluster.cluster_id}`,
            subtitle: `${(duplicateCluster.similarity_score * 100).toFixed(0)}% Similarity`,
            x: 250,
            y: 250,
            color: '#F59E0B',
            icon: Copy,
            details: `Cluster contains ${duplicateCluster.member_count} highly similar project descriptions/coordinates.`,
            route: `/duplicates?cluster_id=${duplicateCluster.cluster_id}`,
        });
    }
    return (
        <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                <div className="flex items-center space-x-2">
                    <Network className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono">
                        Relationship Intelligence Graph
                    </h3>
                </div>
                <span className="text-[10px] font-mono text-[#64748B] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Interactive Entity Map
                </span>
            </div>
            {/* SVG Canvas & Nodes */}
            <div className="relative bg-[#F8F9FA] rounded border border-[#E5E7EB] h-[280px] overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full absolute inset-0">
                    {/* Connection Lines from Center */}
                    {nodes
                        .filter((n) => n.id !== 'CENTER')
                        .map((n) => (
                            <line
                                key={n.id}
                                x1={250}
                                y1={140}
                                x2={n.x}
                                y2={n.y}
                                stroke="#CBD5E1"
                                strokeWidth={1.5}
                                strokeDasharray="4,4"
                            />
                        ))}
                </svg>
                {/* HTML Interactive Node Overlay */}
                <div className="relative w-[500px] h-[280px]">
                    {nodes.map((node) => {
                        const Icon = node.icon;
                        const isSelected = selectedNode?.id === node.id;
                        const isCenter = node.id === 'CENTER';
                        return (
                            <div
                                key={node.id}
                                onClick={() => setSelectedNode(node as NodeDetail)}
                                style={{ left: `${node.x - 65}px`, top: `${node.y - 25}px` }}
                                className={`absolute w-[130px] p-2 rounded-md border text-center cursor-pointer transition-all ${isCenter
                                    ? 'bg-orange-600 text-white border-orange-700 shadow-md font-bold'
                                    : isSelected
                                        ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-200'
                                        : 'bg-white border-[#E5E7EB] hover:border-slate-400 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center justify-center space-x-1">
                                    <Icon className={`w-3.5 h-3.5 ${isCenter ? 'text-white' : 'text-[#64748B]'}`} />
                                    <span
                                        className={`text-[11px] truncate font-mono ${isCenter ? 'text-white font-bold' : 'text-[#111827] font-semibold'
                                            }`}
                                    >
                                        {node.title}
                                    </span>
                                </div>
                                <span
                                    className={`text-[9px] truncate block mt-0.5 ${isCenter ? 'text-orange-100' : 'text-[#64748B]'
                                        }`}
                                >
                                    {node.subtitle}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Selected Node Details Box */}
            {selectedNode ? (
                <div className="bg-slate-50 border border-[#E5E7EB] rounded p-3 text-xs flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2 font-bold text-[#111827]">
                            <span>{selectedNode.title}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                {selectedNode.type}
                            </span>
                        </div>
                        <p className="text-[#64748B] mt-0.5">{selectedNode.details}</p>
                    </div>
                    {selectedNode.route && (
                        <button
                            onClick={() => navigate(selectedNode.route!)}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-white border border-orange-200 px-2.5 py-1 rounded shrink-0"
                        >
                            <span>Explore Entity</span>
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    )}
                </div>
            ) : (
                <p className="text-[11px] text-[#64748B] text-center font-mono">
                    Click any entity node above to inspect intelligence links
                </p>
            )}
        </div>
    );
};
