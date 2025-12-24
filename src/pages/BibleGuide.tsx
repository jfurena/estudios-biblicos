import { useState } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { AddStudySidebar } from '../components/guide/AddStudySidebar';

import { BIBLE_STUDIES } from '../lib/constants';

// Use BIBLE_STUDIES instead of mockStudies

export default function BibleGuide() {
    const [isAddStudyOpen, setIsAddStudyOpen] = useState(false);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Guía de Estudios Bíblicos</h1>
                    <p className="text-slate-400">
                        Gestiona los estudios disponibles en la aplicación.
                    </p>
                </div>
                <button
                    onClick={() => setIsAddStudyOpen(true)}
                    className="flex items-center gap-2 bg-white text-slate-950 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                    <Plus className="h-4 w-4" />
                    Añadir Estudio
                </button>
            </div>

            {/* Main Content */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800/50 text-slate-400 text-sm">
                                <th className="p-4 font-medium w-1/2">Nombre del Estudio</th>
                                <th className="p-4 font-medium w-1/4">Propietario</th>
                                <th className="p-4 font-medium w-1/4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {BIBLE_STUDIES.map((study) => (
                                <tr key={study.id} className="hover:bg-slate-800/20 transition-colors group">
                                    <td className="p-4 font-medium text-slate-200">
                                        {study.name}
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {study.owner}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddStudySidebar
                isOpen={isAddStudyOpen}
                onClose={() => setIsAddStudyOpen(false)}
            />
        </div>
    );
}
