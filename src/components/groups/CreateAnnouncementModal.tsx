import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Loader2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface CreateAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    initialData?: any;
}

export function CreateAnnouncementModal({ isOpen, onClose, groupId, initialData }: CreateAnnouncementModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState('');

    const [hasInitialized, setHasInitialized] = useState(false);
    if (isOpen && !hasInitialized) {
        if (initialData) {
            setText(initialData.text || '');
        } else {
            setText('');
        }
        setHasInitialized(true);
    }
    if (!isOpen && hasInitialized) setHasInitialized(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !groupId) return;

        setLoading(true);
        try {
            if (initialData) {
                await updateDoc(doc(db, "announcements", initialData.id), {
                    text: text,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, "announcements"), {
                    text: text,
                    groupId: groupId,
                    userId: user.uid,
                    createdBy: user.displayName || user.email,
                    createdAt: serverTimestamp()
                });
            }
            onClose();
            setText('');
        } catch (error) {
            console.error("Error creating announcement:", error);
        } finally {
            setLoading(false);
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
                    className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden"
                >
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
                        <div>
                            <textarea
                                required
                                value={text}
                                onChange={e => setText(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 h-32 resize-none"
                                placeholder="Escribe el comunicado para el grupo..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !text.trim()}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Guardar Cambios' : 'Publicar')}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
