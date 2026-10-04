import { useState } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { MINISTRIES, STATUS_OPTIONS } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { useBibleStudies, useGroups, useUsers } from '../../hooks/useData';
import type { Person } from '../../lib/types';
import { addPersonHistory, logAudit } from '../../lib/audit';
import { getPersonName } from '../../lib/utils';

interface AddPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    person?: Person | null; // When provided the modal edits this person
}

export function AddPersonModal({ isOpen, onClose, person }: AddPersonModalProps) {
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

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
                    >
                        <PersonForm key={person?.id || 'new'} person={person} onClose={onClose} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600";
const selectClass = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";

function PersonForm({ person, onClose }: { person?: Person | null; onClose: () => void }) {
    const { user, profile } = useAuth();
    const { users } = useUsers();
    const { groups } = useGroups();
    const { studies } = useBibleStudies();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const isEditing = !!person;

    const [formData, setFormData] = useState(() => ({
        firstName: person?.firstName || '',
        lastName: person?.lastName || '',
        gender: person?.gender || '',
        phone: person?.phone || '',
        ministry: person?.ministry || '',
        group: person?.group || '',
        study: person?.study || '',
        location: person?.location || '',
        status: (person?.status || 'guest').toLowerCase(),
        // New people default to the current user as "Encargado"
        inCharge: person ? person.inCharge || '' : profile?.name || user?.displayName || '',
        inChargeId: person ? person.inChargeId || '' : user?.uid || '',
        inChargeUsername: person ? person.inChargeUsername || '' : profile?.username || '',
        support: person?.support || '',
        supportId: person?.supportId || '',
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUserSelect = (field: 'inCharge' | 'support') => (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = users.find(u => u.id === e.target.value);
        if (field === 'inCharge') {
            setFormData(prev => ({
                ...prev,
                inCharge: selected?.name || '',
                inChargeId: selected?.id || '',
                inChargeUsername: selected?.username || '',
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                support: selected?.name || '',
                supportId: selected?.id || '',
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }
        setError('');
        setIsLoading(true);

        const data = {
            ...formData,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim(),
            location: formData.location.trim(),
        };
        const name = getPersonName(data);

        try {
            if (person) {
                await api.update('people', person.id, { ...data });
                if ((person.study || '') !== data.study) {
                    await addPersonHistory(person.id, 'study', `Estudio cambiado a "${data.study || 'Ninguno'}"`);
                }
                if ((person.status || 'guest').toLowerCase() !== data.status) {
                    const label = STATUS_OPTIONS.find(s => s.value === data.status)?.label || data.status;
                    await addPersonHistory(person.id, 'status', `Estado cambiado a ${label}`);
                }
                logAudit(`Editó a la persona: ${name}`);
            } else {
                const ref = await api.create('people', {
                    ...data,
                    createdBy: user?.uid || null,
                });
                await addPersonHistory(ref.id, 'created', 'Persona registrada');
                logAudit(`Añadió nueva persona: ${name}`);
            }
            onClose();
        } catch (err) {
            console.error("Error saving person: ", err);
            setError("Error al guardar. Verifica tu conexión.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white">{isEditing ? 'Editar Persona' : 'Añadir Nueva Persona'}</h2>
                    <p className="text-sm text-slate-400 mt-1">{isEditing ? 'Actualiza los datos de la persona.' : 'Rellena los detalles para registrar.'}</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Nombre *</label>
                        <input name="firstName" value={formData.firstName} onChange={handleChange} type="text" placeholder="Nombre" required className={inputClass} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Apellido</label>
                        <input name="lastName" value={formData.lastName} onChange={handleChange} type="text" placeholder="Apellido" className={inputClass} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Género</label>
                        <select name="gender" value={formData.gender} onChange={handleChange} className={selectClass}>
                            <option value="">Selecciona</option>
                            <option value="male">Masculino</option>
                            <option value="female">Femenino</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Teléfono</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="809..." className={inputClass} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Estado</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={selectClass}>
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ministerio</label>
                        <select name="ministry" value={formData.ministry} onChange={handleChange} className={selectClass}>
                            <option value="">Ninguno</option>
                            {MINISTRIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Charla (Grupo)</label>
                    <select name="group" value={formData.group} onChange={handleChange} className={selectClass}>
                        <option value="">{groups.length > 0 ? 'Selecciona un grupo' : 'No hay grupos creados'}</option>
                        {groups.map((grp) => (
                            <option key={grp.id} value={grp.id}>{grp.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Estudio Actual</label>
                    <select
                        name="study"
                        value={formData.study}
                        onChange={handleChange}
                        className="w-full bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-3 py-2.5 text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    >
                        <option value="" className="bg-slate-900 text-slate-300">Selecciona un estudio...</option>
                        {studies.map((study) => (
                            <option key={study.id} value={study.name} className="bg-slate-900 text-white">{study.name}</option>
                        ))}
                        {formData.study && !studies.some(s => s.name === formData.study) && (
                            <option value={formData.study} className="bg-slate-900 text-white">{formData.study}</option>
                        )}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ubicación</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input name="location" value={formData.location} onChange={handleChange} type="text" placeholder="Ubicación..." className={inputClass + " pl-9"} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Encargado</label>
                    <select value={formData.inChargeId} onChange={handleUserSelect('inCharge')} className={selectClass}>
                        <option value="">Selecciona un encargado...</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.username || u.email}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Apoyo</label>
                    <select value={formData.supportId} onChange={handleUserSelect('support')} className={selectClass}>
                        <option value="">Sin apoyo</option>
                        {users.filter(u => u.id !== formData.inChargeId).map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.username || u.email}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2 disabled:opacity-50"
                >
                    {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                    {isLoading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Añadir Persona'}
                </button>
            </div>
        </form>
    );
}
