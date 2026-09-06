import React, { useEffect, useState } from 'react';
import { PageShell } from '@/layout/PageShell';
import { getDemoScenarios, activateDemoScenario } from '@/api/demo.api';
import { DemoScenario } from '@shared/types';
import { PlaySquare, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const DemoScenariosPage: React.FC = () => {
    const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        getDemoScenarios().then((res) => setScenarios(res.scenarios));
    }, []);
    const handleActivate = (id: string) => {
        activateDemoScenario(id).then((res) => {
            if (res.navigate_to) {
                navigate(res.navigate_to);
            }
        });
    };
    return (
        <PageShell title="Judge Demo Scenarios Hub">
            <div className="space-y-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Judge Demo Scenarios</h1>
                    <p className="text-xs text-[#64748B]">Pre-configured synthetic investigation stories for live demonstration</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {scenarios.map((sc) => (
                        <div key={sc.scenario_id} className="bg-white border border-[#E5E7EB] rounded p-5 shadow-sm space-y-3 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <PlaySquare className="w-4 h-4 text-orange-600" />
                                    <h3 className="text-base font-bold text-[#111827]">{sc.title}</h3>
                                </div>
                                <p className="text-xs text-[#64748B] leading-relaxed mt-2">{sc.narrative}</p>
                                <div className="mt-3 text-[11px] font-mono text-slate-500">
                                    Target Case ID: {sc.highlight_project_ids[0]}
                                </div>
                            </div>
                            <button
                                onClick={() => handleActivate(sc.scenario_id)}
                                className="w-full py-2 bg-orange-600 text-white font-bold text-xs rounded hover:bg-orange-700 inline-flex items-center justify-center space-x-1.5 transition-colors"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Launch Demo Case File</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </PageShell>
    );
};
