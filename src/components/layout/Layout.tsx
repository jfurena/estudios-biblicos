import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';
import { Menu, BookOpen } from 'lucide-react';

export function Layout() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen font-sans bg-slate-950 text-foreground lg:flex">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 w-full z-30 bg-slate-950 border-b border-slate-800 px-4 h-16 flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
                    <BookOpen className="h-5 w-5 text-emerald-400" />
                    Bible Talks Tracker
                </span>
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white" aria-label="Abrir menú">
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
            )}

            {/* Sidebar - Desktop & Mobile Drawer */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shrink-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 min-h-screen pt-20 lg:pt-8 p-4 lg:p-8 bg-black/95">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
