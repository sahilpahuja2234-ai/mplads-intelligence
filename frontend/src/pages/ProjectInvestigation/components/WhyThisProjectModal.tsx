import React from 'react';
import { RiskBreakdown, RiskComponent } from '@shared/types';
import { X, HelpCircle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { RiskPill } from '@/components/RiskPill';
interface WhyThisProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    riskBreakdown: RiskBreakdown;
    projectId: string;
}
export const WhyThisProjectModal: React.FC<WhyThisProjectModalProps> = ({
    isOpen,
    onClose,
    riskBreakdown,
    projectId,
}) => {
    if (!isOpen) return null;
    // Sort components by weighted contribution descending
    const sortedComponents = [...riskBreakdown.components].sort(
        (a, b) => b.score * b.weight - a.score * a.weight
    );
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl border border-[#E5E7EB] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8F9FA]">
                    <div className="flex items-center space-x-2">
                        <HelpCircle className="w-5 h-5 text-orange-600" />
                        <div>
                            <h3 className="text-base font-bold text-[#111827]">Why Is Project {projectId} Flagged?</h3>
                            <p className="text-xs text-[#64748B]">Explainable breakdown of official backend risk components & scoring weights</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-slate-200 text-[#64748B] hover:text-[#111827]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Top Score Banner */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-[#E5E7EB] rounded">
                        <div>
                            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block font-mono">Official Backend Risk Score</span>
                            <span className="text-3xl font-bold font-mono text-[#111827]">{riskBreakdown.risk_score.toFixed(1)}</span>
                            <span className="text-xs text-[#64748B] ml-1">/ 100</span>
                        </div>
                        <RiskPill level={riskBreakdown.risk_level} score={riskBreakdown.risk_score} size="lg" />
                    </div>
                    <div className="text-xs text-[#64748B] leading-relaxed bg-orange-50/50 p-3 rounded border border-orange-100 flex items-start space-x-2">
                        <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span>
                            <strong>How to interpret:</strong> The official risk score is computed by aggregating 8 specialized anomaly detectors. Below are the factors sorted by their contribution to this project's score.
                        </span>
                    </div>
                    {/* Component List */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono">Contributing Risk Factors</h4>
                        {sortedComponents.map((comp: RiskComponent, index: number) => {
                            const contribution = (comp.score * comp.weight).toFixed(1);
                            const isHighContributor = comp.score >= 50;
                            return (
                                <div
                                    key={comp.factor}
                                    className={`p-3.5 rounded border transition-all ${isHighContributor
                                        ? 'bg-white border-orange-200 shadow-sm'
                                        : 'bg-[#F8F9FA] border-[#E5E7EB]'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                                #{index + 1}
                                            </span>
                                            <span className="text-sm font-bold text-[#111827] tracking-tight">
                                                {comp.factor.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-3 text-xs font-mono">
                                            <span className="text-[#64748B]">
                                                Weight: <strong className="text-[#111827]">{(comp.weight * 100).toFixed(0)}%</strong>
                                            </span>
                                            <span className="text-[#64748B]">
                                                Score: <strong className={isHighContributor ? 'text-orange-600 font-bold' : 'text-[#111827]'}>{comp.score}/100</strong>
                                            </span>
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-semibold">
                                                +${contribution} pts
                                            </span>
                                        </div>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-2">
                                        <div
                                            className={`h-full rounded-full ${comp.score >= 75
                                                ? 'bg-red-500'
                                                : comp.score >= 50
                                                    ? 'bg-orange-500'
                                                    : comp.score >= 25
                                                        ? 'bg-amber-500'
                                                        : 'bg-emerald-500'
                                                }`}
                                            style={{ width: `${comp.score}%` }}
                                        />
                                    </div>
                                    {/* Explanation text */}
                                    <p className="text-xs text-[#64748B] mt-1 leading-normal">
                                        {comp.explanation}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#F8F9FA] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold bg-[#111827] text-white rounded hover:bg-slate-800"
                    >
                        Close Audit View
                    </button>
                </div>
            </div>
        </div>
    );
};
