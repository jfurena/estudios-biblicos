import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { subscribe } from '../../lib/api';
import type { HistoryEntry, Person } from '../../lib/types';
import { getPersonName, toDate, toMillis } from '../../lib/utils';
import { addPersonHistory } from '../../lib/audit';

interface PersonHistoryModalProps {
    person: Person | null;
    onClose: () => void;
}

export function PersonHistoryModal({ person, onClose }: PersonHistoryModalProps) {
    return (
        <AnimatePresence>
            {person && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-lg max-h-[85vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col"
                    >
                        <HistoryContent key={person.id} person={person} onClose={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function HistoryContent({ person, onClose }: { person: Person; onClose: () => void }) {
    const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        return subscribe<HistoryEntry>('person_history', { personId: person.id }, (docs) => {
            setEntries(docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)));
        }, (error) => {
            console.error('Error loading history:', error);
            setEntries([]);
        });
    }, [person.id]);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) return;
        setSaving(true);
        await addPersonHistory(person.id, 'note', note.trim());
        setNote('');
        setSaving(false);
    };

    return (
        <>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-emerald-500" />
                    <div>
                        <h2 className="text-lg font-bold text-white">Historial</h2>
                        <p className="text-xs text-slate-400">{getPersonName(person)}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {entries === null ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                ) : entries.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Sin registros todavía.</p>
                ) : (
                    entries.map(entry => {
                        const date = toDate(entry.createdAt);
                        return (
                            <div key={entry.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                                <p className="text-sm text-slate-200 whitespace-pre-wrap">{entry.text}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {entry.userName || 'Usuario'} · {date ? format(date, "d 'de' MMM yyyy, HH:mm", { locale: es }) : 'Ahora'}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={handleAddNote} className="p-4 border-t border-slate-800 flex gap-2">
                <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Añadir una nota (ej. cómo fue el estudio)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                    type="submit"
                    disabled={saving || !note.trim()}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
            </form>
        </>
    );
}
