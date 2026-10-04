import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, MessageCircle, Users2, MessageSquare, Loader2 } from 'lucide-react';
import { cn, normalizeText, whatsappLink } from '../lib/utils';
import { CreateGroupModal } from '../components/people/CreateGroupModal';
import { useGroups, useUsers } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { MINISTRIES, getMinistryLabel, getRoleLabel } from '../lib/constants';
import type { AppUser, Group } from '../lib/types';

const tabs = ['Personas', 'Grupos', 'Ministerios'] as const;
type Tab = typeof tabs[number];

export default function People() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser } = useAuth();
    const { users, loading: usersLoading } = useUsers();
    const { groups, loading: groupsLoading } = useGroups();

    const [activeTab, setActiveTab] = useState<Tab>(() => (tabs.includes(location.state?.tab) ? location.state.tab : 'Personas'));
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [search, setSearch] = useState('');

    const term = normalizeText(search);

    const filteredUsers = useMemo(() => {
        if (!term) return users;
        return users.filter(u => normalizeText(`${u.name} ${u.username} ${u.email}`).includes(term));
    }, [users, term]);

    const filteredGroups = useMemo(() => {
        if (!term) return groups;
        return groups.filter(g => normalizeText(`${g.name} ${g.description} ${getMinistryLabel(g.ministry)}`).includes(term));
    }, [groups, term]);

    const handleWhatsApp = (e: React.MouseEvent, user: AppUser) => {
        e.stopPropagation();
        if (user.phone) {
            window.open(whatsappLink(user.phone), '_blank');
        }
    };

    const handleMessage = (e: React.MouseEvent, user: AppUser) => {
        e.stopPropagation();
        navigate('/messages', { state: { startChatWith: { id: user.id, name: user.name, photoURL: user.photoURL } } });
    };

    const renderGroupCard = (group: Group, i: number) => (
        <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 10) * 0.05 }}
            onClick={() => navigate(`/groups/${group.id}`)}
            className="p-6 rounded-xl bg-slate-950 border border-slate-800/60 shadow-lg hover:border-slate-700 transition-all cursor-pointer group relative overflow-hidden"
        >
            <div className="flex items-start gap-4 relative z-10">
                {group.imageUrl ? (
                    <img src={group.imageUrl} alt={group.name} className="h-14 w-14 rounded-full object-cover bg-slate-800 shrink-0" />
                ) : (
                    <div className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl bg-slate-800 border border-slate-700 shrink-0">
                        {group.name.substring(0, 1).toUpperCase()}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-1 truncate">{group.name}</h3>
                    <p className="text-sm text-slate-400 mb-3">{group.description || 'Sin descripción'}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {group.members?.length || 0} miembros
                        </div>
                        {group.ministry && <span>{getMinistryLabel(group.ministry)}</span>}
                        {currentUser && group.members?.includes(currentUser.uid) && (
                            <span className="text-emerald-400">Eres miembro</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderContent = () => {
        if (usersLoading || groupsLoading) {
            return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;
        }

        if (activeTab === 'Personas') {
            if (filteredUsers.length === 0) return <div className="text-slate-500 text-center py-10">No se encontraron usuarios.</div>;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user, i) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i, 10) * 0.05 }}
                            onClick={() => navigate(`/profile/${user.id}`)}
                            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 group"
                        >
                            {user.photoURL ? (
                                <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-slate-800 shrink-0">
                                    <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 uppercase shrink-0">
                                    {(user.name || user.email || '?')[0]}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <h3 className="text-white font-medium truncate">
                                    {user.name || 'Usuario'}
                                    {user.id === currentUser?.uid && <span className="text-slate-500 text-sm"> (tú)</span>}
                                </h3>
                                {user.username && <p className="text-xs text-slate-400 truncate">{user.username}</p>}
                                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">
                                    {getRoleLabel(user.role)}
                                </span>
                            </div>

                            {user.id !== currentUser?.uid && (
                                <div className="flex flex-col gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleMessage(e, user)}
                                        className="p-2 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                                        title="Enviar mensaje"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                    </button>
                                    {user.phone && (
                                        <button
                                            onClick={(e) => handleWhatsApp(e, user)}
                                            className="p-2 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                                            title="Chatear por WhatsApp"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            );
        }

        if (activeTab === 'Grupos') {
            if (filteredGroups.length === 0) {
                return <div className="text-slate-500 text-center py-10">{groups.length === 0 ? 'No hay grupos registrados.' : 'No se encontraron grupos.'}</div>;
            }
            return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredGroups.map(renderGroupCard)}</div>;
        }

        // Ministerios: groups organised by ministry
        const sections = MINISTRIES
            .map(m => ({ ...m, groups: filteredGroups.filter(g => g.ministry === m.value) }))
            .filter(section => section.groups.length > 0);

        if (sections.length === 0) {
            return <div className="text-slate-500 text-center py-10">No hay grupos asignados a ministerios. Asigna uno al crear o editar un grupo.</div>;
        }

        return (
            <div className="space-y-8">
                {sections.map(section => (
                    <div key={section.value} className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">{section.label} <span className="text-sm text-slate-500">({section.groups.length})</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{section.groups.map(renderGroupCard)}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Personas</h1>
                    <p className="text-slate-400">Busca, encuentra y conecta.</p>
                </div>
                <button
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] w-fit"
                >
                    <Users2 className="h-4 w-4" />
                    Crear Grupo
                </button>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={activeTab === 'Personas' ? 'Buscar por nombre, @usuario o email...' : 'Buscar grupos...'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeTab === tab
                                    ? "bg-slate-800 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {renderContent()}

            <CreateGroupModal
                isOpen={isCreateGroupOpen}
                onClose={() => setIsCreateGroupOpen(false)}
                onCreated={(id) => navigate(`/groups/${id}`)}
            />
        </div>
    );
}
