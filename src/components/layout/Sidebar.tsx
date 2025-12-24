import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Calendar, Book, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
    onClose?: () => void;
}

export function Sidebar({ isDarkMode, toggleTheme, onClose }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
        { icon: Users, label: 'Personas', to: '/people' },
        { icon: BookOpen, label: 'Estudios', to: '/studies' },
        { icon: Calendar, label: 'Agenda', to: '/schedule' },
        { icon: Book, label: 'Guía de Estudios', to: '/guide' },
        { icon: UserIcon, label: 'Perfil', to: '/profile' },
    ];

    return (
        <aside className="h-full w-64 bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800">
            <div className="flex h-16 items-center px-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
                <BookOpen className="h-6 w-6 text-emerald-400 mr-2" />
                <span className="text-lg font-bold tracking-tight">Bible Talks</span>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/20"
                                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                                )
                            }
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </NavLink>
                    ))}

                    <div className="mt-8 px-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Admin</div>
                        <NavLink
                            to="/admin"
                            onClick={onClose}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                                )
                            }
                        >
                            <Settings className="h-5 w-5" />
                            Admin
                        </NavLink>
                    </div>
                </nav>
            </div>

            <div className="border-t border-slate-800 p-4 space-y-4 bg-slate-950/50 backdrop-blur-xl">
                {user && (
                    <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                            {user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user.displayName || 'Usuario'}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Dark Mode</span>
                    <button
                        onClick={toggleTheme}
                        className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950",
                            isDarkMode ? "bg-emerald-600" : "bg-slate-700"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                                isDarkMode ? "translate-x-6" : "translate-x-1"
                            )}
                        />
                    </button>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
