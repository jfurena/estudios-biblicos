import { useState } from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { convertFileToBase64 } from '../../lib/utils';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        ministry: '',
        members: [] as string[]
    });

    const potentialMembers = [
        { id: '1', name: "George's Mind" },
        { id: '2', name: "J-Furena" }
    ];

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

    const handleSubmit = async () => {
        if (!formData.name) return;

        setIsLoading(true);
        try {
            await addDoc(collection(db, "groups"), {
                ...formData,
                createdAt: new Date(),
                stats: {
                    activeMembers: formData.members.length, // Initial count
                    pending: 0,
                    completed: 0
                }
            });
            onClose();
            setFormData({
                name: '',
                description: '',
                imageUrl: '',
                ministry: '',
                members: []
            });
            alert("Grupo creado correctamente");
        } catch (error) {
            console.error("Error adding group: ", error);
            alert("Error al crear el grupo.");
        } finally {
            setIsLoading(false);
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
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-800">
                        <div>
                            <h2 className="text-xl font-bold text-white">Crear Nuevo Grupo</h2>
                            <p className="text-sm text-slate-400">Configura los detalles de tu nuevo grupo.</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Nombre del Grupo</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
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
                            <label className="text-sm font-medium text-slate-300">Foto de Perfil del Grupo</label>
                            <div className="flex items-center gap-4">
                                {formData.imageUrl && (
                                    <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-slate-700">
                                        <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                                    </div>
                                )}
                                <label className="flex-1 cursor-pointer">
                                    <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        <span className="text-sm">Subir imagen</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                try {
                                                    const base64 = await convertFileToBase64(file);
                                                    setFormData(prev => ({ ...prev, imageUrl: base64 }));
                                                } catch (err) {
                                                    console.error("Error converting file", err);
                                                    alert("Error subiendo la imagen");
                                                }
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Ministerio</label>
                            <select
                                name="ministry"
                                value={formData.ministry}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                            >
                                <option value="">Asignar a un ministerio (opcional)</option>
                                <option value="youth">Ministerio de Jóvenes</option>
                                <option value="worship">Alabanza</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-300">Añadir Miembros</label>
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 max-h-40 overflow-y-auto">
                                {potentialMembers.map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => handleMemberToggle(member.id)}
                                        className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.members.includes(member.id)}
                                            readOnly
                                            className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                                        />
                                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                            {member.name.substring(0, 1)}
                                        </div>
                                        <span className="text-sm text-slate-200">{member.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !formData.name}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                            {isLoading ? 'Creando...' : 'Crear Grupo'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
