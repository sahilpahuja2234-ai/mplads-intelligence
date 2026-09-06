import React, { useState } from 'react';
import { Project, RiskBreakdown, RiskLevel, AlertType } from '@shared/types';
import { Sliders, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { RiskPill } from '@/components/RiskPill';
interface RiskSimulatorProps {
    project: Project;
    riskBreakdown: RiskBreakdown;
}
export const RiskSimulator: React.FC<RiskSimulatorProps> = ({ project, riskBreakdown }) => {
    // Extract initial baseline values
    const initialDaysOverdue = 312;
    const initialProgressPct = project.financials.utilization_pct || 35;
    const initialExpenditureLakh = project.financials.expenditure_amount / 100000;
    const sanctionedLakh = project.financials.sanctioned_amount / 100000;
    // Simulator State
    const [daysOverdue, setDaysOverdue] = useState<number>(initialDaysOverdue);
    const [reportedProgress, setReportedProgress] = useState<number>(initialProgressPct);
    const [expenditureLakh, setExpenditureLakh] = useState<number>(initialExpenditureLakh);
    // Recalculate hypothetical scores for affected components
    // 1. Simulated Delay Score (0-100 based on days overdue)
    const simDelayScore = Math.min(100, Math.max(0, Math.round((daysOverdue / 365) * 100)));
    // 2. Simulated Cost Overrun Score (0-100 based on expenditure exceeding sanctioned amount)
    const overrunPct = Math.max(0, (expenditureLakh - sanctionedLakh) / sanctionedLakh);
    const simCostOverrunScore = Math.min(100, Math.round(overrunPct * 200));
    // 3. Simulated Payment/Expenditure Anomaly (gap between expenditure % and progress %)
    const expPct = Math.min(100, (expenditureLakh / sanctionedLakh) * 100);
    const progressGap = Math.max(0, expPct - reportedProgress);
    const simPaymentScore = Math.min(100, Math.round(progressGap * 1.5));
    // Combine with original static scores for un-simulated components using §10 weights:
    // delay: 0.20, cost_overrun: 0.15, payment: 0.15, exp_anomaly: 0.15, compliance: 0.15, duplicate: 0.10, geo: 0.05, spending: 0.05
    const getOrigScore = (factor: AlertType) => {
        const found = riskBreakdown.components.find((c) => c.factor === factor);
        return found ? found.score : 0;
    };
    const simComponents = [
        { factor: 'DELAY' as AlertType, score: simDelayScore, weight: 0.20 },
        { factor: 'COST_OVERRUN' as AlertType, score: simCostOverrunScore, weight: 0.15 },
        { factor: 'PAYMENT_ANOMALY' as AlertType, score: simPaymentScore, weight: 0.15 },
        { factor: 'EXPENDITURE_ANOMALY' as AlertType, score: getOrigScore('EXPENDITURE_ANOMALY'), weight: 0.15 },
        { factor: 'COMPLIANCE_VIOLATION' as AlertType, score: getOrigScore('COMPLIANCE_VIOLATION'), weight: 0.15 },
        { factor: 'DUPLICATE_PROJECT' as AlertType, score: getOrigScore('DUPLICATE_PROJECT'), weight: 0.10 },
        { factor: 'GEOGRAPHIC_ANOMALY' as AlertType, score: getOrigScore('GEOGRAPHIC_ANOMALY'), weight: 0.05 },
        { factor: 'SPENDING_PATTERN' as AlertType, score: getOrigScore('SPENDING_PATTERN'), weight: 0.05 },
    ];
    const simRiskScore = Number(
        simComponents.reduce((acc, c) => acc + c.score * c.weight, 0).toFixed(1)
    );
    const delta = Number((simRiskScore - riskBreakdown.risk_score).toFixed(1));
    // Determine simulated risk level threshold per §10 (LOW: 0-29, MEDIUM: 30-54, HIGH: 55-74, CRITICAL: 75-100)
    let simRiskLevel: RiskLevel = 'LOW';
    if (simRiskScore >= 75) simRiskLevel = 'CRITICAL';
    else if (simRiskScore >= 55) simRiskLevel = 'HIGH';
    else if (simRiskScore >= 30) simRiskLevel = 'MEDIUM';
    // Reset to original project baseline
    const handleReset = () => {
        setDaysOverdue(initialDaysOverdue);
        setReportedProgress(initialProgressPct);
        setExpenditureLakh(initialExpenditureLakh);
    };

    return (
        <div className="bg-white rounded border border-[#E5E7EB] p-5 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-orange-100 text-orange-600 rounded">
                        <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#111827] tracking-tight">Risk Simulator (What-If Analysis)</h3>
                        <p className="text-[11px] text-[#64748B]">Hypothetically test operational variable changes on risk score</p>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="inline-flex items-center space-x-1 text-xs text-[#64748B] hover:text-[#111827] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Baseline</span>
                </button>
            </div>
            {/* Mandatory Disclaimer Alert */}
            <div className="bg-amber-50 border border-amber-200 rounded p-2.5 flex items-center space-x-2 text-xs text-amber-900 font-mono">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                    <strong>Simulation only:</strong> Does not modify official backend risk score or database records.
                </span>
            </div>
            {/* Interactive Controls & Output Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Sliders */}
                <div className="space-y-4">
                    {/* Input 1: Days Overdue */}
                    <div>
                        <div className="flex justify-between text-xs font-semibold text-[#111827] mb-1">
                            <span>Completion Delay (Days Overdue)</span>
                            <span className="font-mono text-orange-600 font-bold">{daysOverdue} days</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="730"
                            value={daysOverdue}
                            onChange={(e) => setDaysOverdue(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                        <div className="flex justify-between text-[10px] text-[#64748B] font-mono mt-0.5">
                            <span>0 days (On Time)</span>
                            <span>365 days</span>
                            <span>730 days (2 yrs)</span>
                        </div>
                    </div>
                    {/* Input 2: Reported Progress % */}
                    <div>
                        <div className="flex justify-between text-xs font-semibold text-[#111827] mb-1">
                            <span>Reported Physical Progress</span>
                            <span className="font-mono text-orange-600 font-bold">{reportedProgress}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={reportedProgress}
                            onChange={(e) => setReportedProgress(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                        <div className="flex justify-between text-[10px] text-[#64748B] font-mono mt-0.5">
                            <span>0% Progress</span>
                            <span>50% Progress</span>
                            <span>100% Complete</span>
                        </div>
                    </div>
                    {/* Input 3: Expenditure Amount */}
                    <div>
                        <div className="flex justify-between text-xs font-semibold text-[#111827] mb-1">
                            <span>Disbursed Expenditure (₹ Lakh)</span>
                            <span className="font-mono text-orange-600 font-bold">₹{expenditureLakh.toFixed(2)} L</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={sanctionedLakh * 1.5}
                            step="0.1"
                            value={expenditureLakh}
                            onChange={(e) => setExpenditureLakh(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                        <div className="flex justify-between text-[10px] text-[#64748B] font-mono mt-0.5">
                            <span>₹0 L</span>
                            <span>Sanctioned: ₹{sanctionedLakh.toFixed(2)} L</span>
                            <span>Overrun: ₹{(sanctionedLakh * 1.5).toFixed(2)} L</span>
                        </div>
                    </div>
                </div>
                {/* Right Column: Simulated Output Comparison */}
                <div className="bg-[#F8F9FA] rounded border border-[#E5E7EB] p-4 flex flex-col justify-between space-y-4">
                    <div>
                        <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono mb-3">
                            Simulated Risk Outcome
                        </h4>
                        <div className="flex items-center justify-between p-3 bg-white border border-[#E5E7EB] rounded">
                            <div>
                                <span className="text-[11px] text-[#64748B] block font-mono">Actual Risk Score</span>
                                <span className="text-xl font-bold font-mono text-[#111827]">
                                    {riskBreakdown.risk_score.toFixed(1)}
                                </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#64748B]" />
                            <div>
                                <span className="text-[11px] text-[#64748B] block font-mono">Simulated Risk Score</span>
                                <span className="text-xl font-bold font-mono text-orange-600">
                                    {simRiskScore.toFixed(1)}
                                </span>
                            </div>
                        </div>
                        {/* Score Delta & Risk Level */}
                        <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-[#64748B]">Score Shift (Delta):</span>
                            <span
                                className={`font-mono font-bold px-2 py-0.5 rounded ${delta > 0
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : delta < 0
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                            >
                                {delta > 0 ? `+${delta}` : delta} pts
                            </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-[#64748B]">Simulated Risk Level:</span>
                            <RiskPill level={simRiskLevel} score={simRiskScore} size="sm" />
                        </div>
                    </div>
                    <div className="pt-3 border-t border-[#E5E7EB] text-[11px] text-[#64748B]">
                        <strong>Top Simulated Factor: </strong>
                        <span className="font-mono text-[#111827] font-semibold">
                            {[...simComponents].sort((a, b) => b.score - a.score)[0].factor.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
