import { useMemo, useState } from 'react';
import { X, Loader2, Upload, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { compressImage, normalizeText } from '../../lib/utils';
import { useUsers } from '../../hooks/useData';
import { useAuth } from '../../context/AuthContext';
import { MINISTRIES } from '../../lib/constants';
import type { Group } from '../../lib/types';
import { logAudit } from '../../lib/audit';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    group?: Group | null; // When provided the modal edits this group
    onCreated?: (groupId: string) => void;
}

export function CreateGroupModal({ isOpen, onClose, group, onCreated }: CreateGroupModalProps) {
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
                        className="relative w-full max-w-lg max-h-[90vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        <GroupForm key={group?.id || 'new'} group={group} onClose={onClose} onCreated={onCreated} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function GroupForm({ group, onClose, onCreated }: { group?: Group | null; onClose: () => void; onCreated?: (id: string) => void }) {
    const { user } = useAuth();
    const { users } = useUsers();
    const [isLoading, setIsLoading] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [formData, setFormData] = useState(() => ({
        name: group?.name || '',
        description: group?.description || '',
        imageUrl: group?.imageUrl || '',
        ministry: group?.ministry || '',
        // The creator is a member by default
        members: group?.members || (user ? [user.uid] : []),
    }));

    const visibleUsers = useMemo(() => {
        const term = normalizeText(memberSearch);
        if (!term) return users;
        return users.filter(u => normalizeText(`${u.name} ${u.username} ${u.email}`).includes(term));
    }, [users, memberSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMemberToggle = (memberId: string) => {
        setFormData(prev => {
            const members = prev.members.includes(memberId)
                ? prev.members.filter(id => id !== memberId)
                : [...prev.members, memberId];
            return { ...prev, members };
        });
    };

    const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const image = await compressImage(file);
            setFormData(prev => ({ ...prev, imageUrl: image }));
        } catch (err) {
            console.error("Error converting file", err);
            alert("Error procesando la imagen");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsLoading(true);
        const data = { ...formData, name: formData.name.trim(), description: formData.description.trim() };
        try {
            if (group) {
                await api.update('groups', group.id, { ...data });
                logAudit(`Editó el grupo: ${data.name}`);
            } else {
                const ref = await api.create('groups', {
                    ...data,
                    createdBy: user?.uid || null,
                });
                logAudit(`Creó el grupo: ${data.name}`);
                onCreated?.(ref.id);
            }
            onClose();
        } catch (error) {
            console.error("Error saving group: ", error);
            alert("Error al guardar el grupo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white">{group ? 'Editar Grupo' : 'Crear Nuevo Grupo'}</h2>
                    <p className="text-sm text-slate-400">Configura los detalles del grupo.</p>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Nombre del Grupo *</label>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        type="text"
                        placeholder="Ej: Discípulos del Lunes"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Descripción</label>
                    <input
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        type="text"
                        placeholder="Ej: Grupo de estudio para nuevos creyentes"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Foto del Grupo</label>
                    <div className="flex items-center gap-4">
                        {formData.imageUrl && (
                            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-slate-700 shrink-0">
                                <img src={formData.imageUrl} alt="Vista previa" className="h-full w-full object-cover" />
                            </div>
                        )}
                        <label className="flex-1 cursor-pointer">
                            <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2">
                                <Upload className="h-4 w-4" />
                                <span className="text-sm">{formData.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}</span>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                        </label>
                        {formData.imageUrl && (
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))} className="text-xs text-slate-400 hover:text-red-400">
                                Quitar
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Ministerio</label>
                    <select
                        name="ministry"
                        value={formData.ministry}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    >
                        <option value="">Sin ministerio (opcional)</option>
                        {MINISTRIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-300">Miembros ({formData.members.length})</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            value={memberSearch}
                            onChange={e => setMemberSearch(e.target.value)}
                            placeholder="Buscar usuarios..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 max-h-48 overflow-y-auto">
                        {visibleUsers.length === 0 && <p className="text-sm text-slate-500 p-2">No hay usuarios.</p>}
                        {visibleUsers.map(member => (
                            <label
                                key={member.id}
                                className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.members.includes(member.id)}
                                    onChange={() => handleMemberToggle(member.id)}
                                    className="accent-emerald-500"
                                />
                                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white overflow-hidden shrink-0">
                                    {member.photoURL ? <img src={member.photoURL} alt="" className="h-full w-full object-cover" /> : (member.name || '?').substring(0, 1).toUpperCase()}
                                </div>
                                <span className="text-sm text-slate-200 truncate">
                                    {member.name || member.email}
                                    {member.id === user?.uid && <span className="text-slate-500"> (tú)</span>}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !formData.name.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                    {isLoading ? 'Guardando...' : group ? 'Guardar Cambios' : 'Crear Grupo'}
                </button>
            </div>
        </form>
    );
}
