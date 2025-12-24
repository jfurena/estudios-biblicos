import { useState } from 'react';
import { X, Clock, MapPin, User, Users, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AddEventSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
}

export function AddEventSidebar({ isOpen, onClose, selectedDate }: AddEventSidebarProps) {
    const [isLoading, setIsLoading] = useState(false);
    // Default to today if no date selected
    const defaultDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    const [formData, setFormData] = useState({
        title: '',
        personId: '',
        companionId: '',
        date: defaultDate,
        time: '',
        location: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            // Create a Date object from date and time strings
            const dateTimeString = `${formData.date}T${formData.time || '00:00'}`;
            const eventDate = new Date(dateTimeString);

            await addDoc(collection(db, "events"), {
                title: formData.title || 'Nuevo Evento', // Default title if empty
                personId: formData.personId,
                companionId: formData.companionId,
                date: eventDate,
                time: formData.time,
                location: formData.location,
                type: 'study', // Default type for now
                createdAt: new Date()
            });
            onClose();
            // Reset form (keeping date as is or resetting to default)
            setFormData({
                title: '',
                personId: '',
                companionId: '',
                date: defaultDate,
                time: '',
                location: ''
            });
            alert("Evento guardado correctamente");
        } catch (error) {
            console.error("Error adding event: ", error);
            alert("Error al guardar el evento.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">Añadir Evento</h2>
                                <p className="text-sm text-slate-400 mt-1">Programar una nueva reunión.</p>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Título del Evento (opcional)</label>
                                <input
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder="Ej: Estudio Bíblico semanal"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Persona del Estudio</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <select
                                        name="personId"
                                        value={formData.personId}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                                    >
                                        <option value="">Selecciona una persona</option>
                                        <option value="1">Enmanuel Gil</option>
                                        <option value="2">Juan Luis OyM</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Acompañante</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <select
                                        name="companionId"
                                        value={formData.companionId}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                                    >
                                        <option value="">Selecciona un acompañante</option>
                                        <option value="1">Hermano de Apoyo 1</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fecha</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input
                                            name="date"
                                            value={formData.date}
                                            onChange={handleChange}
                                            type="date"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hora</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <select
                                            name="time"
                                            value={formData.time}
                                            onChange={handleChange}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="">Selecciona</option>
                                            <option value="09:00">09:00 AM</option>
                                            <option value="10:00">10:00 AM</option>
                                            <option value="19:00">07:00 PM</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ubicación del Estudio</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        type="text"
                                        placeholder="Escribe o selecciona una ubicación"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 sticky bottom-0 backdrop-blur-md">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2"
                            >
                                {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                                {isLoading ? 'Guardando...' : 'Guardar Evento'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
