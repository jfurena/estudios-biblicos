import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, User, Users, MessageCircle, Users2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { CreateGroupModal } from '../components/people/CreateGroupModal';

interface Person {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    role?: string;
    photoURL?: string;
    username?: string; // Correctly added this time
    phone?: string;
    location?: string;
    status: string;
    // Add other fields as needed
}

interface Group {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    ministry?: string; // e.g. 'youth', 'worship'
    stats?: {
        activeMembers: number;
        pending: number;
        completed: number;
    };
    members?: string[];
    // Add other fields as needed
}

export default function People() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('People');
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

    const [users, setUsers] = useState<Person[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const tabs = ['People', 'Groups', 'Ministries'];

    useEffect(() => {
        // Fetch Users (Registered App Users)
        const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            const usersData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Create a default username if one doesn't exist (e.g. older users)
                const fallbackUsername = data.name ? '@' + data.name.toLowerCase().replace(/\s+/g, '') : '@user';

                return {
                    id: doc.id,
                    firstName: data.name || 'Usuario', // Fallback if name is missing
                    lastName: '',         // "users" collection might not have lastName split, so we just use name
                    email: data.email,
                    username: data.username || fallbackUsername, // Map username
                    role: data.role,
                    photoURL: data.photoURL, // Map photoURL
                    status: 'active' // App users are generally active if they exist
                } as Person;
            });
            setUsers(usersData);
        });

        // Fetch Groups
        const qGroups = query(collection(db, "groups"), orderBy("createdAt", "desc"));
        const unsubGroups = onSnapshot(qGroups, (snapshot) => {
            setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
        });

        setLoading(false);

        return () => {
            unsubUsers();
            unsubGroups();
        };
    }, []);

    const handleChat = (e: React.MouseEvent, user: Person) => {
        e.stopPropagation();
        if (user.phone) {
            window.open(`https://wa.me/${user.phone.replace(/\D/g, '')}`, '_blank');
        } else {
            alert('Este usuario no tiene un número de teléfono registrado.');
        }
    };

    const filteredContent = () => {
        if (loading) return <div className="text-slate-500 text-center py-10">Cargando...</div>;

        if (activeTab === 'People') {
            if (users.length === 0) return <div className="text-slate-500 text-center py-10">No hay usuarios registrados.</div>;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user, i) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => navigate(`/profile/${user.id}`)}
                            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 group"
                        >
                            {user.photoURL ? (
                                <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-slate-800 shrink-0">
                                    <img src={user.photoURL} alt={user.firstName} className="h-full w-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 uppercase shrink-0">
                                    {user.firstName?.[0]}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <h3 className="text-white font-medium truncate">{user.firstName}</h3>
                                {user.username && (
                                    <p className="text-xs text-slate-400 truncate">{user.username}</p>
                                )}
                                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">
                                    App User
                                </span>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleChat(e, user)}
                                    className="p-2 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 hover:border-emerald-500"
                                    title="Chatear por WhatsApp"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            );
        }

        if (activeTab === 'Groups' || activeTab === 'Ministries') {
            // Filter for ministries if tab is Ministries
            const displayGroups = activeTab === 'Ministries'
                ? groups.filter(g => g.ministry && g.ministry !== '')
                : groups;

            if (displayGroups.length === 0) return <div className="text-slate-500 text-center py-10">No hay grupos registrados.</div>;

            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayGroups.map((group, i) => (
                        <motion.div
                            key={group.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => navigate(`/groups/${group.id}`)}
                            className="p-6 rounded-xl bg-slate-950 border border-slate-800/60 shadow-lg hover:border-slate-700 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/20 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

                            <div className="flex items-start gap-4 relative z-10">
                                {group.imageUrl ? (
                                    <img src={group.imageUrl} alt={group.name} className="h-14 w-14 rounded-full object-cover shadow-inner bg-slate-800" />
                                ) : (
                                    <div className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner bg-slate-800 border border-slate-700">
                                        {group.name.substring(0, 1)}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-1">{group.name}</h3>
                                    <p className="text-sm text-slate-400 mb-3">{group.description || 'Sin descripción'}</p>

                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" />
                                            {group.stats?.activeMembers || 0} miembros
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">People</h1>
                    <p className="text-slate-400">Search, find, and connect.</p>
                </div>
                <div>
                    <button
                        onClick={() => setIsCreateGroupOpen(true)}
                        className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        <Users2 className="h-4 w-4" />
                        Crear Grupo
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or @username..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                </div>

                {/* Tabs */}
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

            <div className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{activeTab}</h2>
                    {filteredContent()}
                </div>
            </div>
            <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
        </div>
    );
}
