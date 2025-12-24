import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';
import { Menu } from 'lucide-react';

export function Layout() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    return (
        <div className={cn("min-h-screen font-sans bg-background text-foreground transition-colors duration-300 lg:flex", isDarkMode ? "dark" : "")}>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 w-full z-50 bg-slate-950 border-b border-border/10 px-4 h-16 flex items-center justify-between">
                <span className="text-lg font-bold text-white tracking-tight">Bible Talks Tracker</span>
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white">
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* Sidebar - Desktop & Mobile Drawer */}
            <div className={cn(
                "fixed inset-0 z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-64 lg:block",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Overlay for mobile */}
                <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}></div>

                <div className="relative z-50 h-full">
                    <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} onClose={() => setSidebarOpen(false)} />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 min-h-screen pt-16 lg:pt-0 p-4 lg:p-8 bg-black/95 w-full">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
