import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, BookOpen, Clock, Users, Calendar, MessageSquare, ChevronRight, UserPlus, Loader2, Check } from 'lucide-react';
import { cn, getPersonName, normalizeText, toDate, toMillis } from '../lib/utils';
import { api, subscribe } from '../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useGroups } from '../hooks/useData';
import type { Announcement, CalendarEvent, Person } from '../lib/types';
import { logAudit } from '../lib/audit';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { groups } = useGroups();
    const [myPeople, setMyPeople] = useState<Person[] | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [groupSearch, setGroupSearch] = useState('');

    const myGroups = useMemo(() => groups.filter(g => user && g.members?.includes(user.uid)), [groups, user]);
    const myGroupIds = useMemo(() => myGroups.map(g => g.id), [myGroups]);
    const groupNames = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups]);

    // People I'm in charge of
    useEffect(() => {
        if (!user) return;
        return subscribe<Person>("people", { inChargeId: user.uid }, setMyPeople, (error) => {
            console.error("Error loading people:", error);
            setMyPeople([]);
        });
    }, [user]);

    // Upcoming events (from today on)
    useEffect(() => {
        return subscribe<CalendarEvent>("events", undefined, (docs) => {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            setEvents(docs.filter(e => toMillis(e.date) >= startOfToday.getTime()));
        }, (error) => console.error("Error loading events:", error));
    }, []);

    // Announcements from my groups
    useEffect(() => {
        return subscribe<Announcement>("announcements", undefined, setAnnouncements,
            (error) => console.error("Error loading announcements:", error));
    }, []);

    const visibleAnnouncements = useMemo(() => announcements
        .filter(a => myGroupIds.includes(a.groupId))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        .slice(0, 5), [announcements, myGroupIds]);

    const upcomingEvents = useMemo(() => {
        if (!user) return [];
        return events
            .filter(e => e.userId === user.uid || e.companionId === user.uid || (e.groupId && myGroupIds.includes(e.groupId)))
            .sort((a, b) => toMillis(a.date) - toMillis(b.date))
            .slice(0, 4);
    }, [events, user, myGroupIds]);

    const stats = useMemo(() => {
        const list = myPeople || [];
        const status = (p: Person) => (p.status || 'guest').toLowerCase();
        return {
            active: list.filter(p => status(p) === 'active').length,
            pending: list.filter(p => status(p) === 'pending').length,
            completed: list.filter(p => status(p) === 'completed').length,
            total: list.length,
        };
    }, [myPeople]);

    const lastStudy = useMemo(() => {
        if (!myPeople || myPeople.length === 0) return null;
        return [...myPeople].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))[0];
    }, [myPeople]);

    const filteredGroups = useMemo(() => {
        const term = normalizeText(groupSearch);
        const list = term
            ? groups.filter(g => normalizeText(g.name).includes(term) || normalizeText(g.description).includes(term))
            : groups;
        // Show my groups first
        return [...list].sort((a, b) => Number(myGroupIds.includes(b.id)) - Number(myGroupIds.includes(a.id))).slice(0, 6);
    }, [groups, groupSearch, myGroupIds]);

    const handleJoinGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
        e.stopPropagation();
        if (!user) return;
        try {
            await api.update('groups', groupId, { $addToSet: { members: user.uid } });
            logAudit(`Se unió al grupo: ${groupName}`);
        } catch (error) {
            console.error("Error joining group:", error);
            alert("No se pudo unir al grupo.");
        }
    };

    const statCards = [
        { label: 'Estudios Activos', value: stats.active, icon: Activity, color: 'text-emerald-400' },
        { label: 'Estudios Pendientes', value: stats.pending, icon: Clock, color: 'text-amber-400' },
        { label: 'Estudios Completados', value: stats.completed, icon: BookOpen, color: 'text-blue-400' },
        { label: 'Personas a mi cargo', value: stats.total, icon: Users, color: 'text-slate-400' },
    ];

    if (myPeople === null) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Inicio</h1>
                    <p className="text-slate-400">Hola{user?.displayName ? `, ${user.displayName}` : ''}. Este es tu resumen.</p>
                </div>
                <button
                    onClick={() => navigate('/studies', { state: { openAddPerson: true } })}
                    className='bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 w-fit'
                >
                    <UserPlus className="h-4 w-4" />
                    Nuevo Estudio
                </button>
            </header>

            {/* Resumen de Estudios */}
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                >
                    <div className="col-span-full mb-2 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold text-white">Resumen de Estudios</h2>
                    </div>
                    {statCards.map((stat) => (
                        <button
                            key={stat.label}
                            onClick={() => navigate('/studies')}
                            className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800/50 transition-colors"
                        >
                            <span className={cn("text-4xl font-bold mb-2", stat.color)}>{stat.value}</span>
                            <span className="text-xs font-medium text-slate-400 text-center">{stat.label}</span>
                        </button>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-1 p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col justify-center items-center text-center"
                >
                    <div className="bg-slate-800/50 p-3 rounded-full mb-4">
                        <UserPlus className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Último Registrado</h3>
                    {lastStudy ? (
                        <>
                            <p className="text-lg font-bold text-white mb-1">{getPersonName(lastStudy)}</p>
                            <p className="text-xs text-slate-500">
                                {toDate(lastStudy.createdAt) ? format(toDate(lastStudy.createdAt)!, "d 'de' MMM", { locale: es }) : 'Reciente'}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Ninguno</p>
                    )}
                </motion.div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Próximos Eventos */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl min-h-[300px]"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">Próximos Eventos</h2>
                        <button onClick={() => navigate('/schedule')} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                            Ver agenda
                        </button>
                    </div>
                    {upcomingEvents.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingEvents.map(event => {
                                const date = toDate(event.date);
                                return (
                                    <div key={event.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 flex items-center gap-4">
                                        <div className="bg-emerald-500/10 p-2 rounded-lg text-center min-w-[3.5rem]">
                                            <div className="text-xs text-emerald-500 font-bold uppercase">{date && format(date, 'MMM', { locale: es })}</div>
                                            <div className="text-xl font-bold text-white">{date && format(date, 'd')}</div>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-white truncate">{event.title || 'Evento'}</h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                <Clock className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {event.time || 'Hora no definida'} • {event.location || 'Sin ubicación'}
                                                    {event.groupId && groupNames[event.groupId] ? ` • ${groupNames[event.groupId]}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                            <Calendar className="h-10 w-10 mb-3 opacity-20" />
                            <p>No tienes eventos próximos.</p>
                        </div>
                    )}
                </motion.div>

                {/* Últimos Comunicados */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-white">Últimos Comunicados</h2>
                    </div>

                    <div className="space-y-4">
                        {visibleAnnouncements.length > 0 ? (
                            visibleAnnouncements.map((ann) => {
                                const date = toDate(ann.createdAt);
                                return (
                                    <button
                                        key={ann.id}
                                        onClick={() => navigate(`/groups/${ann.groupId}`)}
                                        className="w-full text-left p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors truncate">{ann.createdBy || 'Comunicado'}</h3>
                                            <span className="text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded shrink-0">{groupNames[ann.groupId] || 'Grupo'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                            <Calendar className="h-3 w-3" />
                                            {date ? format(date, "d 'de' MMM, HH:mm", { locale: es }) : 'Reciente'}
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2 whitespace-pre-wrap">{ann.text}</p>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                {myGroupIds.length === 0 ? 'Únete a un grupo para ver sus comunicados.' : 'No hay comunicados recientes.'}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Mis Grupos */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Mis Grupos y Descubrimiento</h2>
                    <button onClick={() => navigate('/people', { state: { tab: 'Grupos' } })} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                        Ver todos
                    </button>
                </div>

                <div className="relative mb-6">
                    <input
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        placeholder="Buscar grupos para unirte..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                </div>

                <div className="space-y-3">
                    {filteredGroups.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">
                            {groups.length === 0 ? 'Aún no hay grupos. Crea uno desde la sección Personas.' : 'No se encontraron grupos.'}
                        </p>
                    )}
                    {filteredGroups.map(group => {
                        const isMember = myGroupIds.includes(group.id);
                        return (
                            <div
                                key={group.id}
                                onClick={() => navigate(`/groups/${group.id}`)}
                                className="flex items-center justify-between p-4 rounded-lg bg-slate-800/20 border border-slate-800/50 hover:bg-slate-800/40 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    {group.imageUrl ? (
                                        <img src={group.imageUrl} alt={group.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold shrink-0">
                                            {group.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h4 className="font-medium text-white group-hover:text-emerald-400 transition-colors truncate">{group.name}</h4>
                                        <p className="text-xs text-slate-500">{group.members?.length || 0} miembros</p>
                                    </div>
                                </div>
                                {isMember ? (
                                    <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                                        <Check className="h-3.5 w-3.5" /> Miembro
                                        <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                                    </span>
                                ) : (
                                    <button
                                        onClick={(e) => handleJoinGroup(e, group.id, group.name)}
                                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 hover:bg-emerald-600/20 shrink-0"
                                    >
                                        Unirme
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
