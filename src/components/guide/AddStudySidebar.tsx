import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AddStudySidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddStudySidebar({ isOpen, onClose }: AddStudySidebarProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            await addDoc(collection(db, "bible_studies"), {
                name: name.trim(),
                owner: 'N/A', // Default or user input if needed
                createdAt: new Date()
            });
            onClose();
            setName('');
            alert("Estudio añadido correctamente");
        } catch (error) {
            console.error("Error adding study: ", error);
            alert("Error al añadir el estudio.");
        } finally {
            setIsLoading(false);
        }
    };

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
                        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800/10">
                            <div>
                                <h2 className="text-xl font-bold text-white">Añadir Nuevo Estudio</h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Añade un nuevo estudio a la lista de opciones disponibles.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">
                                        Nombre del Estudio
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder=""
                                        autoFocus
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800/50 bg-slate-900/50">
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !name.trim()}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-slate-950 hover:bg-slate-200 rounded-lg transition-colors shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    {isLoading ? 'Añadiendo...' : 'Añadir Estudio'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
