import type { EventType, PersonStatus, UserRole } from './types';

export const BIBLE_STUDIES = [
    { id: 1, name: "La Palabra (Las Tradiciones)", owner: "N/A" },
    { id: 2, name: "La Palabra", owner: "N/A" },
    { id: 3, name: "La Luz", owner: "N/A" },
    { id: 4, name: "Buscando a Dios", owner: "N/A" },
    { id: 5, name: "El Arrepentimiento", owner: "N/A" },
    { id: 6, name: "El Costo", owner: "N/A" },
    { id: 7, name: "La Iglesia", owner: "N/A" },
];

export const STATUS_OPTIONS: { value: PersonStatus; label: string; className: string }[] = [
    { value: 'guest', label: 'Invitado', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    { value: 'pending', label: 'Pendiente', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    { value: 'active', label: 'Activo', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'paused', label: 'Pausado', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { value: 'completed', label: 'Completado', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { value: 'inactive', label: 'Inactivo', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
];

export function getStatusMeta(status?: string) {
    const normalized = (status || 'guest').toLowerCase();
    return STATUS_OPTIONS.find(s => s.value === normalized) || STATUS_OPTIONS[0];
}

export const MINISTRIES = [
    { value: 'youth', label: 'Ministerio de Jóvenes' },
    { value: 'worship', label: 'Alabanza' },
    { value: 'singles', label: 'Ministerio de Solteros' },
    { value: 'couples', label: 'Matrimonios' },
    { value: 'children', label: 'Niños' },
];

export function getMinistryLabel(value?: string) {
    if (!value) return '';
    return MINISTRIES.find(m => m.value === value)?.label || value;
}

export const EVENT_TYPES: { value: EventType; label: string; className: string }[] = [
    { value: 'study', label: 'Estudio', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'service', label: 'Servicio', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'meeting', label: 'Reunión', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'social', label: 'Social', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
];

export function getEventTypeMeta(type?: string) {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[2];
}

export const ROLES: { value: UserRole; label: string }[] = [
    { value: 'user', label: 'Usuario' },
    { value: 'leader', label: 'Líder' },
    { value: 'admin', label: 'Administrador' },
];

export function getRoleLabel(role?: string) {
    return ROLES.find(r => r.value === role)?.label || 'Usuario';
}
