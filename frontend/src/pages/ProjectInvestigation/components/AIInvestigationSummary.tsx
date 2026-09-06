import React from 'react';
import { Project, RiskBreakdown, Alert, ComplianceViolation } from '@shared/types';
import { Bot, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
interface AIInvestigationSummaryProps {
    project: Project;
    riskBreakdown: RiskBreakdown;
    openAlerts: Alert[];
    complianceViolations: ComplianceViolation[];
}
export const AIInvestigationSummary: React.FC<AIInvestigationSummaryProps> = ({
    project,
    riskBreakdown,
    openAlerts,
    complianceViolations,
}) => {
    // Generate deterministic evidence-based findings strictly from backend structured data
    const topFactors = [...riskBreakdown.components]
        .sort((a, b) => b.score * b.weight - a.score * a.weight)
        .slice(0, 3);
    const highestRiskFactor = topFactors[0];
    let overallFinding = `Project ${project.project_id} exhibits a ${project.risk.risk_level} risk score of ${project.risk.risk_score.toFixed(
        1
    )}/100, driven primarily by ${highestRiskFactor ? highestRiskFactor.factor.replace(/_/g, ' ') : 'anomalous signals'}.`;
    if (project.risk.risk_level === 'CRITICAL') {
        overallFinding = `CRITICAL FRAUD & INEFFICIENCY ALERT: Project ${project.project_id} has exceeded acceptable governance thresholds with a risk score of ${project.risk.risk_score.toFixed(
            1
        )}/100. Immediate audit intervention is recommended.`;
    }
    const keyFindings: string[] = [];
    // Finding 1: Top risk factor driver
    if (highestRiskFactor) {
        keyFindings.push(
            `Primary Risk Driver: ${highestRiskFactor.factor.replace(/_/g, ' ')} (Score: ${highestRiskFactor.score}/100, Weight: ${(
                highestRiskFactor.weight * 100
            ).toFixed(0)}%). ${highestRiskFactor.explanation}`
        );
    }
    // Finding 2: Alerts breakdown
    if (openAlerts.length > 0) {
        const criticalOrHigh = openAlerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
        keyFindings.push(
            `${openAlerts.length} open alert(s) active (${criticalOrHigh} High/Critical). Latest alert: "${openAlerts[0].title}".`
        );
    } else {
        keyFindings.push('No active unhandled operational alerts currently open.');
    }
    // Finding 3: Compliance violations
    if (complianceViolations.length > 0) {
        keyFindings.push(
            `Statutory Compliance Breach: ${complianceViolations.length} violation(s) identified under rule ${complianceViolations[0].rule_title} (${complianceViolations[0].details}).`
        );
    } else if (!project.utilization_certificate_filed) {
        keyFindings.push(
            'Utilization Certificate (UC) remains unfiled despite funds release.'
        );
    }
    // Finding 4: Financial & vendor pattern
    if (project.vendor) {
        keyFindings.push(
            `Assigned Executing Vendor: ${project.vendor.name} (${project.vendor.vendor_id}). Financial Utilization: ${project.financials.utilization_pct.toFixed(
                1
            )}% (₹${(project.financials.expenditure_amount / 100000).toFixed(2)} Lakh spent of ₹${(
                project.financials.sanctioned_amount / 100000
            ).toFixed(2)} Lakh sanctioned).`
        );
    }
    // Action recommendation based on risk level & factor
    let recommendedAction = 'Maintain standard monitoring and request quarterly UC updates.';
    if (project.risk.risk_level === 'CRITICAL' || project.risk.risk_level === 'HIGH') {
        if (topFactors.some((f) => f.factor === 'PAYMENT_ANOMALY' || f.factor === 'EXPENDITURE_ANOMALY')) {
            recommendedAction = 'Dispatch District Vigilance Team for field physical verification before releasing subsequent installments.';
        } else if (topFactors.some((f) => f.factor === 'DELAY')) {
            recommendedAction = 'Issue formal show-cause notice to Implementing Agency regarding unexcused deadline overrun.';
        } else if (topFactors.some((f) => f.factor === 'DUPLICATE_PROJECT')) {
            recommendedAction = 'Initiate physical cross-verification with municipal GIS registry to rule out duplicate billing.';
        } else {
            recommendedAction = 'Freeze further fund disbursements and order formal financial audit.';
        }
    }
    return (
        <div className="bg-white rounded border border-[#E5E7EB] p-5 shadow-sm space-y-4 relative overflow-hidden">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-orange-100 text-orange-600 rounded">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#111827] tracking-tight">Automated Investigation Summary</h3>
                        <p className="text-[11px] text-[#64748B]">Evidence-based synthesis generated from structured audit signals</p>
                    </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Deterministic Engine • v1.0
                </span>
            </div>
            {/* Overall Finding */}
            <div className="bg-slate-50 border-l-4 border-orange-500 p-3 text-xs text-[#111827] font-medium leading-relaxed">
                {overallFinding}
            </div>
            {/* Key Findings List */}
            <div>
                <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 font-mono">Key Evidence & Findings</h4>
                <ul className="space-y-2">
                    {keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex items-start text-xs text-[#111827] space-x-2">
                            <span className="text-orange-500 font-bold font-mono mt-0.5">•</span>
                            <span>{finding}</span>
                        </li>
                    ))}
                </ul>
            </div>
            {/* Recommended Action CTA */}
            <div className="bg-orange-50/60 border border-orange-200 rounded p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-orange-950">
                    <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                        <span className="font-bold text-orange-900">Recommended Audit Action: </span>
                        <span>{recommendedAction}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

