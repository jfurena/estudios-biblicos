import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, BookOpen, ChevronLeft, Calendar, MapPin, Clock, Plus, MessageSquare, Pencil, Trash2, LogIn, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, subscribe, subscribeDoc } from '../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateGroupEventModal } from '../components/groups/CreateGroupEventModal';
import { CreateAnnouncementModal } from '../components/groups/CreateAnnouncementModal';
import { CreateGroupModal } from '../components/people/CreateGroupModal';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useData';
import type { Announcement, CalendarEvent, Group, Person } from '../lib/types';
import { getPersonName, toDate, toMillis } from '../lib/utils';
import { getMinistryLabel, getStatusMeta } from '../lib/constants';
import { logAudit } from '../lib/audit';

export default function GroupDetail() {
    const { id } = useParams();
    // Remount when navigating between groups so state starts fresh
    return id ? <GroupDetailView key={id} id={id} /> : null;
}

function GroupDetailView({ id }: { id: string }) {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { users } = useUsers();

    // undefined = loading, null = not found
    const [group, setGroup] = useState<Group | null | undefined>(undefined);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [groupPeople, setGroupPeople] = useState<Person[]>([]);

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        const groupUnsub = subscribeDoc<Group>("groups", id, setGroup, (error) => {
            console.error("Error loading group:", error);
            setGroup(null);
        });

        const eventsUnsub = subscribe<CalendarEvent>("events", { groupId: id }, (docs) => {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            setEvents(docs
                .filter(e => toMillis(e.date) >= startOfToday.getTime())
                .sort((a, b) => toMillis(a.date) - toMillis(b.date)));
        });

        const annUnsub = subscribe<Announcement>("announcements", { groupId: id }, (docs) => {
            setAnnouncements(docs
                .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
                .slice(0, 20));
        });

        // People (studies) assigned to this group
        const peopleUnsub = subscribe<Person>("people", { group: id }, setGroupPeople);

        return () => {
            groupUnsub();
            eventsUnsub();
            annUnsub();
            peopleUnsub();
        };
    }, [id]);

    const members = useMemo(() => {
        if (!group?.members) return [];
        return group.members.map(uid => users.find(u => u.id === uid) || { id: uid, name: 'Usuario' });
    }, [group, users]);

    const stats = useMemo(() => {
        const status = (p: Person) => getStatusMeta(p.status).value;
        return {
            total: groupPeople.length,
            active: groupPeople.filter(p => status(p) === 'active').length,
            completed: groupPeople.filter(p => status(p) === 'completed').length,
            male: groupPeople.filter(p => p.gender === 'male').length,
            female: groupPeople.filter(p => p.gender === 'female').length,
        };
    }, [groupPeople]);

    if (group === undefined) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
    }

    if (group === null) {
        return (
            <div className="py-20 text-center space-y-4">
                <p className="text-slate-400">Grupo no encontrado.</p>
                <button onClick={() => navigate('/people', { state: { tab: 'Grupos' } })} className="text-emerald-400 hover:underline">Ver todos los grupos</button>
            </div>
        );
    }

    const isMember = !!user && !!group.members?.includes(user.uid);
    const canManageGroup = isAdmin || (!!user && group.createdBy === user.uid);
    const canPost = isMember || canManageGroup;

    const handleJoinLeave = async () => {
        if (!user) return;
        if (isMember && !window.confirm('¿Salir de este grupo?')) return;
        try {
            await api.update('groups', id, {
                ...(isMember ? { $pull: { members: user.uid } } : { $addToSet: { members: user.uid } })
            });
            logAudit(`${isMember ? 'Salió del' : 'Se unió al'} grupo: ${group.name}`);
        } catch (err) {
            console.error(err);
            alert("No se pudo actualizar la membresía.");
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm(`¿Eliminar el grupo "${group.name}"? Las personas asignadas quedarán sin grupo.`)) return;
        try {
            await api.remove('groups', id);
            logAudit(`Eliminó el grupo: ${group.name}`);
            navigate('/people', { state: { tab: 'Grupos' } });
        } catch (err) {
            console.error(err);
            alert("Error al eliminar el grupo.");
        }
    };

    const handleDeleteEvent = async (event: CalendarEvent) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este evento?")) return;
        try {
            await api.remove('events', event.id);
            logAudit(`Eliminó el evento: ${event.title || ''}`);
        } catch (err) {
            console.error(err);
            alert("Error al eliminar el evento.");
        }
    };

    const handleDeleteAnnouncement = async (annId: string) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este comunicado?")) return;
        try {
            await api.remove('announcements', annId);
        } catch (err) {
            console.error(err);
            alert("Error al eliminar el comunicado.");
        }
    };

    return (
        <div className="space-y-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
            >
                <ChevronLeft className="h-5 w-5" />
                Volver
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Group Info & Stats */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col items-center text-center"
                    >
                        <div className="h-32 w-32 rounded-full mb-4 ring-4 ring-slate-800 overflow-hidden">
                            {group.imageUrl ? (
                                <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white text-5xl font-bold">{(group.name || '?').substring(0, 1).toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-1">{group.name}</h1>
                        {group.description && <p className="text-slate-400 text-sm mb-2">{group.description}</p>}
                        <p className="text-slate-500 text-sm mb-4">{getMinistryLabel(group.ministry) || 'Sin Ministerio'}</p>

                        <div className="text-sm font-medium text-slate-500 mb-6">
                            {members.length} miembros · {stats.total} personas en estudio
                        </div>

                        <div className="flex flex-wrap justify-center gap-2">
                            <button
                                onClick={handleJoinLeave}
                                className={isMember
                                    ? "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-red-500/10 hover:text-red-400 border border-slate-700"
                                    : "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500"}
                            >
                                {isMember ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                                {isMember ? 'Salir del grupo' : 'Unirme al grupo'}
                            </button>
                            {canManageGroup && (
                                <>
                                    <button onClick={() => setIsEditGroupOpen(true)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700" title="Editar grupo">
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={handleDeleteGroup} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400 border border-slate-700" title="Eliminar grupo">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* Actions (members only) */}
                    {canPost && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                        >
                            <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Acciones</h2>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-400 font-medium transition-colors"
                                >
                                    <Calendar className="h-5 w-5" />
                                    Crear Evento
                                </button>
                                <button
                                    onClick={() => { setEditingAnnouncement(null); setIsAnnouncementModalOpen(true); }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 text-blue-400 font-medium transition-colors"
                                >
                                    <MessageSquare className="h-5 w-5" />
                                    Crear Comunicado
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Study Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <BookOpen className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-semibold text-white">Estadísticas de Estudios</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-3xl font-bold text-white">{stats.total}</div>
                                <div className="text-xs text-slate-500">Personas</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-blue-400">{stats.active}</div>
                                <div className="text-xs text-slate-500">Activos</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-emerald-400">{stats.completed}</div>
                                <div className="text-xs text-slate-500">Completados</div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 mt-4 text-xs text-slate-400">
                            <span><span className="text-blue-400 font-bold">{stats.male}</span> Hombres</span>
                            <span><span className="text-pink-400 font-bold">{stats.female}</span> Mujeres</span>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Eventos Próximos */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold text-white">Eventos Próximos</h2>
                            </div>
                            {canPost && (
                                <button onClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }} className="p-1 hover:bg-slate-800 rounded-lg transition-colors" title="Crear evento">
                                    <Plus className="h-4 w-4 text-emerald-500" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {events.length > 0 ? (
                                events.map((event) => {
                                    const date = toDate(event.date);
                                    const canEdit = isAdmin || user?.uid === event.userId;
                                    return (
                                        <div key={event.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 flex items-start gap-4">
                                            <div className="flex flex-col items-center justify-center bg-slate-800 rounded-lg p-2 min-w-[3.5rem] border border-slate-700">
                                                <span className="text-xs text-emerald-500 font-bold uppercase">{date && format(date, 'MMM', { locale: es })}</span>
                                                <span className="text-xl font-bold text-white">{date && format(date, 'd')}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-white font-medium">{event.title}</h3>
                                                    {canEdit && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={() => { setEditingEvent(event); setIsEventModalOpen(true); }}
                                                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEvent(event)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {event.time || 'Hora no definida'}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {event.location || 'Sin ubicación'}
                                                    </div>
                                                </div>
                                                {event.description && <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{event.description}</p>}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 text-slate-500 text-sm">No hay eventos próximos.</div>
                            )}
                        </div>
                    </motion.div>

                    {/* Comunicados */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="h-5 w-5 text-blue-500" />
                                <h2 className="text-lg font-semibold text-white">Comunicados</h2>
                            </div>
                            {canPost && (
                                <button onClick={() => { setEditingAnnouncement(null); setIsAnnouncementModalOpen(true); }} className="p-1 hover:bg-slate-800 rounded-lg transition-colors" title="Crear comunicado">
                                    <Plus className="h-4 w-4 text-blue-500" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {announcements.length > 0 ? (
                                announcements.map((ann) => {
                                    const date = toDate(ann.createdAt);
                                    const canEdit = isAdmin || user?.uid === ann.userId;
                                    return (
                                        <div key={ann.id} className="p-4 rounded-lg bg-slate-800/20 border border-slate-800/50">
                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white shrink-0">
                                                        {(ann.createdBy || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs text-slate-300 font-medium truncate">{ann.createdBy || 'Usuario'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-slate-500">
                                                        {date ? format(date, "d 'de' MMM, HH:mm", { locale: es }) : 'Reciente'}
                                                    </span>
                                                    {canEdit && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => { setEditingAnnouncement(ann); setIsAnnouncementModalOpen(true); }}
                                                                className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{ann.text}</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 text-slate-500 text-sm">No hay comunicados aún.</div>
                            )}
                        </div>
                    </motion.div>

                    {/* Miembros (usuarios de la app) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-semibold text-white">Miembros ({members.length})</h2>
                        </div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {members.length > 0 ? members.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => navigate(`/profile/${member.id}`)}
                                    className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 flex items-center gap-3 text-left transition-colors"
                                >
                                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white overflow-hidden shrink-0">
                                        {'photoURL' in member && member.photoURL
                                            ? <img src={member.photoURL} alt="" className="h-full w-full object-cover" />
                                            : (member.name || '?').substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-slate-300 font-medium truncate">{member.name || 'Usuario'}</span>
                                </button>
                            )) : (
                                <p className="text-slate-500 text-sm">Este grupo aún no tiene miembros.</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Personas en estudio */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <div className="flex items-center gap-3">
                            <BookOpen className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-semibold text-white">Personas en estudio ({groupPeople.length})</h2>
                        </div>
                        <div className="mt-4 space-y-2">
                            {groupPeople.length > 0 ? groupPeople.map(person => {
                                const name = getPersonName(person);
                                const meta = getStatusMeta(person.status);
                                return (
                                    <div key={person.id} className="p-3 rounded-lg bg-slate-800/50 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white shrink-0">
                                            {name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-slate-300 font-medium truncate">{name}</span>
                                            <span className="text-xs text-slate-500">{meta.label}{person.study ? ` · ${person.study}` : ''}</span>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-slate-500 text-sm">No hay personas asignadas a este grupo. Asígnalas desde Estudios.</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            <CreateGroupEventModal
                isOpen={isEventModalOpen}
                onClose={() => { setIsEventModalOpen(false); setEditingEvent(null); }}
                groupId={id}
                initialData={editingEvent}
            />
            <CreateAnnouncementModal
                isOpen={isAnnouncementModalOpen}
                onClose={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }}
                groupId={id}
                initialData={editingAnnouncement}
            />
            <CreateGroupModal
                isOpen={isEditGroupOpen}
                onClose={() => setIsEditGroupOpen(false)}
                group={group}
            />
        </div>
    );
}
