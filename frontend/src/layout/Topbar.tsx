import React, { useState } from 'react';
import { Search, Bell, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
interface TopbarProps {
    title?: string;
}
export const Topbar: React.FC<TopbarProps> = ({ title = 'Government Audit Intelligence System' }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/investigation/${searchQuery.trim()}`);
        }
    };
    return (
        <header className="h-14 bg-white border-b border-[#E5E7EB] fixed top-0 left-64 right-0 z-20 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">{title}</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> CONFIDENTIAL • FOR OFFICIAL AUDIT USE
                </span>
            </div>
            <div className="flex items-center space-x-4">
                {/* Quick Search */}
                <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                        type="text"
                        placeholder="Search Project ID (e.g. MPLADS-MH-2023-04521)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-80 pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E7EB] rounded text-[#111827] placeholder-[#64748B] focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
                </form>
                {/* Alerts Badge */}
                <button
                    onClick={() => navigate('/alerts')}
                    className="p-1.5 text-[#64748B] hover:text-[#111827] hover:bg-slate-100 rounded relative"
                    title="Open Alerts"
                >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                </button>
                {/* User Info */}
                <div className="flex items-center space-x-2 pl-3 border-l border-[#E5E7EB]">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold text-xs">
                        <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-semibold text-[#111827] leading-tight">Auditor General Cell</p>
                        <p className="text-[10px] text-[#64748B]">Ministry of Statistics & PI</p>
                    </div>
                </div>
            </div>
        </header>
    );
};
