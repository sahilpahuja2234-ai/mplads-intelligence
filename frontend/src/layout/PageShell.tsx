import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
interface PageShellProps {
    children: React.ReactNode;
    title?: string;
}
export const PageShell: React.FC<PageShellProps> = ({ children, title }) => {
    return (
        <div className="min-h-screen bg-[#F8F9FA] flex">
            <Sidebar />
            <Topbar title={title} />
            <main className="flex-1 ml-64 mt-14 p-6 min-h-[calc(100vh-3.5rem)] overflow-x-hidden">
                {children}
            </main>
        </div>
    );
};
