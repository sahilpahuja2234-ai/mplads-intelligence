import React from 'react';
interface BadgeProps {
    children: React.ReactNode;
    variant?: 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'ai';
    size?: 'sm' | 'md';
    className?: string;
}
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm', className = '' }) => {
    const variantStyles = {
        neutral: 'bg-slate-100 text-slate-700 border-slate-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-red-50 text-red-700 border-red-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        ai: 'bg-orange-50 text-orange-700 border-orange-200 font-medium',
    }[variant];
    const sizeStyles = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs font-medium',
    }[size];
    return (
        <span className={`inline-flex items-center rounded border font-mono ${variantStyles} ${sizeStyles} ${className}`}>
            {children}
        </span>
    );
};
