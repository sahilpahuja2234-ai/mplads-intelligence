import React, { useEffect, useState } from 'react';
import { PageShell } from '@/layout/PageShell';
import { Badge } from '@/components/Badge';
import { getPredictions } from '@/api/earlyWarning.api';
import { EarlyWarningPrediction } from '@shared/types';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const EarlyWarningPage: React.FC = () => {
    const [predictions, setPredictions] = useState<EarlyWarningPrediction[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        getPredictions().then((res) => setPredictions(res.data));
    }, []);
    return (
        <PageShell title="Early Warning Predictive Intelligence">
            <div className="space-y-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Predictive Early Warning Engine</h1>
                    <p className="text-xs text-[#64748B]">ML-driven forecast identifying projects with high probability of delay or overrun before occurrence</p>
                </div>
                <div className="bg-white rounded border border-[#E5E7EB] shadow-sm divide-y divide-[#E5E7EB]">
                    {predictions.map((pred, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between">
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-[#111827]">{pred.project_id}</span>
                                    <Badge variant="warning">{pred.prediction_type}</Badge>
                                    <span className="font-mono font-bold text-orange-600">
                                        {(pred.probability * 100).toFixed(0)}% Probability
                                    </span>
                                </div>
                                <div className="text-[#64748B] font-mono">Predicted Trigger Date: {pred.predicted_by}</div>
                                <div className="mt-1 space-y-0.5">
                                    {pred.key_drivers.map((driver, dIdx) => (
                                        <div key={dIdx} className="text-[#111827] flex items-center space-x-1">
                                            <span className="text-orange-500 font-bold">•</span>
                                            <span>{driver}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/investigation/${pred.project_id}`)}
                                className="px-3 py-1.5 bg-orange-600 text-white font-bold rounded text-xs hover:bg-orange-700 shrink-0"
                            >
                                Inspect Case File
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </PageShell>
    );
};