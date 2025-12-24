import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, BookOpen, ChevronLeft, Calendar, MapPin, Clock, Plus, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, onSnapshot, collection, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateGroupEventModal } from '../components/groups/CreateGroupEventModal';
import { CreateAnnouncementModal } from '../components/groups/CreateAnnouncementModal';
import { useAuth } from '../context/AuthContext';

interface GroupData {
    name: string;
    description: string;
    imageUrl?: string;
    ministry: string;
    members: string[]; // List of member IDs
    stats?: {
        activeMembers: number;
        pending: number;
        completed: number;
    };
}

export default function GroupDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [group, setGroup] = useState<GroupData | null>(null);
    const [loading, setLoading] = useState(true);

    // Lists
    const [events, setEvents] = useState<any[]>([]);

    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [groupMembers, setGroupMembers] = useState<any[]>([]); // Real people in the group
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        male: 0,
        female: 0
    });

    // Modals
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

    // Edit State
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);

    useEffect(() => {
        if (!id) return;

        // 1. Group Details
        const groupUnsub = onSnapshot(doc(db, "groups", id), (doc) => {
            if (doc.exists()) {
                setGroup(doc.data() as GroupData);
            } else {
                console.log("No such group!");
            }
            setLoading(false);
        });

        // 2. Upcoming Events for Group (Client-side processing to avoid Index errors)
        const eventsQuery = query(
            collection(db, "events"),
            where("groupId", "==", id)
        );
        const eventsUnsub = onSnapshot(eventsQuery, (snap) => {
            const now = new Date();
            const fetchedEvents = snap.docs
                .map(d => {
                    const data = d.data();
                    // Handle Firestore Timestamp
                    const date = data.date ? new Date(data.date.seconds * 1000) : null;
                    return { id: d.id, ...data, dateObj: date };
                })
                .filter(e => e.dateObj && e.dateObj >= now) // Filter past events
                .sort((a, b) => (a.dateObj?.getTime() || 0) - (b.dateObj?.getTime() || 0)); // Sort ascending

            setEvents(fetchedEvents);
        });

        // 3. Announcements for Group (Client-side sort to avoid Index errors)
        const annQuery = query(
            collection(db, "announcements"),
            where("groupId", "==", id)
        );
        const annUnsub = onSnapshot(annQuery, (snap) => {
            const fetchedAnnouncements = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA; // Sort descending (newest first)
                })
                .slice(0, 10); // Limit to 10

            setAnnouncements(fetchedAnnouncements);
        });

        // 4. Fetch Group Members (People/Studies assigned to this group)
        // We query the 'people' collection where 'group' matches the group ID or Name
        // Assuming 'group' field in people stores the Group ID.
        const membersQuery = query(collection(db, "people"), where("group", "==", id));
        const membersUnsub = onSnapshot(membersQuery, (snap) => {
            const membersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGroupMembers(membersData);

            // Calculate Stats
            const active = membersData.filter((m: any) => m.status === 'active').length;
            const male = membersData.filter((m: any) => m.gender === 'male').length;
            const female = membersData.filter((m: any) => m.gender === 'female').length;

            setStats({
                total: membersData.length,
                active,
                male,
                female
            });
        });

        return () => {
            groupUnsub();
            eventsUnsub();

            annUnsub();
            membersUnsub();
        };
    }, [id]);

    const handleDeleteEvent = async (eventId: string) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este evento?")) return;
        try {
            await deleteDoc(doc(db, "events", eventId));
        } catch (err) {
            console.error(err);
            alert("Error al eliminar el evento.");
        }
    };

    const handleDeleteAnnouncement = async (annId: string) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este comunicado?")) return;
        try {
            await deleteDoc(doc(db, "announcements", annId));
        } catch (err) {
            console.error(err);
            alert("Error al eliminar el comunicado.");
        }
    };

    if (loading) {
        return <div className="p-8 text-white">Cargando...</div>;
    }

    if (!group) {
        return <div className="p-8 text-white">Grupo no encontrado.</div>;
    }

    // Fallback if stats are undefined
    // Fallback if stats are undefined
    // const totalMembers = group.members?.length || 0; // Deprecated
    // const isMember = user && group.members?.includes(user.uid); // Deprecated check
    const isMember = true; // Temporary: Allow all auth users to see actions for now

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
                    {/* Header Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col items-center text-center"
                    >
                        <div className="h-32 w-32 rounded-full bg-slate-700 flex items-center justify-center text-4xl font-bold text-white mb-4 ring-4 ring-slate-800 overflow-hidden relative">
                            {/* Initials or Image */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-5xl font-bold">{(group.name || '?').substring(0, 1).toUpperCase()}</span>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-1">{group.name}</h1>
                        <p className="text-slate-400 text-sm mb-6">{group.ministry || 'Sin Ministerio'}</p>

                        <div className="text-sm font-medium text-slate-500">
                            {stats.total} Miembros
                        </div>
                    </motion.div>

                    {/* Actions (Only for members) */}
                    {isMember && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                        >
                            <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Acciones</h2>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setEditingEvent(null);
                                        setIsEventModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-400 font-medium transition-colors"
                                >
                                    <Calendar className="h-5 w-5" />
                                    Crear Evento
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingAnnouncement(null);
                                        setIsAnnouncementModalOpen(true);
                                    }}
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

                        <div className="flex flex-col items-center justify-center py-4">
                            <span className="text-4xl font-bold text-white mb-2">{stats.active}</span>
                            <span className="text-xs text-slate-500">Estudios Activos (Estimado)</span>
                            <div className="flex gap-4 mt-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><span className="text-blue-400 font-bold">{stats.male}</span> Hom.</span>
                                <span className="flex items-center gap-1"><span className="text-pink-400 font-bold">{stats.female}</span> Muj.</span>
                            </div>
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
                            {isMember && (
                                <button onClick={() => {
                                    setEditingEvent(null);
                                    setIsEventModalOpen(true);
                                }} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                                    <Plus className="h-4 w-4 text-emerald-500" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {events.length > 0 ? (
                                events.map((event) => (
                                    <div key={event.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 flex items-start gap-4">
                                        <div className="flex flex-col items-center justify-center bg-slate-800 rounded-lg p-2 min-w-[3.5rem] border border-slate-700">
                                            <span className="text-xs text-emerald-500 font-bold uppercase">{event.date && format(new Date(event.date.seconds * 1000), 'MMM', { locale: es })}</span>
                                            <span className="text-xl font-bold text-white">{event.date && format(new Date(event.date.seconds * 1000), 'd')}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <h3 className="text-white font-medium">{event.title}</h3>
                                                {/* Actions */}
                                                {(user?.uid === event.userId) && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingEvent(event);
                                                                setIsEventModalOpen(true);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEvent(event.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {event.time || 'Hora no definida'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {event.location || 'Sin ubicación'}
                                                </div>
                                            </div>
                                            {event.description && <p className="text-sm text-slate-500 mt-2">{event.description}</p>}
                                        </div>
                                    </div>
                                ))
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
                            {isMember && (
                                <button onClick={() => {
                                    setEditingAnnouncement(null);
                                    setIsAnnouncementModalOpen(true);
                                }} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                                    <Plus className="h-4 w-4 text-blue-500" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {announcements.length > 0 ? (
                                announcements.map((ann) => (
                                    <div key={ann.id} className="p-4 rounded-lg bg-slate-800/20 border border-slate-800/50 group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                                    {(ann.createdBy || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs text-slate-300 font-medium">{ann.createdBy || 'Usuario'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">
                                                    {ann.createdAt ? format(new Date(ann.createdAt.seconds * 1000), "d 'de' MMM, HH:mm", { locale: es }) : 'Reciente'}
                                                </span>
                                                {(user?.uid === ann.userId) && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setEditingAnnouncement(ann);
                                                                setIsAnnouncementModalOpen(true);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAnnouncement(ann.id)}
                                                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{ann.text}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-500 text-sm">No hay comunicados aún.</div>
                            )}
                        </div>
                    </motion.div>

                    {/* Members Header Section (Moved down) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-semibold text-white">Miembros ({stats.total})</h2>
                        </div>
                        {/* Member List */}
                        <div className="mt-4 space-y-2">
                            {groupMembers.length > 0 ? (
                                groupMembers.map((member, index) => (
                                    <div key={member.id || index} className="p-3 rounded-lg bg-slate-800/50 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                            {(member.firstName || member.name || '?').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-300 font-medium">{member.firstName ? `${member.firstName} ${member.lastName}` : member.name}</span>
                                            <span className="text-xs text-slate-500 capitalize">{member.status || 'invitado'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm">No hay miembros visibles.</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Modals */}
            <CreateGroupEventModal
                isOpen={isEventModalOpen}
                onClose={() => {
                    setIsEventModalOpen(false);
                    setEditingEvent(null);
                }}
                groupId={id || ''}
                initialData={editingEvent}
            />
            <CreateAnnouncementModal
                isOpen={isAnnouncementModalOpen}
                onClose={() => {
                    setIsAnnouncementModalOpen(false);
                    setEditingAnnouncement(null);
                }}
                groupId={id || ''}
                initialData={editingAnnouncement}
            />
        </div>
    );
}
