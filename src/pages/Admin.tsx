import { useState } from 'react';
import { Users, Database, FileUp, Shield, Settings, Pencil, Download, Upload, FileText, Globe, Bell, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

type TabId = 'roles' | 'data' | 'import' | 'audit' | 'settings';

interface AdminTab {
    id: TabId;
    label: string;
    icon: any;
    description: string;
}

const tabs: AdminTab[] = [
    { id: 'roles', label: 'Roles de Usuario', icon: Users, description: 'Supervisa los roles y permisos de los usuarios.' },
    { id: 'data', label: 'Gestión de Datos', icon: Database, description: 'Visualiza análisis y exporta datos.' },
    { id: 'import', label: 'Importar Datos', icon: FileUp, description: 'Importa datos desde fuentes externas.' },
    { id: 'audit', label: 'Registros de Auditoría', icon: Shield, description: 'Verifica las acciones realizadas en el sistema.' },
    { id: 'settings', label: 'Ajustes', icon: Settings, description: 'Configuraciones generales del sistema.' },
];

// Mock data
const mockUsers = [
    { id: 1, name: "George's Mind", email: "georgesmind.eng@gmail.com", role: "viewer", groups: "Miembro", ministries: "Ninguno" },
    { id: 2, name: "J-Furena", email: "furena.hpr@gmail.com", role: "viewer", groups: "Miembro", ministries: "Ninguno" },
    { id: 3, name: "Jorge Frank Ureña", email: "jfurena02@gmail.com", role: "viewer", groups: "Principal en 'X', Principal en 'Charla de Oliver'", ministries: "Ministerio de Solteros (Miercoles)" },
];

const mockAuditLogs = [
    { id: 1, date: "2023-10-24 10:05:14", user: "David Chen", action: "Added new person: Mary Williams" },
    { id: 2, date: "2023-10-24 09:30:02", user: "Admin User", action: "Exported people data" },
    { id: 3, date: "2023-10-23 18:01:55", user: "Sarah Miller", action: "Marked study session as complete: Book of John" },
    { id: 4, date: "2023-10-23 14:22:10", user: "Admin User", action: "Updated system settings" },
    { id: 5, date: "2023-10-22 11:45:30", user: "George's Mind", action: "Logged in" },
];

export default function Admin() {
    const [activeTab, setActiveTab] = useState<TabId>('roles');

    const renderRolesContent = () => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden"
        >
            <div className="p-6 border-b border-slate-800/50">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                    Gestión de Usuarios
                </h2>
                <p className="text-slate-400 mt-1 text-sm">
                    Supervisa los roles y permisos de los usuarios.
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800/50 text-slate-400 text-sm">
                            <th className="p-4 font-medium">Nombre</th>
                            <th className="p-4 font-medium">Correo</th>
                            <th className="p-4 font-medium">Rol</th>
                            <th className="p-4 font-medium">Grupos y Roles</th>
                            <th className="p-4 font-medium">Lidera Ministerios</th>
                            <th className="p-4 font-medium text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {mockUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                                <td className="p-4 font-medium text-slate-200">
                                    <div className="w-32 truncate" title={user.name}>{user.name}</div>
                                </td>
                                <td className="p-4 text-slate-400">{user.email}</td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        {user.groups.split(',').map((group, idx) => (
                                            <span key={idx} className={cn("text-xs px-2 py-0.5 rounded-full w-fit",
                                                group.trim().startsWith('Principal')
                                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                    : "text-slate-400"
                                            )}>
                                                {group.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-slate-400">
                                    {user.ministries !== "Ninguno" ? (
                                        <span className="text-slate-300">{user.ministries}</span>
                                    ) : (
                                        <span className="opacity-50">Ninguno</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 hover:border-slate-600">
                                        <Pencil className="w-3.5 h-3.5" />
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderDataContent = () => (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Usuarios', value: '1,248', change: '+12%', color: 'emerald' },
                    { label: 'Estudios Activos', value: '86', change: '+5%', color: 'blue' },
                    { label: 'Nuevos Miembros', value: '24', change: '+18%', color: 'amber' },
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-slate-900/50 p-6 rounded-xl border border-slate-800/50 backdrop-blur-sm"
                    >
                        <h3 className="text-slate-400 text-sm font-medium">{stat.label}</h3>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-3xl font-bold text-white">{stat.value}</span>
                            <span className={`text-sm font-medium text-${stat.color}-400 bg-${stat.color}-500/10 px-2 py-1 rounded-full border border-${stat.color}-500/20`}>
                                {stat.change}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Chart Mockup */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-900/50 p-6 rounded-xl border border-slate-800/50 backdrop-blur-sm"
                >
                    <h3 className="text-lg font-bold text-white mb-6">Actividad Reciente</h3>
                    <div className="h-64 flex items-end gap-2 px-4">
                        {[40, 65, 45, 80, 55, 70, 40, 60, 75, 50, 65, 85].map((h, i) => (
                            <div key={i} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-t-lg transition-all relative group" style={{ height: `${h}%` }}>
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded border border-slate-700 pointer-events-none">
                                    {h}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-slate-500 uppercase tracking-widest px-1">
                        <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
                        <span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
                    </div>
                </motion.div>

                {/* Export Data Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-900/50 p-6 rounded-xl border border-slate-800/50 backdrop-blur-sm flex flex-col"
                >
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Descargar Datos</h3>
                        <p className="text-slate-400 text-sm mt-1">Exporta la información para análisis externo.</p>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-medium">Exportar a Excel</div>
                                    <div className="text-xs text-slate-500">Todo el historial</div>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-medium">Exportar a CSV</div>
                                    <div className="text-xs text-slate-500">Datos crudos</div>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );

    const renderImportContent = () => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden p-8 text-center"
        >
            <div className="max-w-xl mx-auto space-y-8">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Importar Datos</h3>
                    <p className="text-slate-400">Sube archivos CSV o Excel para importar personas, estudios u otros datos.</p>
                </div>

                <div className="border-2 border-dashed border-slate-700 bg-slate-950/30 rounded-xl p-10 hover:border-emerald-500/50 hover:bg-slate-950/50 transition-all cursor-pointer group">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400" />
                    </div>
                    <h4 className="text-white font-medium mb-1">Selecciona un archivo para subir</h4>
                    <p className="text-slate-500 text-sm">o arrastra y suelta aquí</p>
                    <div className="mt-6">
                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800 max-w-sm mx-auto">
                            <span className="text-xs text-slate-500 pl-2">Choose File No file chosen</span>
                            <button className="px-3 py-1.5 bg-white text-slate-950 text-xs font-medium rounded-md hover:bg-slate-200 transition-colors flex items-center gap-2">
                                <Upload className="w-3 h-3" />
                                Importar
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-4">Formatos soportados: .csv, .xlsx. Tamaño máximo: 5MB.</p>
                </div>
            </div>
        </motion.div>
    );

    const renderAuditContent = () => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden"
        >
            <div className="p-6 border-b border-slate-800/50">
                <h2 className="text-xl font-bold text-slate-100">Registros de Auditoría</h2>
                <p className="text-slate-400 mt-1 text-sm">
                    Revisa un registro de todas las acciones significativas tomadas en el sistema.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800/50 text-slate-400 text-sm">
                            <th className="p-4 font-medium pl-8">Fecha y Hora</th>
                            <th className="p-4 font-medium">Usuario</th>
                            <th className="p-4 font-medium">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {mockAuditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                                <td className="p-4 font-medium text-slate-400 pl-8 font-mono text-xs">{log.date}</td>
                                <td className="p-4 text-slate-200 font-medium">{log.user}</td>
                                <td className="p-4 text-slate-300">{log.action}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderSettingsContent = () => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden p-6"
        >
            <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-100">Ajustes de la Aplicación</h2>
                <p className="text-slate-400 mt-1 text-sm">Gestiona la configuración global de la aplicación.</p>
            </div>

            <div className="space-y-8 max-w-2xl">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-slate-400" />
                        Idioma
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                        <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                            <option>Español</option>
                            <option>English</option>
                            <option>Português</option>
                        </select>
                        <p className="text-xs text-slate-500">Establece el idioma predeterminado de la aplicación.</p>
                    </div>
                </div>

                {/* More settings placeholders */}
                <div className="opacity-50 pointer-events-none space-y-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-slate-400" />
                        Notificaciones
                    </h3>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Moon className="w-5 h-5 text-slate-400" />
                        Apariencia
                    </h3>
                </div>
            </div>
        </motion.div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'roles': return renderRolesContent();
            case 'data': return renderDataContent();
            case 'import': return renderImportContent();
            case 'audit': return renderAuditContent();
            case 'settings': return renderSettingsContent();
            default: return null;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Herramientas Administrativas</h1>
                <p className="text-slate-400">
                    Supervisa datos, usuarios y configuraciones del sistema.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3",
                                activeTab === tab.id
                                    ? "bg-slate-800 text-emerald-400 border border-slate-700/50 shadow-lg shadow-black/20"
                                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            )}
                        >
                            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-emerald-500" : "opacity-70")} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full min-w-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
