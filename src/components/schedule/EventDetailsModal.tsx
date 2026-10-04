import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Edit2, Trash2, AlignLeft, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent } from '../../lib/types';
import { cn } from '../../lib/utils';
import { getEventTypeMeta } from '../../lib/constants';

export type ScheduleEvent = CalendarEvent & { dateObj: Date };

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: ScheduleEvent | null;
    groupName?: string;
    canEdit?: boolean;
    onEdit?: (event: ScheduleEvent) => void;
    onDelete?: (event: ScheduleEvent) => void;
}

const gradients: Record<string, string> = {
    service: 'from-purple-500 to-blue-500',
    study: 'from-emerald-500 to-teal-500',
    social: 'from-orange-500 to-red-500',
    meeting: 'from-amber-500 to-yellow-500',
};

export function EventDetailsModal({ isOpen, onClose, event, groupName, canEdit, onEdit, onDelete }: EventDetailsModalProps) {
    return (
        <AnimatePresence>
            {isOpen && event && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl"
                    >
                        <div className="relative h-32 bg-slate-800/50 flex flex-col items-center justify-center overflow-hidden gap-2">
                            <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", gradients[event.type || 'meeting'] || gradients.meeting)} />
                            <span className={cn("relative z-10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border", getEventTypeMeta(event.type).className)}>
                                {getEventTypeMeta(event.type).label}
                            </span>
                            <h2 className="relative z-10 text-2xl font-bold text-white px-12 text-center leading-tight">
                                {event.title || 'Evento'}
                            </h2>

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 text-slate-300">
                                    <Calendar className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Fecha</p>
                                        <p className="font-medium capitalize">{format(event.dateObj, "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-slate-300">
                                    <Clock className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Hora</p>
                                        <p className="font-medium">{event.time || 'No definida'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-slate-300">
                                <MapPin className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Ubicación</p>
                                    <p className="font-medium">{event.location || 'Sin ubicación'}</p>
                                </div>
                            </div>

                            {(event.personName || event.companionName || groupName) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {event.personName && (
                                        <div className="flex items-start gap-3 text-slate-300">
                                            <User className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Persona</p>
                                                <p className="font-medium">{event.personName}</p>
                                            </div>
                                        </div>
                                    )}
                                    {event.companionName && (
                                        <div className="flex items-start gap-3 text-slate-300">
                                            <Users className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Acompañante</p>
                                                <p className="font-medium">{event.companionName}</p>
                                            </div>
                                        </div>
                                    )}
                                    {groupName && (
                                        <div className="flex items-start gap-3 text-slate-300">
                                            <Users className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Grupo</p>
                                                <p className="font-medium">{groupName}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {event.description && (
                                <div className="flex items-start gap-3 text-slate-300 pt-2 border-t border-slate-800">
                                    <AlignLeft className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                                    <p className="font-normal leading-relaxed text-slate-400 whitespace-pre-wrap">{event.description}</p>
                                </div>
                            )}

                            {event.createdBy && <p className="text-xs text-slate-500">Creado por {event.createdBy}</p>}

                            {canEdit && (
                                <div className="flex gap-3 pt-4 border-t border-slate-800">
                                    <button
                                        onClick={() => onEdit?.(event)}
                                        className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(event)}
                                        className="flex-1 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 font-medium flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
