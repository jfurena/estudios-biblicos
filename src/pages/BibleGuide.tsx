import { useMemo, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { AddStudySidebar } from '../components/guide/AddStudySidebar';
import { useBibleStudies, usePeople } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { logAudit } from '../lib/audit';
import type { BibleStudy } from '../lib/types';

export default function BibleGuide() {
    const { isAdmin } = useAuth();
    const { studies, loading } = useBibleStudies();
    const { people } = usePeople();
    const [isAddStudyOpen, setIsAddStudyOpen] = useState(false);

    const counts = useMemo(() => {
        const map: Record<string, number> = {};
        people.forEach(p => {
            if (p.study) map[p.study] = (map[p.study] || 0) + 1;
        });
        return map;
    }, [people]);

    const handleDelete = async (study: BibleStudy) => {
        const inUse = counts[study.name] || 0;
        const warning = inUse > 0 ? ` ${inUse} persona(s) lo tienen asignado; lo conservarán como texto.` : '';
        if (!window.confirm(`¿Eliminar el estudio "${study.name}"?${warning}`)) return;
        try {
            await api.remove('bible_studies', study.id);
            logAudit(`Eliminó el estudio: ${study.name}`);
        } catch (error) {
            console.error('Error deleting study:', error);
            alert('Error al eliminar el estudio.');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Guía de Estudios Bíblicos</h1>
                    <p className="text-slate-400">Gestiona los estudios disponibles en la aplicación.</p>
                </div>
                <button
                    onClick={() => setIsAddStudyOpen(true)}
                    className="flex items-center gap-2 bg-white text-slate-950 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-all w-fit"
                >
                    <Plus className="h-4 w-4" />
                    Añadir Estudio
                </button>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800/50 text-slate-400 text-sm">
                                    <th className="p-4 font-medium">#</th>
                                    <th className="p-4 font-medium">Nombre del Estudio</th>
                                    <th className="p-4 font-medium">Creado por</th>
                                    <th className="p-4 font-medium text-center">Personas</th>
                                    <th className="p-4 font-medium text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {studies.map((study, index) => (
                                    <tr key={study.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 text-slate-500 w-12">{index + 1}</td>
                                        <td className="p-4 font-medium text-slate-200">
                                            {study.name}
                                            {!study.custom && <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">Base</span>}
                                        </td>
                                        <td className="p-4 text-slate-400">{study.owner}</td>
                                        <td className="p-4 text-center text-slate-300">{counts[study.name] || 0}</td>
                                        <td className="p-4 text-right">
                                            {study.custom && isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(study)}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Eliminar estudio"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AddStudySidebar
                isOpen={isAddStudyOpen}
                onClose={() => setIsAddStudyOpen(false)}
                existingNames={studies.map(s => s.name)}
            />
        </div>
    );
}
