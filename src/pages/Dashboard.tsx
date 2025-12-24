import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, BookOpen, Clock, Users, Calendar, MessageSquare, ChevronRight, UserPlus, MoreHorizontal, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        active: 0,
        pending: 0,
        completed: 0,
        total: 0
    });
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [lastStudy, setLastStudy] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return; // Wait for auth

            // Store unsubscribe functions
            let peopleUnsub: () => void;
            let groupsUnsub: () => void;
            let eventsUnsub: () => void = () => { }; // Initialize with no-op
            let announcementsUnsub: () => void = () => { }; // Initialize with no-op

            try {
                // 1. People Stats (My People)
                // Query by inChargeId (UID) for robustness as requested
                const peopleQuery = query(
                    collection(db, "people"),
                    where("inChargeId", "==", user.uid)
                );

                peopleUnsub = onSnapshot(peopleQuery, (snapshot) => {
                    const allPeople = snapshot.docs.map(doc => doc.data());
                    setStats({
                        active: allPeople.filter(p => p.status?.toLowerCase() === 'active').length,
                        pending: allPeople.filter(p => p.status?.toLowerCase() === 'pending').length,
                        completed: allPeople.filter(p => p.status?.toLowerCase() === 'completed').length,
                        total: allPeople.filter(p => !['pending', 'guest'].includes(p.status?.toLowerCase())).length
                    });

                    const sortedPoints = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as any))
                        .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

                    if (sortedPoints.length > 0) {
                        setLastStudy(sortedPoints[0]);
                    } else {
                        setLastStudy(null);
                    }
                });

                // 2. Fetch My Groups to get GroupEvents & Announcements
                // Assuming groups have 'members' array field with user IDs
                const groupsQuery = query(collection(db, "groups"), where("members", "array-contains", user.uid));

                groupsUnsub = onSnapshot(groupsQuery, (groupsSnap) => {
                    const myGroupIds = groupsSnap.docs.map(g => g.id);

                    // A. Fetch Personal Events (Created by me)
                    // Note: Firestore doesn't support logical OR across different fields well in one query easily
                    // We'll run parallel listeners or one simple logic if collections separate or small.
                    // For now, let's just listen for ALL future events and filter in client (Simplest for small scale)
                    // OR run two queries. Let's run two queries for scalability preference.

                    // Allow simple approach: Fetch all 'events' >= Today, filter in client. 
                    // This avoids composite index issues during dev.
                    const allEventsQuery = query(
                        collection(db, "events"),
                        where("date", ">=", new Date()),
                        orderBy("date", "asc")
                    );

                    // Unsubscribe from previous events listener if it exists
                    eventsUnsub();
                    eventsUnsub = onSnapshot(allEventsQuery, (snap) => {
                        const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

                        // Filter: Personal OR Group
                        const relevantEvents = allEvents.filter(e =>
                            e.userId === user.uid || (e.groupId && myGroupIds.includes(e.groupId))
                        ).slice(0, 3);

                        setUpcomingEvents(relevantEvents);
                    });

                    // B. Fetch Announcements (Group Announcements)
                    // Unsubscribe from previous announcements listener if it exists
                    announcementsUnsub();
                    if (myGroupIds.length > 0) {
                        const annQuery = query(
                            collection(db, "announcements"),
                            where("groupId", "in", myGroupIds.slice(0, 10)), // Limit 10
                            orderBy("createdAt", "desc"),
                            limit(5)
                        );

                        announcementsUnsub = onSnapshot(annQuery, (snap) => {
                            setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                        });
                    } else {
                        setAnnouncements([]);
                    }
                });

                return () => {
                    peopleUnsub();
                    groupsUnsub();
                    eventsUnsub(); // Cleanup events listener
                    announcementsUnsub(); // Cleanup announcements listener
                };

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const statCards = [
        { label: 'Estudios Activos', value: stats.active.toString(), icon: Activity, color: 'text-emerald-400' },
        { label: 'Estudios Pendientes', value: stats.pending.toString(), icon: Clock, color: 'text-amber-400' },
        { label: 'Estudios Completados', value: stats.completed.toString(), icon: BookOpen, color: 'text-blue-400' },
        { label: 'Personas Totales', value: stats.total.toString(), icon: Users, color: 'text-slate-400' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                <div className='flex gap-3'>
                    <button
                        onClick={() => navigate('/studies', { state: { openAddPerson: true } })}
                        className='bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2'
                    >
                        <UserPlus className="h-4 w-4" />
                        Nuevo Estudio
                    </button>
                </div>
            </header>

            {/* Resumen de Estudios */}
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                >
                    <div className="col-span-full mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold text-white">Resumen de Estudios</h2>
                    </div>
                    {statCards.map((stat, i) => (
                        <div key={i} className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                            <span className={cn("text-4xl font-bold mb-2", stat.color)}>{stat.value}</span>
                            <span className="text-xs font-medium text-slate-400 text-center">{stat.label}</span>
                        </div>
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
                            <p className="text-lg font-bold text-white mb-1">{lastStudy.firstName} {lastStudy.lastName}</p>
                            <p className="text-xs text-slate-500">
                                {lastStudy.createdAt ? format(new Date(lastStudy.createdAt.seconds * 1000), "d 'de' MMM", { locale: es }) : 'Reciente'}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Ninguno</p>
                    )}
                </motion.div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Próximos Eventos - Real */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl min-h-[300px]"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">Próximos Eventos</h2>
                        <MoreHorizontal className="h-5 w-5 text-slate-500 cursor-pointer hover:text-white" />
                    </div>
                    {upcomingEvents.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingEvents.map(event => (
                                <div key={event.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 flex items-center gap-4">
                                    <div className="bg-emerald-500/10 p-2 rounded-lg text-center min-w-[3.5rem]">
                                        <div className="text-xs text-emerald-500 font-bold uppercase">{event.date && format(new Date(event.date.seconds * 1000), 'MMM', { locale: es })}</div>
                                        <div className="text-xl font-bold text-white">{event.date && format(new Date(event.date.seconds * 1000), 'd')}</div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{event.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                            <Clock className="h-3 w-3" />
                                            {event.time || 'Hora no definida'} • {event.location || 'Sin ubicación'}
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-white">Últimos Comunicados ({announcements.length})</h2>
                        </div>
                        <button className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">Ver todos</button>
                    </div>

                    <div className="space-y-4">
                        {announcements.length > 0 ? (
                            announcements.map((ann) => (
                                <div key={ann.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors">Nuevo Comunicado</h3>
                                        <span className="text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded">Grupo</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                        <Calendar className="h-3 w-3" />
                                        {ann.createdAt ? format(new Date(ann.createdAt.seconds * 1000), "d 'de' MMM", { locale: es }) : 'Reciente'}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">
                                        {ann.text}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                No hay comunicados recientes.
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Mis Grupos - Could also be real data */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Mis Grupos y Descubrimiento</h2>
                    <Users className="h-5 w-5 text-slate-500" />
                </div>

                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder="Buscar grupos para unirte..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                </div>

                <div className="space-y-3">
                    {/* Placeholder - could fetch 'groups' collection here too */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/20 border border-slate-800/50 hover:bg-slate-800/40 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">CO</div>
                            <div>
                                <h4 className="font-medium text-white group-hover:text-emerald-400 transition-colors">Charla de Oliver</h4>
                                <p className="text-xs text-slate-500">3 miembros</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
