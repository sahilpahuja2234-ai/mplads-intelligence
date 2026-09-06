import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderGit2,
    MapPin,
    Bell,
    Search,
    Copy,
    BarChart3,
    AlertTriangle,
    FileCheck,
    PlaySquare,
    ShieldAlert,
} from 'lucide-react';
export const Sidebar: React.FC = () => {
    const navItems = [
        { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Dev 2' },
        { label: 'Projects', path: '/projects', icon: FolderGit2, category: 'Dev 2' },
        { label: 'Map Intelligence', path: '/map', icon: MapPin, category: 'Dev 2' },
        { label: 'AI Alerts', path: '/alerts', icon: Bell, category: 'Dev 3' },
        { label: 'Project Investigation', path: '/investigation/MPLADS-MH-2023-04521', icon: Search, category: 'Dev 3' },
        { label: 'Duplicate Detection', path: '/duplicates', icon: Copy, category: 'Dev 3' },
        { label: 'Analytics', path: '/analytics', icon: BarChart3, category: 'Dev 3' },
        { label: 'Early Warning', path: '/early-warning', icon: AlertTriangle, category: 'Dev 3' },
        { label: 'Compliance', path: '/compliance', icon: FileCheck, category: 'Dev 3' },
        { label: 'Demo Scenarios', path: '/demo', icon: PlaySquare, category: 'Dev 3' },
    ];
    return (
        <aside className="w-64 bg-[#111827] text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
                <div className="p-2 bg-orange-600 rounded text-white shadow-sm">
                    <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-sm text-white tracking-tight">MPLADS Audit AI</h1>
                    <p className="text-[10px] text-slate-400 font-mono">SIH 2026 • Problem 26102</p>
                </div>
            </div>
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Audit Navigation
                </div>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center px-3 py-2 text-xs font-medium rounded transition-colors ${isActive
                                    ? 'bg-orange-600/15 text-orange-400 font-semibold border-l-2 border-orange-500 pl-2.5'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4 mr-3 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {item.category === 'Dev 3' && (
                                <span className="ml-auto text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                                    AI
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>
            {/* Footer System Status */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>MSW Mock Server</span>
                </div>
                <span className="text-slate-500">v1.0 Frozen</span>
            </div>
        </aside>
    );
};
