import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Edit2, Trash2, AlignLeft } from 'lucide-react';
import { format } from 'date-fns';

export interface Event {
    id: string;
    title: string;
    date: Date;
    time: string;
    location: string;
    description?: string;
    type: 'service' | 'study' | 'meeting' | 'social';
}

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event | null;
    onEdit?: (event: Event) => void;
    onDelete?: (eventId: string) => void;
}

export function EventDetailsModal({ isOpen, onClose, event, onEdit, onDelete }: EventDetailsModalProps) {
    if (!event) return null;

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
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header with Type Indicator */}
                        <div className="relative h-32 bg-slate-800/50 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90" />
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r 
                                ${event.type === 'service' ? 'from-purple-500 to-blue-500' :
                                    event.type === 'study' ? 'from-emerald-500 to-teal-500' :
                                        event.type === 'social' ? 'from-orange-500 to-red-500' :
                                            'from-slate-500 to-gray-500'}`}
                            />

                            <h2 className="relative z-10 text-2xl font-bold text-white px-8 text-center leading-tight">
                                {event.title}
                            </h2>

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 text-slate-300">
                                    <Calendar className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Fecha</p>
                                        <p className="font-medium">{format(event.date, 'EEEE, d MMMM yyyy')}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-slate-300">
                                    <Clock className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Hora</p>
                                        <p className="font-medium">{event.time}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-slate-300">
                                <MapPin className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Ubicación</p>
                                    <p className="font-medium">{event.location}</p>
                                </div>
                            </div>

                            {event.description && (
                                <div className="flex items-start gap-3 text-slate-300 pt-2 border-t border-slate-800">
                                    <AlignLeft className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-normal leading-relaxed text-slate-400">{event.description}</p>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
                                <button
                                    onClick={() => onEdit?.(event)}
                                    className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => onDelete?.(event.id)}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 font-medium flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

