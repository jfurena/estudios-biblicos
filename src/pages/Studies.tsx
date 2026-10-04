import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, MoreHorizontal, Phone, Loader2, Pencil, History, Trash2, MessageCircle } from 'lucide-react';
import { cn, getPersonName, normalizeText, whatsappLink } from '../lib/utils';
import { AddPersonModal } from '../components/people/AddPersonModal';
import { PersonHistoryModal } from '../components/people/PersonHistoryModal';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { usePeople, useGroups } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { STATUS_OPTIONS, getStatusMeta } from '../lib/constants';
import type { Person, PersonStatus } from '../lib/types';
import { addPersonHistory, logAudit } from '../lib/audit';

interface MenuState {
    person: Person;
    top: number;
    left: number;
}

function StatusBadge({ status }: { status?: string }) {
    const meta = getStatusMeta(status);
    return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap", meta.className)}>{meta.label}</span>;
}

export default function Studies() {
    const location = useLocation();
    const { user } = useAuth();
    const { people, loading } = usePeople();
    const { groups } = useGroups();

    const [isAddPersonOpen, setIsAddPersonOpen] = useState<boolean>(() => !!location.state?.openAddPerson);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [historyPerson, setHistoryPerson] = useState<Person | null>(null);
    const [menu, setMenu] = useState<MenuState | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [onlyMine, setOnlyMine] = useState(false);

    // Clear the navigation state so a refresh doesn't reopen the form
    useEffect(() => {
        if (location.state?.openAddPerson) {
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Close the actions menu when the page scrolls or resizes
    useEffect(() => {
        if (!menu) return;
        const close = () => setMenu(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [menu]);

    const groupsMap = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups]);

    const filtered = useMemo(() => {
        const term = normalizeText(search);
        return people.filter(p => {
            if (onlyMine && p.inChargeId !== user?.uid && p.supportId !== user?.uid) return false;
            if (statusFilter !== 'all' && getStatusMeta(p.status).value !== statusFilter) return false;
            if (!term) return true;
            const haystack = [getPersonName(p), p.phone, p.study, groupsMap[p.group || ''] || p.group, p.inCharge, p.support, p.location]
                .map(normalizeText)
                .join(' ');
            return haystack.includes(term);
        });
    }, [people, search, statusFilter, onlyMine, user, groupsMap]);

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>, person: Person) => {
        e.stopPropagation();
        if (menu?.person.id === person.id) {
            setMenu(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const menuWidth = 224;
        const menuHeight = 380;
        const top = rect.bottom + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight) : rect.bottom + 4;
        setMenu({ person, top, left: Math.max(8, rect.right - menuWidth) });
    };

    const handleDelete = async (person: Person) => {
        setMenu(null);
        if (!window.confirm(`¿Eliminar a ${getPersonName(person)} permanentemente? Esta acción no se puede deshacer.`)) return;
        try {
            await api.remove('people', person.id);
            logAudit(`Eliminó a la persona: ${getPersonName(person)}`);
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("Error al eliminar. Verifica tu conexión.");
        }
    };

    const handleStatusChange = async (person: Person, status: PersonStatus) => {
        setMenu(null);
        if (getStatusMeta(person.status).value === status) return;
        try {
            await api.update('people', person.id, { status });
            const label = getStatusMeta(status).label;
            await addPersonHistory(person.id, 'status', `Estado cambiado a ${label}`);
            logAudit(`Cambió el estado de ${getPersonName(person)} a ${label}`);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error al cambiar el estado.");
        }
    };

    const openCreate = () => {
        setEditingPerson(null);
        setIsAddPersonOpen(true);
    };

    const openEdit = (person: Person) => {
        setMenu(null);
        setEditingPerson(person);
        setIsAddPersonOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Estudios</h1>
                    <p className="text-slate-400">Gestiona las personas con las que estudias y su progreso.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] w-fit"
                >
                    <Plus className="h-4 w-4" />
                    Añadir Persona
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, teléfono, estudio, grupo..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                    >
                        <option value="all">Todos los estados</option>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 border border-slate-700 cursor-pointer select-none">
                        <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} className="accent-emerald-500" />
                        Solo los míos
                    </label>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                    </div>
                ) : people.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <p>No hay personas registradas aún.</p>
                        <button onClick={openCreate} className="text-emerald-400 hover:underline mt-2">Añade la primera</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">No hay resultados con estos filtros.</div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
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
                                    {filtered.map((person) => {
                                        const name = getPersonName(person);
                                        return (
                                            <tr key={person.id} className="group hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 border border-slate-700 shrink-0">
                                                            {name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        {name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><StatusBadge status={person.status} /></td>
                                                <td className="px-6 py-4 text-slate-300">{person.study || 'N/D'}</td>
                                                <td className="px-6 py-4 text-slate-400">{groupsMap[person.group || ''] || 'N/D'}</td>
                                                <td className="px-6 py-4 text-slate-300">{person.inCharge || 'N/D'}</td>
                                                <td className="px-6 py-4 text-slate-400">{person.support || 'N/D'}</td>
                                                <td className="px-6 py-4">
                                                    {person.phone ? (
                                                        <div className="flex items-center gap-3">
                                                            <a href={`tel:${person.phone}`} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 whitespace-nowrap">
                                                                <Phone className="h-3 w-3" />
                                                                {person.phone}
                                                            </a>
                                                            <a href={whatsappLink(person.phone)} target="_blank" rel="noreferrer" title="WhatsApp" className="text-slate-500 hover:text-emerald-400">
                                                                <MessageCircle className="h-4 w-4" />
                                                            </a>
                                                        </div>
                                                    ) : <span className="text-slate-500">N/D</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => openMenu(e, person)}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-colors",
                                                            menu?.person.id === person.id ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"
                                                        )}
                                                        aria-label="Acciones"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-4 p-4">
                            {filtered.map((person) => {
                                const name = getPersonName(person);
                                return (
                                    <div key={person.id} className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 border border-slate-700 shrink-0">
                                                    {name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-white truncate">{name}</h3>
                                                    <p className="text-xs text-slate-400 truncate">{groupsMap[person.group || ''] || 'Sin grupo'} · {person.study || 'Sin estudio'}</p>
                                                </div>
                                            </div>
                                            <button onClick={(e) => openMenu(e, person)} className="p-1 px-2 hover:bg-slate-700 rounded text-slate-400" aria-label="Acciones">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <StatusBadge status={person.status} />
                                            {person.phone && (
                                                <>
                                                    <a href={`tel:${person.phone}`} className="flex items-center gap-1 text-xs text-emerald-400"><Phone className="h-3 w-3" />{person.phone}</a>
                                                    <a href={whatsappLink(person.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-emerald-400"><MessageCircle className="h-3 w-3" />WhatsApp</a>
                                                </>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                                                <span className="text-xs text-slate-500 block mb-1">Encargado</span>
                                                <span className="text-slate-300 truncate block">{person.inCharge || 'N/D'}</span>
                                            </div>
                                            <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                                                <span className="text-xs text-slate-500 block mb-1">Apoyo</span>
                                                <span className="text-slate-300 truncate block">{person.support || 'N/D'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <p className="text-xs text-slate-500">{filtered.length} de {people.length} personas</p>

            {/* Actions menu (fixed so it is never clipped by the table) */}
            <AnimatePresence>
                {menu && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ top: menu.top, left: menu.left }}
                            className="fixed z-50 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl text-left p-2"
                        >
                            <button onClick={() => openEdit(menu.person)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2">
                                <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button onClick={() => { setHistoryPerson(menu.person); setMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2">
                                <History className="h-3.5 w-3.5" /> Ver historial / notas
                            </button>

                            <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cambiar estado</div>
                            <div className="grid grid-cols-2 gap-1">
                                {STATUS_OPTIONS.map((status) => {
                                    const current = getStatusMeta(menu.person.status).value === status.value;
                                    return (
                                        <button
                                            key={status.value}
                                            onClick={() => handleStatusChange(menu.person, status.value)}
                                            className={cn(
                                                "text-left px-3 py-1.5 text-xs rounded-lg transition-colors",
                                                current ? "bg-emerald-500/20 text-emerald-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                            )}
                                        >
                                            {status.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="border-t border-slate-800 my-2"></div>
                            <button onClick={() => handleDelete(menu.person)} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg flex items-center gap-2">
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar permanentemente
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AddPersonModal
                isOpen={isAddPersonOpen}
                person={editingPerson}
                onClose={() => {
                    setIsAddPersonOpen(false);
                    setEditingPerson(null);
                }}
            />
            <PersonHistoryModal person={historyPerson} onClose={() => setHistoryPerson(null)} />
        </div>
    );
}
