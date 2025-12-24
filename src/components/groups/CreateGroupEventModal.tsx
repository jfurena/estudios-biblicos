import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';

import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface CreateGroupEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    initialData?: any; // If provided, we are editing
}

export function CreateGroupEventModal({ isOpen, onClose, groupId, initialData }: CreateGroupEventModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        description: ''
    });

    // Populate form if editing
    useState(() => {
        if (initialData) {
            // Convert Firestore Timestamp to YYYY-MM-DD
            let dateStr = '';
            if (initialData.date && initialData.date.seconds) {
                dateStr = new Date(initialData.date.seconds * 1000).toISOString().split('T')[0];
            } else if (initialData.date instanceof Date) {
                dateStr = initialData.date.toISOString().split('T')[0];
            }

            setFormData({
                title: initialData.title || '',
                date: dateStr,
                time: initialData.time || '',
                location: initialData.location || '',
                description: initialData.description || ''
            });
        }
    });

    // Reset or Update when initialData changes or modal opens
    // We actually use a useEffect here to react to prop changes
    // But since this is a modal, it might be better to do it on Open.
    // Let's rely on the parent to pass fresh initialData or null.
    // We add a useEffect to sync state when initialData changes.
    // (Note: The previous useState initializer only runs once)
    const [hasInitialized, setHasInitialized] = useState(false);
    if (isOpen && !hasInitialized) {
        if (initialData) {
            let dateStr = initialData.dateObj ? initialData.dateObj.toISOString().split('T')[0] : '';
            // Fallback if dateObj missing but seconds exist
            if (!dateStr && initialData.date?.seconds) {
                dateStr = new Date(initialData.date.seconds * 1000).toISOString().split('T')[0];
            }

            setFormData({
                title: initialData.title || '',
                date: dateStr,
                time: initialData.time || '',
                location: initialData.location || '',
                description: initialData.description || ''
            });
        } else {
            setFormData({ title: '', date: '', time: '', location: '', description: '' });
        }
        setHasInitialized(true);
    }

    // Reset initialized flag when closed
    if (!isOpen && hasInitialized) {
        setHasInitialized(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !groupId) return;

        setLoading(true);
        try {
            // Create Date object from date and time inputs
            const eventDate = new Date(`${formData.date}T${formData.time}`);

            if (initialData) {
                // Update
                await updateDoc(doc(db, "events", initialData.id), {
                    title: formData.title,
                    date: eventDate,
                    time: formData.time,
                    location: formData.location,
                    description: formData.description,
                    updatedAt: serverTimestamp()
                    // Keep creator info same
                });
            } else {
                // Create
                await addDoc(collection(db, "events"), {
                    title: formData.title,
                    date: eventDate,
                    time: formData.time, // Keep string for display convenience or rely on date
                    location: formData.location,
                    description: formData.description,
                    groupId: groupId,
                    userId: user.uid, // Creator
                    createdBy: user.displayName || user.email,
                    createdAt: serverTimestamp()
                });
            }
            onClose();
            setFormData({ title: '', date: '', time: '', location: '', description: '' });
        } catch (error) {
            console.error("Error creating event:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden"
                >
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>
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
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Guardar Cambios' : 'Crear Evento')}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
