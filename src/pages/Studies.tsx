import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Search, Plus, MoreHorizontal, Phone, ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AddPersonModal } from '../components/people/AddPersonModal';
import { useLocation } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Person {
    id: string;
    name: string;
    status: string;
    current: string;
    group: string;
    inCharge: string;
    support: string;
    contact: string;
}

export default function Studies() {
    const [studies, setStudies] = useState<Person[]>([]);
    const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [showStatusSubmenu, setShowStatusSubmenu] = useState<string | null>(null);
    const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.openAddPerson) {
            setIsAddPersonOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Fetch Groups Map
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "groups"), (snap) => {
            const mapping: Record<string, string> = {};
            snap.docs.forEach(d => {
                mapping[d.id] = d.data().name;
            });
            setGroupsMap(mapping);
        });
        return () => unsubscribe();
    }, []);

    // Fetch People and map Group Names
    useEffect(() => {
        // Wait for groups to be loaded at least once to avoid flickering IDs? 
        // Or just let it update reactively.

        const q = query(collection(db, "people"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const peopleData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Resolve Group Name
                const groupName = groupsMap[data.group] || data.group || 'N/D';

                return {
                    id: doc.id,
                    name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Sin Nombre',
                    status: data.status || 'New',
                    current: data.study || 'N/D',
                    group: groupName,
                    inCharge: data.inCharge || 'N/D',
                    support: data.support || 'N/D',
                    contact: data.phone || 'N/D'
                };
            });
            setStudies(peopleData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching people:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [groupsMap]); // Update when groupsMap changes

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
                setShowStatusSubmenu(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar a esta persona permanentemente? Esta acción no se puede deshacer.')) {
            try {
                await deleteDoc(doc(db, "people", id));
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Error al eliminar. Verifica tu conexión.");
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'guest': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'active': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-6" onClick={() => { setActiveDropdown(null); setShowStatusSubmenu(null); }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Estudios</h1>
                    <p className="text-slate-400">Gestiona las personas con las que estudias y su progreso.</p>
                </div>
                <button
                    onClick={() => setIsAddPersonOpen(true)}
                    className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                    <Plus className="h-4 w-4" />
                    Añadir Persona
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors border border-slate-700">
                        <Filter className="h-4 w-4" />
                        Filtros
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto pb-40">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                        </div>
                    ) : studies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <p>No hay personas registradas aún.</p>
                            <button onClick={() => setIsAddPersonOpen(true)} className="text-emerald-400 hover:underline mt-2">Añade la primera</button>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                                    <th className="px-6 py-4 font-medium">Nombre</th>
                                    <th className="px-6 py-4 font-medium">Estado</th>
                                    <th className="px-6 py-4 font-medium">Estudio Actual</th>
                                    <th className="px-6 py-4 font-medium">Charla (Grupo)</th>
                                    <th className="px-6 py-4 font-medium">Encargado</th>
                                    <th className="px-6 py-4 font-medium">Apoyo</th>
                                    <th className="px-6 py-4 font-medium">Contacto</th>
                                    <th className="px-6 py-4 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {studies.map((study, i) => (
                                    <motion.tr
                                        key={study.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group hover:bg-slate-800/30 transition-colors relative"
                                    >
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 border border-slate-700">
                                                {study.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            {study.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", getStatusColor(study.status))}>
                                                {study.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{study.current}</td>
                                        <td className="px-6 py-4 text-slate-400">{study.group}</td>
                                        <td className="px-6 py-4 text-slate-300">{study.inCharge}</td>
                                        <td className="px-6 py-4 text-slate-400">{study.support}</td>
                                        <td className="px-6 py-4">
                                            <a href={`tel:${study.contact}`} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                                                <Phone className="h-3 w-3" />
                                                {study.contact}
                                                <ExternalLink className="h-3 w-3 opacity-50" />
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(activeDropdown === study.id ? null : study.id);
                                                    setShowStatusSubmenu(null);
                                                }}
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    activeDropdown === study.id ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"
                                                )}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            <AnimatePresence>
                                                {activeDropdown === study.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        style={{ zIndex: 50 }}
                                                        className="absolute right-10 top-8 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-visible text-left"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="px-2 py-2">
                                                            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                                Acciones
                                                            </div>
                                                            <button className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2 transition-colors">
                                                                Editar
                                                            </button>

                                                            {/* Status Submenu Trigger */}
                                                            <div
                                                                className="relative"
                                                                onMouseEnter={() => setShowStatusSubmenu(study.id)}
                                                                onMouseLeave={() => setShowStatusSubmenu(null)}
                                                            >
                                                                <button
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors",
                                                                        showStatusSubmenu === study.id ? "bg-emerald-500/20 text-emerald-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                                                    )}
                                                                >
                                                                    <span className="flex items-center gap-2">
                                                                        Cambiar Estado
                                                                    </span>
                                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                                </button>

                                                                {/* Status Submenu */}
                                                                <AnimatePresence>
                                                                    {showStatusSubmenu === study.id && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            exit={{ opacity: 0, x: -10 }}
                                                                            className="absolute right-full top-0 mr-2 w-40 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50"
                                                                        >
                                                                            <div className="p-1.5 space-y-0.5">
                                                                                {['Guest', 'Active', 'Pending', 'Paused', 'Completed', 'Inactive'].map((status) => (
                                                                                    <button
                                                                                        key={status}
                                                                                        className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                                                                                    >
                                                                                        {status}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>

                                                            <button className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2 transition-colors">
                                                                Ver Historial
                                                            </button>
                                                        </div>

                                                        <div className="border-t border-slate-800 my-1"></div>

                                                        <div className="px-2 py-2">
                                                            <button
                                                                onClick={() => handleDelete(study.id)}
                                                                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                                                            >
                                                                Eliminar Permanentemente
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <AddPersonModal isOpen={isAddPersonOpen} onClose={() => setIsAddPersonOpen(false)} />
            </div>
        </div>
    );
}
