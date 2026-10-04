import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, List, LayoutGrid, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { cn, toDate } from '../lib/utils';
import { api, subscribe } from '../lib/api';
import { AddEventSidebar } from '../components/schedule/AddEventSidebar';
import { DayDetailsSidebar } from '../components/schedule/DayDetailsSidebar';
import { EventDetailsModal, type ScheduleEvent } from '../components/schedule/EventDetailsModal';
import { useAuth } from '../context/AuthContext';
import { useGroups } from '../hooks/useData';
import { getEventTypeMeta } from '../lib/constants';
import type { CalendarEvent } from '../lib/types';
import { logAudit } from '../lib/audit';

const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function Schedule() {
    const { user, isAdmin } = useAuth();
    const { groups } = useGroups();

    const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([]);
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [addEventDate, setAddEventDate] = useState<Date>(() => new Date());
    const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    useEffect(() => {
        return subscribe<CalendarEvent>('events', undefined, (docs) => {
            const list: ScheduleEvent[] = [];
            docs.forEach(data => {
                const dateObj = toDate(data.date);
                if (dateObj) list.push({ ...data, dateObj });
            });
            setAllEvents(list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()));
        }, (error) => console.error('Error loading events:', error));
    }, []);

    const groupNames = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups]);
    const myGroupIds = useMemo(
        () => new Set(groups.filter(g => user && g.members?.includes(user.uid)).map(g => g.id)),
        [groups, user]
    );

    // My events, events where I'm the companion, and events of my groups
    const events = useMemo(() => allEvents.filter(e =>
        e.userId === user?.uid ||
        e.companionId === user?.uid ||
        (e.groupId && myGroupIds.has(e.groupId)) ||
        (!e.userId && !e.groupId)
    ), [allEvents, user, myGroupIds]);

    // Keep the open modal in sync with live data (e.g. after editing)
    const liveSelectedEvent = selectedEvent ? events.find(e => e.id === selectedEvent.id) || null : null;

    const canEdit = (event: ScheduleEvent) => isAdmin || !event.userId || event.userId === user?.uid;

    const monthStart = startOfMonth(currentMonth);
    const days = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(endOfMonth(monthStart))
    });

    const currentMonthEvents = events.filter(event => isSameMonth(event.dateObj, currentMonth));
    const getEventsForDay = (day: Date) => events.filter(event => isSameDay(event.dateObj, day));
    const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

    const openAddEvent = (date: Date) => {
        setEditingEvent(null);
        setAddEventDate(date);
        setIsAddEventOpen(true);
    };

    const handleDelete = async (event: ScheduleEvent) => {
        if (!window.confirm(`¿Eliminar el evento "${event.title || 'Evento'}"?`)) return;
        try {
            await api.remove('events', event.id);
            logAudit(`Eliminó el evento: ${event.title || ''}`);
            setSelectedEvent(null);
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Error al eliminar el evento.');
        }
    };

    return (
        <div className="space-y-6 flex flex-col lg:h-[calc(100vh-4rem)]">
            <div className='flex flex-col xl:flex-row xl:items-center justify-between gap-4'>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Agenda</h1>
                    <p className="text-slate-400">Tus estudios, reuniones y eventos de grupo.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={cn("p-2 rounded-md transition-all", viewMode === 'calendar' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white")}
                            title="Vista de calendario"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white")}
                            title="Vista de lista"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Mes anterior">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button onClick={() => setCurrentMonth(new Date())} className="text-center px-3 w-32" title="Ir a hoy">
                            <span className="block text-sm font-semibold text-white capitalize">{format(currentMonth, 'MMMM', { locale: es })}</span>
                            <span className="block text-xs font-bold text-slate-500">{format(currentMonth, 'yyyy')}</span>
                        </button>
                        <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Mes siguiente">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => openAddEvent(new Date())}
                        className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Añadir Evento</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl flex flex-col">
                {viewMode === 'calendar' ? (
                    <>
                        <div className="grid grid-cols-7 border-b border-slate-800">
                            {weekDays.map((day) => (
                                <div key={day} className="py-3 text-center text-xs sm:text-sm font-medium text-slate-400 border-r border-slate-800 last:border-r-0">
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
                                        onClick={() => setSelectedDate(day)}
                                        className={cn(
                                            "min-h-[80px] sm:min-h-[100px] border-b border-r border-slate-800 p-1 sm:p-2 transition-colors hover:bg-slate-800/20 cursor-pointer [&:nth-child(7n)]:border-r-0",
                                            !isSameMonth(day, monthStart) && "bg-slate-950/50 opacity-50",
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
                                                <button
                                                    key={event.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                                    className={cn("w-full text-left px-1.5 py-1 rounded text-[10px] font-medium truncate border", getEventTypeMeta(event.type).className)}
                                                    title={event.title}
                                                >
                                                    <span className="hidden sm:inline">{event.time ? `${event.time} ` : ''}</span>{event.title || 'Evento'}
                                                </button>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-slate-500 pl-1">+{dayEvents.length - 3} más</div>
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
                            currentMonthEvents.map((event) => {
                                const meta = getEventTypeMeta(event.type);
                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer group"
                                    >
                                        <div className={cn("h-12 w-12 shrink-0 rounded-lg flex flex-col items-center justify-center border font-bold", meta.className)}>
                                            <span className="text-xs uppercase">{format(event.dateObj, 'MMM', { locale: es })}</span>
                                            <span className="text-lg leading-none">{format(event.dateObj, 'd')}</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">{event.title || 'Evento'}</h3>
                                                <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border shrink-0", meta.className)}>
                                                    {meta.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{event.time || 'Sin hora'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{event.location || 'Sin ubicación'}</span>
                                                </div>
                                                {event.groupId && groupNames[event.groupId] && <span className="text-slate-500">{groupNames[event.groupId]}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full py-16 flex flex-col items-center justify-center text-slate-500">
                                <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
                                <p>No hay eventos en {format(currentMonth, "MMMM 'de' yyyy", { locale: es })}</p>
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
                    if (selectedDate) openAddEvent(selectedDate);
                    setSelectedDate(null);
                }}
                events={selectedDateEvents}
                onEventClick={(event) => {
                    setSelectedEvent(event);
                    setSelectedDate(null);
                }}
            />

            <AddEventSidebar
                isOpen={isAddEventOpen}
                onClose={() => { setIsAddEventOpen(false); setEditingEvent(null); }}
                selectedDate={addEventDate}
                event={editingEvent}
            />

            <EventDetailsModal
                isOpen={!!liveSelectedEvent}
                onClose={() => setSelectedEvent(null)}
                event={liveSelectedEvent}
                groupName={liveSelectedEvent?.groupId ? groupNames[liveSelectedEvent.groupId] : undefined}
                canEdit={liveSelectedEvent ? canEdit(liveSelectedEvent) : false}
                onEdit={(event) => {
                    setSelectedEvent(null);
                    setEditingEvent(event);
                    setIsAddEventOpen(true);
                }}
                onDelete={handleDelete}
            />
        </div>
    );
}
