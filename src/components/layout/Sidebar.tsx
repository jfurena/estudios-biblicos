import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Calendar, Book, User as UserIcon, Settings, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../lib/constants';

interface SidebarProps {
    onClose?: () => void;
}

const navItems = [
    { icon: LayoutDashboard, label: 'Inicio', to: '/' },
    { icon: Users, label: 'Personas', to: '/people' },
    { icon: BookOpen, label: 'Estudios', to: '/studies' },
    { icon: Calendar, label: 'Agenda', to: '/schedule' },
    { icon: MessageSquare, label: 'Mensajes', to: '/messages' },
    { icon: Book, label: 'Guía de Estudios', to: '/guide' },
    { icon: UserIcon, label: 'Perfil', to: '/profile' },
];

export function Sidebar({ onClose }: SidebarProps) {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const displayName = profile?.name || user?.displayName || 'Usuario';

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
                            end={item.to === '/'}
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
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Administración</div>
                    </div>
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
                </nav>
            </div>

            <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-950/50 backdrop-blur-xl">
                {user && (
                    <button
                        onClick={() => { navigate('/profile'); onClose?.(); }}
                        className="w-full flex items-center gap-3 px-2 text-left rounded-lg hover:bg-slate-900 py-1.5 transition-colors"
                    >
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold overflow-hidden shrink-0">
                            {profile?.photoURL ? (
                                <img src={profile.photoURL} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                                (displayName[0] || user.email?.[0] || '?').toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{getRoleLabel(profile?.role)} · {user.email}</p>
                        </div>
                    </button>
                )}

                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}
