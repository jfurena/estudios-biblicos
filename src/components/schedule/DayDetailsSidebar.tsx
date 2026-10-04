import { X, Plus, Calendar, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ScheduleEvent } from './EventDetailsModal';
import { cn } from '../../lib/utils';
import { getEventTypeMeta } from '../../lib/constants';

interface DayDetailsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    onAddEvent: () => void;
    events?: ScheduleEvent[];
    onEventClick?: (event: ScheduleEvent) => void;
}

export function DayDetailsSidebar({ isOpen, onClose, date, onAddEvent, events = [], onEventClick }: DayDetailsSidebarProps) {
    return (
        <AnimatePresence>
            {isOpen && date && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 z-40 h-full w-full max-w-sm bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">Eventos</h2>
                                <p className="text-sm text-slate-400 mt-1 capitalize">{format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {events.length > 0 ? (
                                <div className="space-y-3">
                                    {events.map((event) => {
                                        const meta = getEventTypeMeta(event.type);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => onEventClick?.(event)}
                                                className="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all group"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className={cn("px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border", meta.className)}>
                                                        {meta.label}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-500">{event.time}</span>
                                                </div>
                                                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">{event.title || 'Evento'}</h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{event.location || 'Sin ubicación'}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="h-12 w-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                        <Calendar className="h-6 w-6 text-slate-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-white font-medium">No hay eventos</h3>
                                        <p className="text-sm text-slate-500 max-w-[200px]">No hay eventos programados para este día.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-3">
                            <button
                                onClick={onAddEvent}
                                className="w-full px-4 py-3 rounded-lg text-sm font-bold bg-white text-black hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Añadir a este día
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors border border-slate-800"
                            >
                                Cerrar
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
