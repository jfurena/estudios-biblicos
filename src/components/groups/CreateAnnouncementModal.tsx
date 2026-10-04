import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { Announcement } from '../../lib/types';
import { logAudit } from '../../lib/audit';

interface CreateAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    initialData?: Announcement | null;
}

export function CreateAnnouncementModal({ isOpen, onClose, groupId, initialData }: CreateAnnouncementModalProps) {
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
                        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden"
                    >
                        <AnnouncementForm key={initialData?.id || 'new'} groupId={groupId} initialData={initialData} onClose={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function AnnouncementForm({ groupId, initialData, onClose }: { groupId: string; initialData?: Announcement | null; onClose: () => void }) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState(initialData?.text || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !groupId || !text.trim()) return;

        setLoading(true);
        try {
            if (initialData) {
                await api.update('announcements', initialData.id, {
                    text: text.trim(),
                });
            } else {
                await api.create('announcements', {
                    text: text.trim(),
                    groupId,
                    userId: user.uid,
                    createdBy: profile?.name || user.displayName || user.email,
                });
                logAudit('Publicó un comunicado de grupo');
            }
            onClose();
        } catch (error) {
            console.error("Error saving announcement:", error);
            alert("Error al guardar el comunicado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-lg font-bold text-white">{initialData ? 'Editar Comunicado' : 'Nuevo Comunicado'}</h2>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <textarea
                    required
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 h-32 resize-none"
                    placeholder="Escribe el comunicado para el grupo..."
                />

                <button
                    type="submit"
                    disabled={loading || !text.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Guardar Cambios' : 'Publicar')}
                </button>
            </form>
        </>
    );
}
