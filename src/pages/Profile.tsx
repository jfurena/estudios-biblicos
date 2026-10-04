import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Edit, Loader2, MessageSquare, MessageCircle, Phone, Mail } from 'lucide-react';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { subscribe, subscribeDoc } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroups } from '../hooks/useData';
import type { AppUser, Person } from '../lib/types';
import { getMinistryLabel, getRoleLabel, getStatusMeta } from '../lib/constants';
import { toDate, whatsappLink } from '../lib/utils';

export default function Profile() {
    const { user } = useAuth();
    const { userId } = useParams();
    const targetUid = userId || user?.uid;
    // Remount per profile so loading state starts fresh
    return targetUid ? <ProfileView key={targetUid} uid={targetUid} /> : null;
}

function ProfileView({ uid }: { uid: string }) {
    const { user: currentUser, profile: ownProfile } = useAuth();
    const navigate = useNavigate();
    const { groups } = useGroups();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    // undefined = loading, null = not found
    const [profileDoc, setProfileDoc] = useState<AppUser | null | undefined>(undefined);
    const [people, setPeople] = useState<Person[]>([]);

    const isOwnProfile = currentUser?.uid === uid;

    useEffect(() => {
        return subscribeDoc<AppUser>("users", uid, setProfileDoc, (error) => {
            console.error("Error fetching profile:", error);
            setProfileDoc(null);
        });
    }, [uid]);

    // People this user is in charge of
    useEffect(() => {
        return subscribe<Person>("people", { inChargeId: uid }, setPeople);
    }, [uid]);

    // Own profile falls back to the session data when the record is missing
    const profileUser = profileDoc ?? (isOwnProfile && profileDoc === null ? ownProfile : null);

    const stats = useMemo(() => {
        const status = (p: Person) => getStatusMeta(p.status).value;
        return {
            total: people.length,
            active: people.filter(p => status(p) === 'active').length,
            pending: people.filter(p => status(p) === 'pending').length,
            completed: people.filter(p => status(p) === 'completed').length,
        };
    }, [people]);

    const userGroups = useMemo(() => groups.filter(g => g.members?.includes(uid)), [groups, uid]);
    const ministries = useMemo(
        () => [...new Set(userGroups.map(g => g.ministry).filter(Boolean))].map(m => getMinistryLabel(m)),
        [userGroups]
    );

    if (profileDoc === undefined) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-500" /></div>;
    }

    if (!profileUser) {
        return <div className="text-center py-10 text-slate-400">Usuario no encontrado.</div>;
    }

    const createdAt = toDate(profileUser.createdAt);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight">Perfil</h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-1 p-8 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col items-center text-center"
                >
                    <div className="h-32 w-32 rounded-full bg-slate-700 overflow-hidden ring-4 ring-slate-800 mb-6">
                        {profileUser.photoURL ? (
                            <img src={profileUser.photoURL} alt={profileUser.name} className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-full w-full text-slate-500 p-6" />
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">{profileUser.name || 'Sin Nombre'}</h2>
                    <p className="text-slate-400 text-sm mb-4">{profileUser.username || ''}</p>
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 mb-4">
                        {getRoleLabel(profileUser.role)}
                    </span>

                    <div className="space-y-1 text-sm text-slate-400 mb-4">
                        {profileUser.email && <p className="flex items-center justify-center gap-2"><Mail className="h-3.5 w-3.5" />{profileUser.email}</p>}
                        {profileUser.phone && <p className="flex items-center justify-center gap-2"><Phone className="h-3.5 w-3.5" />{profileUser.phone}</p>}
                    </div>

                    <p className="text-xs text-slate-500 mb-8">
                        {createdAt ? `Miembro desde ${createdAt.toLocaleDateString('es')}` : 'Miembro reciente'}
                    </p>

                    <div className="grid grid-cols-4 w-full gap-2 border-t border-slate-800 pt-6">
                        {[
                            { label: 'Totales', value: stats.total },
                            { label: 'Activos', value: stats.active },
                            { label: 'Pendientes', value: stats.pending },
                            { label: 'Completados', value: stats.completed },
                        ].map(stat => (
                            <div key={stat.label} className="text-center">
                                <div className="text-xl font-bold text-white">{stat.value}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <div className="col-span-1 lg:col-span-2 space-y-6">
                    {/* Grupos y Ministerios */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl space-y-4"
                    >
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-slate-400" />
                            <h3 className="text-lg font-semibold text-white">Grupos y Ministerios</h3>
                        </div>
                        {ministries.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {ministries.map(m => (
                                    <span key={m} className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{m}</span>
                                ))}
                            </div>
                        )}
                        {userGroups.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {userGroups.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => navigate(`/groups/${g.id}`)}
                                        className="p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-left transition-colors"
                                    >
                                        <p className="text-sm font-medium text-white truncate">{g.name}</p>
                                        <p className="text-xs text-slate-500">{getMinistryLabel(g.ministry) || 'Sin ministerio'}{g.createdBy === uid ? ' · Líder' : ''}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No es parte de ningún grupo.</p>
                        )}
                    </motion.div>

                    {/* Acciones */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <h3 className="text-lg font-semibold text-white mb-6">Acciones</h3>

                        {isOwnProfile ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <button
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors border border-slate-700 w-fit"
                                >
                                    <Edit className="h-4 w-4" />
                                    Editar Perfil
                                </button>
                                {!profileUser.phone && (
                                    <p className="text-sm text-slate-500">Añade tu teléfono en "Editar Perfil" para que te contacten por WhatsApp.</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => navigate('/messages', { state: { startChatWith: { id: uid, name: profileUser.name, photoURL: profileUser.photoURL } } })}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    Enviar mensaje
                                </button>
                                {profileUser.phone && (
                                    <a
                                        href={whatsappLink(profileUser.phone)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        WhatsApp
                                    </a>
                                )}
                            </div>
                        )}
                    </motion.div>

                    {/* Personas a cargo */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <h3 className="text-lg font-semibold text-white mb-4">Personas a cargo ({people.length})</h3>
                        {people.length > 0 ? (
                            <div className="space-y-2">
                                {people.map(p => {
                                    const meta = getStatusMeta(p.status);
                                    return (
                                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40">
                                            <div className="min-w-0">
                                                <p className="text-sm text-white truncate">{`${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Sin Nombre'}</p>
                                                <p className="text-xs text-slate-500 truncate">{p.study || 'Sin estudio'}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${meta.className}`}>{meta.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No tiene personas asignadas.</p>
                        )}
                    </motion.div>
                </div>
            </div>

            {isOwnProfile && (
                <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
            )}
        </div>
    );
}
