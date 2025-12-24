import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, List, LayoutGrid, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { AddEventSidebar } from '../components/schedule/AddEventSidebar';
import { DayDetailsSidebar } from '../components/schedule/DayDetailsSidebar';
import { EventDetailsModal, type Event } from '../components/schedule/EventDetailsModal';

const SAMPLE_EVENTS: Event[] = [
    {
        id: '1',
        title: 'Reunión de Grupo',
        date: new Date(2025, 11, 22),
        time: '19:00',
        location: 'Sala Principal',
        type: 'service',
        description: 'Reunión semanal de grupos pequeños para estudio y oración.'
    },
    {
        id: '2',
        title: 'Servicio de Nochebuena',
        date: new Date(2025, 11, 24),
        time: '20:00',
        location: 'Auditorio Principal',
        type: 'service',
        description: 'Celebración especial de Navidad con música y mensaje.'
    },
    {
        id: '3',
        title: 'Almuerzo Navideño',
        date: new Date(2025, 11, 25),
        time: '13:00',
        location: 'Salón de Eventos',
        type: 'social',
        description: 'Compartir navideño para toda la comunidad.'
    },
    {
        id: '4',
        title: 'Estudio Bíblico: Romanos',
        date: new Date(2025, 11, 26),
        time: '18:30',
        location: 'Aula 3',
        type: 'study',
        description: 'Continuamos con el capítulo 8 de Romanos.'
    },
    {
        id: '5',
        title: 'Servicio Dominical',
        date: new Date(2025, 11, 28),
        time: '10:00',
        location: 'Auditorio Principal',
        type: 'service',
        description: 'Servicio general de adoración.'
    }
];

export default function Schedule() {
    const [currentMonth, setCurrentMonth] = useState(new Date(2025, 11, 22));
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd
    });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
    }

    // Filter events for current month in list view
    const currentMonthEvents = SAMPLE_EVENTS.filter(event =>
        isSameMonth(event.date, currentMonth)
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Get events for a specific day
    const getEventsForDay = (day: Date) => {
        return SAMPLE_EVENTS.filter(event => isSameDay(event.date, day));
    };

    // Events for selected date (for sidebar)
    const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Schedule</h1>
                    <p className="text-slate-400">Weekly and monthly agenda at a glance.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={cn(
                                "p-2 rounded-md transition-all",
                                viewMode === 'calendar' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
                            )}
                            title="Calendar View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 rounded-md transition-all",
                                viewMode === 'list' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
                            )}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="text-center px-4 w-32">
                            <span className="block text-sm font-semibold text-white">{format(currentMonth, 'MMMM')}</span>
                            <span className="block text-xs font-bold text-slate-500">{format(currentMonth, 'yyyy')}</span>
                        </div>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAddEventOpen(true)}
                        className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Añadir Evento</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl flex flex-col relative">
                {viewMode === 'calendar' ? (
                    <>
                        <div className="grid grid-cols-7 border-b border-slate-800">
                            {weekDays.map((day) => (
                                <div key={day} className="py-3 text-center text-sm font-medium text-slate-400 border-r border-slate-800 last:border-r-0">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                            {days.map((day) => {
                                const dayEvents = getEventsForDay(day);
                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => handleDayClick(day)}
                                        className={cn(
                                            "min-h-[100px] border-b border-r border-slate-800 p-2 transition-colors hover:bg-slate-800/20 relative cursor-pointer",
                                            !isSameMonth(day, monthStart) && "bg-slate-950/50 opacity-50",
                                            "last:border-r-0",
                                            selectedDate && isSameDay(day, selectedDate) && "bg-slate-800/40"
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium mb-1",
                                            isSameMonth(day, monthStart) ? "text-slate-200" : "text-slate-600",
                                            isToday(day) && "bg-emerald-500 text-white"
                                        )}>
                                            {format(day, 'd')}
                                        </span>

                                        <div className="space-y-1">
                                            {dayEvents.slice(0, 3).map(event => (
                                                <motion.div
                                                    key={event.id}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className={cn(
                                                        "px-1.5 py-1 rounded text-[10px] font-medium truncate",
                                                        event.type === 'service' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                                            event.type === 'study' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                                "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                                    )}
                                                >
                                                    {event.title}
                                                </motion.div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-slate-500 pl-1">
                                                    +{dayEvents.length - 3} más
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {currentMonthEvents.length > 0 ? (
                            currentMonthEvents.map((event) => (
                                <motion.div
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer group"
                                >
                                    <div className={cn(
                                        "h-12 w-12 shrink-0 rounded-lg flex flex-col items-center justify-center border font-bold",
                                        event.type === 'service' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                                            event.type === 'study' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                                "bg-slate-500/10 border-slate-500/20 text-slate-500"
                                    )}>
                                        <span className="text-xs uppercase">{format(event.date, 'MMM')}</span>
                                        <span className="text-lg leading-none">{format(event.date, 'd')}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">{event.title}</h3>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold",
                                                event.type === 'service' ? "bg-blue-500/10 text-blue-400" :
                                                    event.type === 'study' ? "bg-emerald-500/10 text-emerald-400" :
                                                        "bg-slate-500/10 text-slate-400"
                                            )}>
                                                {event.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{event.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
                                <p>No events found for {format(currentMonth, 'MMMM yyyy')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <DayDetailsSidebar
                isOpen={!!selectedDate}
                onClose={() => setSelectedDate(null)}
                date={selectedDate}
                onAddEvent={() => {
                    setIsAddEventOpen(true);
                    setSelectedDate(null);
                }}
                events={selectedDateEvents}
                onEventClick={(event) => {
                    setSelectedEvent(event);
                    setSelectedDate(null); // Close sidebar when opening modal
                }}
            />

            <AddEventSidebar
                isOpen={isAddEventOpen}
                onClose={() => setIsAddEventOpen(false)}
                selectedDate={selectedDate || new Date()}
            />

            <EventDetailsModal
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                event={selectedEvent}
                onEdit={(event) => console.log('Edit', event)}
                onDelete={(id) => console.log('Delete', id)}
            />
        </div>
    );
}
