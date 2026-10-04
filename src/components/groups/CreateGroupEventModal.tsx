import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { CalendarEvent, EventType } from '../../lib/types';
import { toDate } from '../../lib/utils';
import { EVENT_TYPES } from '../../lib/constants';
import { logAudit } from '../../lib/audit';

interface CreateGroupEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    initialData?: CalendarEvent | null; // If provided, we are editing
}

export function CreateGroupEventModal({ isOpen, onClose, groupId, initialData }: CreateGroupEventModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden"
                    >
                        <EventForm key={initialData?.id || 'new'} groupId={groupId} initialData={initialData} onClose={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function EventForm({ groupId, initialData, onClose }: { groupId: string; initialData?: CalendarEvent | null; onClose: () => void }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(() => {
        const date = toDate(initialData?.date);
        return {
            title: initialData?.title || '',
            date: date ? format(date, 'yyyy-MM-dd') : '',
            time: initialData?.time || '',
            location: initialData?.location || '',
            description: initialData?.description || '',
            type: (initialData?.type || 'meeting') as EventType,
        };
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !groupId) return;

        setLoading(true);
        try {
            const eventDate = new Date(`${formData.date}T${formData.time || '00:00'}`);
            const data = {
                title: formData.title.trim(),
                date: eventDate,
                time: formData.time,
                location: formData.location.trim(),
                description: formData.description.trim(),
                type: formData.type,
            };

            if (initialData) {
                await api.update('events', initialData.id, { ...data });
                logAudit(`Editó el evento: ${data.title}`);
            } else {
                await api.create('events', {
                    ...data,
                    groupId,
                    userId: user.uid,
                    createdBy: user.displayName || user.email,
                });
                logAudit(`Creó el evento de grupo: ${data.title}`);
            }
            onClose();
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Error al guardar el evento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">{initialData ? 'Editar Evento' : 'Crear Evento de Grupo'}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Título</label>
                    <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Reunión semanal..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Hora</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value as EventType })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        >
                            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Ubicación</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                placeholder="Zoom / Casa de..."
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Descripción</label>
                    <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 h-24 resize-none"
                        placeholder="Detalles del evento..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Guardar Cambios' : 'Crear Evento')}
                </button>
            </form>
        </>
    );
}
