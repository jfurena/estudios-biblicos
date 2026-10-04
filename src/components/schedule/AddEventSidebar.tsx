import { useMemo, useState } from 'react';
import { X, Clock, MapPin, User, Users, Calendar, Loader2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { usePeople, useUsers } from '../../hooks/useData';
import { EVENT_TYPES } from '../../lib/constants';
import { getPersonName } from '../../lib/utils';
import type { EventType } from '../../lib/types';
import type { ScheduleEvent } from './EventDetailsModal';
import { logAudit } from '../../lib/audit';

interface AddEventSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
    event?: ScheduleEvent | null; // When provided the sidebar edits this event
}

export function AddEventSidebar({ isOpen, onClose, selectedDate, event }: AddEventSidebarProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
                    >
                        <EventForm key={event?.id || 'new'} event={event} selectedDate={selectedDate} onClose={onClose} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

const fieldClass = "w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600 [color-scheme:dark]";

function EventForm({ event, selectedDate, onClose }: { event?: ScheduleEvent | null; selectedDate?: Date; onClose: () => void }) {
    const { user, profile } = useAuth();
    const { people } = usePeople();
    const { users } = useUsers();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState(() => ({
        title: event?.title || '',
        type: (event?.type || 'study') as EventType,
        personId: event?.personId || '',
        companionId: event?.companionId || '',
        date: format(event?.dateObj || selectedDate || new Date(), 'yyyy-MM-dd'),
        time: event?.time || '',
        location: event?.location || '',
        description: event?.description || '',
    }));

    // People I'm responsible for appear first
    const sortedPeople = useMemo(() => {
        const mine = (p: typeof people[number]) => p.inChargeId === user?.uid || p.supportId === user?.uid;
        return [...people].sort((a, b) => Number(mine(b)) - Number(mine(a)) || getPersonName(a).localeCompare(getPersonName(b), 'es'));
    }, [people, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            // Pre-fill location from the selected person
            if (name === 'personId' && !prev.location) {
                const person = people.find(p => p.id === value);
                if (person?.location) next.location = person.location;
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.date) return;
        setIsLoading(true);

        const person = people.find(p => p.id === formData.personId);
        const companion = users.find(u => u.id === formData.companionId);
        const personName = person ? getPersonName(person) : '';
        const title = formData.title.trim() || (personName ? `Estudio con ${personName}` : 'Nuevo Evento');

        const data = {
            title,
            type: formData.type,
            personId: formData.personId,
            personName,
            companionId: formData.companionId,
            companionName: companion?.name || '',
            date: new Date(`${formData.date}T${formData.time || '00:00'}`),
            time: formData.time,
            location: formData.location.trim(),
            description: formData.description.trim(),
        };

        try {
            if (event) {
                await api.update('events', event.id, { ...data });
                logAudit(`Editó el evento: ${title}`);
            } else {
                await api.create('events', {
                    ...data,
                    userId: user.uid,
                    createdBy: profile?.name || user.displayName || user.email,
                });
                logAudit(`Creó el evento: ${title}`);
            }
            onClose();
        } catch (error) {
            console.error("Error saving event: ", error);
            alert("Error al guardar el evento.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white">{event ? 'Editar Evento' : 'Añadir Evento'}</h2>
                    <p className="text-sm text-slate-400 mt-1">{event ? 'Actualiza los detalles del evento.' : 'Programar una nueva reunión.'}</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Título del Evento (opcional)</label>
                    <input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        type="text"
                        placeholder="Ej: Estudio Bíblico semanal"
                        className={fieldClass.replace('pl-10', 'pl-4')}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tipo</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <select name="type" value={formData.type} onChange={handleChange} className={fieldClass}>
                            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Persona del Estudio</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <select name="personId" value={formData.personId} onChange={handleChange} className={fieldClass}>
                            <option value="">{people.length ? 'Ninguna' : 'No hay personas registradas'}</option>
                            {sortedPeople.map(p => <option key={p.id} value={p.id}>{getPersonName(p)}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Acompañante</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <select name="companionId" value={formData.companionId} onChange={handleChange} className={fieldClass}>
                            <option value="">Sin acompañante</option>
                            {users.filter(u => u.id !== user?.uid).map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input name="date" value={formData.date} onChange={handleChange} type="date" required className={fieldClass} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hora</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input name="time" value={formData.time} onChange={handleChange} type="time" className={fieldClass} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ubicación</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input name="location" value={formData.location} onChange={handleChange} type="text" placeholder="Dirección, Zoom, casa de..." className={fieldClass} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Notas</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Detalles del evento..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 h-24 resize-none placeholder:text-slate-600"
                    />
                </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                    {isLoading ? 'Guardando...' : event ? 'Guardar Cambios' : 'Guardar Evento'}
                </button>
            </div>
        </form>
    );
}
