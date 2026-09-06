import React from 'react';
import { RiskLevel } from '@shared/types';
interface RiskPillProps {
    level: RiskLevel;
    score?: number;
    size?: 'sm' | 'md' | 'lg';
    showScore?: boolean;
}
export const RiskPill: React.FC<RiskPillProps> = ({ level, score, size = 'md', showScore = true }) => {
    const styles: Record<RiskLevel, { bg: string; text: string; border: string; label: string }> = {
        LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'LOW RISK' },
        MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'MEDIUM RISK' },
        HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'HIGH RISK' },
        CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'CRITICAL RISK' },
    };
    const style = styles[level] || styles.LOW;
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs font-semibold',
        md: 'px-2.5 py-1 text-xs font-bold tracking-wide',
        lg: 'px-3 py-1.5 text-sm font-bold tracking-wide',
    }[size];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            <span>{style.label}</span>
            {showScore && score !== undefined && (
                <span className="font-mono opacity-90 border-l border-current/20 pl-1.5">
                    {score.toFixed(1)}
                </span>
            )}
        </span>
    );
};
