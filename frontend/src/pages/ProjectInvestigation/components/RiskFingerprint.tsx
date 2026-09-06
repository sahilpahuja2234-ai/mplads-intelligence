import React from 'react';
import { RiskBreakdown, AlertType } from '@shared/types';
import { Shield, Fingerprint } from 'lucide-react';
interface RiskFingerprintProps {
  riskBreakdown: RiskBreakdown;
}
export const RiskFingerprint: React.FC<RiskFingerprintProps> = ({ riskBreakdown }) => {
  const dimensions: { key: AlertType; label: string }[] = [
    { key: 'DELAY', label: 'Delay' },
    { key: 'COST_OVERRUN', label: 'Cost Overrun' },
    { key: 'PAYMENT_ANOMALY', label: 'Payment' },
    { key: 'EXPENDITURE_ANOMALY', label: 'Expenditure' },
    { key: 'COMPLIANCE_VIOLATION', label: 'Compliance' },
    { key: 'DUPLICATE_PROJECT', label: 'Duplicate' },
    { key: 'GEOGRAPHIC_ANOMALY', label: 'Geo Anomaly' },
    { key: 'SPENDING_PATTERN', label: 'Spending' },
  ];
  // Map components to scores
  const scoreMap = new Map<string, number>();
  riskBreakdown.components.forEach((c) => {
    scoreMap.set(c.factor, c.score);
  });
  const scores = dimensions.map((d) => ({
    label: d.label,
    key: d.key,
    score: scoreMap.get(d.key) || 0,
  }));
  // Determine top 2 elevated dimensions for primary risk pattern string
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const primaryPattern = sorted
    .filter((s) => s.score >= 30)
    .slice(0, 2)
    .map((s) => s.label)
    .join(' + ');
  const patternText = primaryPattern
    ? `Primary risk pattern: ${primaryPattern}`
    : 'Primary risk pattern: Balanced / Low Risk';
  // SVG Radar Dimensions
  const size = 260;
  const center = size / 2;
  const radius = 85;
  const angleStep = (2 * Math.PI) / dimensions.length;
  const points = scores.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.score / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle, label: d.label, score: d.score };
  });
  const polygonPath = points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <div className="bg-white rounded border border-[#E5E7EB] p-4 shadow-sm space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Fingerprint className="w-4 h-4 text-orange-600" />
          <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono">
            Risk Fingerprint
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#64748B] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          8 Dimensions
        </span>
      </div>
      {/* Radar Chart SVG */}
      <div className="flex flex-col items-center justify-center relative py-1">
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric rings */}
          {[0.25, 0.5, 0.75, 1.0].map((level) => {
            const ringRadius = radius * level;
            const ringPoints = dimensions
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const x = center + ringRadius * Math.cos(angle);
                const y = center + ringRadius * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(' ');
            return (
              <polygon
                key={level}
                points={ringPoints}
                fill="none"
                stroke="#E5E7EB"
                strokeDasharray={level === 1.0 ? 'none' : '2,2'}
                strokeWidth={1}
              />
            );
          })}
          {/* Axes */}
          {dimensions.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            );
          })}
          {/* Radar Polygon */}
          <polygon
            points={polygonPath}
            fill="rgba(234, 88, 12, 0.2)"
            stroke="#EA580C"
            strokeWidth={2}
          />
          {/* Data Points & Labels */}
          {points.map((p, i) => {
            const labelRadius = radius + 22;
            const lx = center + labelRadius * Math.cos(p.angle);
            const ly = center + labelRadius * Math.sin(p.angle);
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={3} fill="#EA580C" stroke="#FFFFFF" strokeWidth={1} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[9px] font-mono fill-[#64748B] font-semibold"
                >
                  {p.label} ({p.score})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Primary Pattern Interpretation */}
      <div className="bg-[#F8F9FA] rounded p-2.5 border border-[#E5E7EB] text-center">
        <span className="text-xs font-semibold text-[#111827] block">
          {patternText}
        </span>
        <span className="text-[10px] text-[#64748B] block mt-0.5">
          Visual profile derived from normalized sub-detector scores
        </span>
      </div>
    </div>
  );
};
