import React from 'react';
import { LucideIcon } from 'lucide-react';
interface KpiCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: LucideIcon;
    trend?: {
        value: string;
        isPositive?: boolean;
    };
    className?: string;
    accentColor?: string;
}
export const KpiCard: React.FC<KpiCardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    className = '',
    accentColor,
}) => {
    return (
        <div className={`bg-white rounded border border-[#E5E7EB] p-4 shadow-sm relative overflow-hidden ${className}`}>
            {accentColor && (
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
            )}
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{title}</span>
                {Icon && <Icon className="w-4 h-4 text-[#64748B]" />}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tracking-tight text-[#111827]">{value}</span>
                {trend && (
                    <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                    >
                        {trend.value}
                    </span>
                )}
            </div>
            {subtitle && <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>}
        </div>
    );
};
