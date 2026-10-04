import { useEffect, useMemo, useState } from 'react';
import { Users, Database, FileUp, Shield, Download, Upload, FileText, Loader2, ShieldAlert, CheckCircle2, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn, downloadFile, getPersonName, normalizeText, parseCSV, toCSV, toDate, toMillis } from '../lib/utils';
import { api, subscribe } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useGroups, usePeople, useUsers } from '../hooks/useData';
import { ROLES, STATUS_OPTIONS, getMinistryLabel, getRoleLabel, getStatusMeta, getEventTypeMeta } from '../lib/constants';
import type { AuditLog, CalendarEvent, UserRole } from '../lib/types';
import { logAudit } from '../lib/audit';

type TabId = 'roles' | 'data' | 'import' | 'audit';

const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: 'roles', label: 'Roles de Usuario', icon: Users },
    { id: 'data', label: 'Gestión de Datos', icon: Database },
    { id: 'import', label: 'Importar Datos', icon: FileUp },
    { id: 'audit', label: 'Registros de Auditoría', icon: Shield },
];

export default function Admin() {
    const { user, isAdmin } = useAuth();
    const { users, loading } = useUsers();
    const [activeTab, setActiveTab] = useState<TabId>('roles');
    const [claiming, setClaiming] = useState(false);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
    }

    if (!isAdmin) {
        const hasAdmin = users.some(u => u.role === 'admin');
        const claimAdmin = async () => {
            if (!user) return;
            setClaiming(true);
            try {
                await api.request('POST', '/api/auth/claim-admin');
                logAudit('Se asignó como primer administrador');
            } catch (error) {
                console.error(error);
                alert('No se pudo asignar el rol de administrador.');
            } finally {
                setClaiming(false);
            }
        };

        return (
            <div className="max-w-lg mx-auto text-center py-16 space-y-4">
                <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
                <h1 className="text-2xl font-bold text-white">Acceso restringido</h1>
                {hasAdmin ? (
                    <p className="text-slate-400">Esta sección es solo para administradores. Pide a un administrador que te asigne el rol.</p>
                ) : (
                    <>
                        <p className="text-slate-400">Todavía no hay ningún administrador. Puedes convertirte en el primero.</p>
                        <button
                            onClick={claimAdmin}
                            disabled={claiming}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50"
                        >
                            {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
                            Convertirme en administrador
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Herramientas Administrativas</h1>
                <p className="text-slate-400">Supervisa datos, usuarios y actividad del sistema.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:w-64 flex-shrink-0 flex lg:flex-col gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "lg:w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 whitespace-nowrap",
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

                <div className="flex-1 w-full min-w-0">
                    {activeTab === 'roles' && <RolesTab />}
                    {activeTab === 'data' && <DataTab />}
                    {activeTab === 'import' && <ImportTab />}
                    {activeTab === 'audit' && <AuditTab />}
                </div>
            </div>
        </div>
    );
}

function RolesTab() {
    const { user } = useAuth();
    const { users } = useUsers();
    const { groups } = useGroups();
    const [search, setSearch] = useState('');

    const adminCount = users.filter(u => u.role === 'admin').length;
    const filtered = users.filter(u => normalizeText(`${u.name} ${u.email} ${u.username}`).includes(normalizeText(search)));

    const changeRole = async (userId: string, name: string, role: UserRole) => {
        if (userId === user?.uid && role !== 'admin' && adminCount <= 1) {
            alert('Eres el único administrador. Asigna otro administrador antes de cambiar tu rol.');
            return;
        }
        try {
            await api.update('users', userId, { role });
            logAudit(`Cambió el rol de ${name} a ${getRoleLabel(role)}`);
        } catch (error) {
            console.error(error);
            alert('No se pudo cambiar el rol.');
        }
    };

    const resetPassword = async (userId: string, name: string) => {
        const password = window.prompt(`Contraseña temporal para ${name} (mínimo 6 caracteres). Compártela con la persona; podrá cambiarla en su perfil.`);
        if (!password) return;
        try {
            await api.request('POST', `/api/admin/users/${userId}/password`, { password });
            logAudit(`Asignó una contraseña temporal a ${name}`);
            alert('Contraseña actualizada.');
        } catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-100">Gestión de Usuarios</h2>
                    <p className="text-slate-400 mt-1 text-sm">{users.length} usuarios registrados · {adminCount} administrador(es)</p>
                </div>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800/50 text-slate-400 text-sm">
                            <th className="p-4 font-medium">Nombre</th>
                            <th className="p-4 font-medium">Correo</th>
                            <th className="p-4 font-medium">Rol</th>
                            <th className="p-4 font-medium">Grupos</th>
                            <th className="p-4 font-medium">Ministerios</th>
                            <th className="p-4 font-medium text-right">Acceso</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {filtered.map((u) => {
                            const userGroups = groups.filter(g => g.members?.includes(u.id));
                            const ministries = [...new Set(userGroups.map(g => g.ministry).filter(Boolean))].map(m => getMinistryLabel(m));
                            return (
                                <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="p-4 font-medium text-slate-200">
                                        <div className="max-w-[10rem] truncate" title={u.name}>{u.name || 'Sin nombre'}</div>
                                    </td>
                                    <td className="p-4 text-slate-400 text-sm">{u.email}</td>
                                    <td className="p-4">
                                        <select
                                            value={u.role || 'user'}
                                            onChange={e => changeRole(u.id, u.name || u.email || '', e.target.value as UserRole)}
                                            className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none"
                                        >
                                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            {userGroups.length === 0 && <span className="text-xs text-slate-500">Ninguno</span>}
                                            {userGroups.map(g => (
                                                <span key={g.id} className={cn("text-xs px-2 py-0.5 rounded-full w-fit",
                                                    g.createdBy === u.id ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-slate-400"
                                                )}>
                                                    {g.createdBy === u.id ? `Líder en '${g.name}'` : g.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-400">{ministries.length ? ministries.join(', ') : <span className="opacity-50">Ninguno</span>}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => resetPassword(u.id, u.name || u.email || '')}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 whitespace-nowrap"
                                        >
                                            <KeyRound className="w-3.5 h-3.5" />
                                            Nueva contraseña
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}

function useEvents() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    useEffect(() => subscribe<CalendarEvent>('events', undefined, setEvents), []);
    return events;
}

const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function DataTab() {
    const { users } = useUsers();
    const { people } = usePeople();
    const { groups } = useGroups();
    const events = useEvents();
    const year = new Date().getFullYear();

    const groupNames = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups]);

    const perMonth = useMemo(() => {
        const counts = Array(12).fill(0) as number[];
        people.forEach(p => {
            const date = toDate(p.createdAt);
            if (date && date.getFullYear() === year) counts[date.getMonth()]++;
        });
        return counts;
    }, [people, year]);
    const maxMonth = Math.max(1, ...perMonth);

    const statusCounts = STATUS_OPTIONS.map(s => ({ ...s, count: people.filter(p => getStatusMeta(p.status).value === s.value).length }));

    const stats = [
        { label: 'Usuarios', value: users.length },
        { label: 'Personas registradas', value: people.length },
        { label: 'Estudios activos', value: statusCounts.find(s => s.value === 'active')?.count || 0 },
        { label: 'Grupos', value: groups.length },
    ];

    const stamp = format(new Date(), 'yyyy-MM-dd');

    const exportPeople = () => {
        const rows = people.map(p => [
            p.firstName, p.lastName, p.phone, p.gender === 'male' ? 'Masculino' : p.gender === 'female' ? 'Femenino' : '',
            getStatusMeta(p.status).label, p.study, groupNames[p.group || ''] || '', getMinistryLabel(p.ministry),
            p.location, p.inCharge, p.support, toDate(p.createdAt) ? format(toDate(p.createdAt)!, 'yyyy-MM-dd') : '',
        ]);
        downloadFile(`personas-${stamp}.csv`, toCSV(
            ['Nombre', 'Apellido', 'Teléfono', 'Género', 'Estado', 'Estudio', 'Grupo', 'Ministerio', 'Ubicación', 'Encargado', 'Apoyo', 'Registrado'],
            rows
        ));
        logAudit('Exportó datos de personas');
    };

    const exportUsers = () => {
        const rows = users.map(u => [u.name, u.username, u.email, u.phone, getRoleLabel(u.role), toDate(u.createdAt) ? format(toDate(u.createdAt)!, 'yyyy-MM-dd') : '']);
        downloadFile(`usuarios-${stamp}.csv`, toCSV(['Nombre', 'Usuario', 'Email', 'Teléfono', 'Rol', 'Registrado'], rows));
        logAudit('Exportó datos de usuarios');
    };

    const exportEvents = () => {
        const rows = events.map(e => [
            e.title, toDate(e.date) ? format(toDate(e.date)!, 'yyyy-MM-dd') : '', e.time, getEventTypeMeta(e.type).label,
            e.location, e.personName, e.companionName, groupNames[e.groupId || ''] || '', e.createdBy,
        ]);
        downloadFile(`eventos-${stamp}.csv`, toCSV(['Título', 'Fecha', 'Hora', 'Tipo', 'Ubicación', 'Persona', 'Acompañante', 'Grupo', 'Creado por'], rows));
        logAudit('Exportó datos de eventos');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-slate-900/50 p-5 rounded-xl border border-slate-800/50">
                        <h3 className="text-slate-400 text-sm font-medium">{stat.label}</h3>
                        <span className="text-3xl font-bold text-white">{stat.value}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800/50">
                    <h3 className="text-lg font-bold text-white mb-6">Personas registradas en {year}</h3>
                    <div className="h-48 flex items-end gap-2">
                        {perMonth.map((count, i) => (
                            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                                <span className="text-[10px] text-slate-400">{count || ''}</span>
                                <div className="w-full bg-emerald-500/30 hover:bg-emerald-500/50 rounded-t transition-all" style={{ height: `${(count / maxMonth) * 100}%`, minHeight: count ? 4 : 0 }} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-500 uppercase">
                        {monthLabels.map(m => <span key={m} className="flex-1 text-center">{m}</span>)}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-300 mt-8 mb-3">Personas por estado</h3>
                    <div className="space-y-2">
                        {statusCounts.map(s => (
                            <div key={s.value} className="flex items-center gap-3 text-sm">
                                <span className="w-24 text-slate-400">{s.label}</span>
                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500/60" style={{ width: `${people.length ? (s.count / people.length) * 100 : 0}%` }} />
                                </div>
                                <span className="w-8 text-right text-slate-300">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800/50 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Descargar Datos</h3>
                        <p className="text-slate-400 text-sm mt-1">Archivos CSV compatibles con Excel y Google Sheets.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { label: 'Personas', detail: `${people.length} registros`, action: exportPeople },
                            { label: 'Usuarios', detail: `${users.length} registros`, action: exportUsers },
                            { label: 'Eventos', detail: `${events.length} registros`, action: exportEvents },
                        ].map(item => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="w-full flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <FileText className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">Exportar {item.label}</div>
                                        <div className="text-xs text-slate-500">{item.detail}</div>
                                    </div>
                                </div>
                                <Download className="w-5 h-5 text-slate-400" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Accepted CSV headers (normalized) for each person field
const HEADER_MAP: Record<string, string> = {
    nombre: 'firstName', firstname: 'firstName',
    apellido: 'lastName', apellidos: 'lastName', lastname: 'lastName',
    telefono: 'phone', phone: 'phone', celular: 'phone',
    genero: 'gender', gender: 'gender', sexo: 'gender',
    estado: 'status', status: 'status',
    estudio: 'study', study: 'study',
    grupo: 'group', group: 'group', charla: 'group',
    ubicacion: 'location', location: 'location', direccion: 'location',
    encargado: 'inCharge', apoyo: 'support',
};

function ImportTab() {
    const { users } = useUsers();
    const { groups } = useGroups();
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState('');

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        setError('');
        setResult('');
        setRows([]);
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('El archivo supera los 5MB.');
            return;
        }
        if (!/\.(csv|txt)$/i.test(file.name)) {
            setError('Solo se admiten archivos .csv. En Excel usa "Guardar como > CSV".');
            return;
        }

        setFileName(file.name);
        const parsed = parseCSV(await file.text());
        if (parsed.length < 2) {
            setError('El archivo no contiene datos.');
            return;
        }
        const headers = parsed[0].map(h => HEADER_MAP[normalizeText(h).replace(/[^a-z]/g, '')] || '');
        if (!headers.includes('firstName')) {
            setError('No se encontró la columna "Nombre". Descarga la plantilla para ver el formato.');
            return;
        }
        const data = parsed.slice(1).map(cells => {
            const record: Record<string, string> = {};
            headers.forEach((field, i) => {
                if (field && cells[i]?.trim()) record[field] = cells[i].trim();
            });
            return record;
        }).filter(r => r.firstName);
        setRows(data);
    };

    const resolveStatus = (value?: string) => {
        const term = normalizeText(value);
        return STATUS_OPTIONS.find(s => s.value === term || normalizeText(s.label) === term)?.value || 'guest';
    };
    const resolveGender = (value?: string) => {
        const term = normalizeText(value);
        if (['m', 'masculino', 'male', 'hombre', 'h'].includes(term)) return 'male';
        if (['f', 'femenino', 'female', 'mujer'].includes(term)) return 'female';
        return '';
    };
    const resolveUser = (value?: string) => {
        const term = normalizeText(value);
        if (!term) return undefined;
        return users.find(u => normalizeText(u.name) === term || normalizeText(u.email) === term || normalizeText(u.username) === term);
    };

    const handleImport = async () => {
        setImporting(true);
        setError('');
        try {
            for (let i = 0; i < rows.length; i += 200) {
                const chunk = rows.slice(i, i + 200).map(r => {
                    const group = groups.find(g => normalizeText(g.name) === normalizeText(r.group));
                    const inCharge = resolveUser(r.inCharge);
                    const support = resolveUser(r.support);
                    return {
                        firstName: r.firstName,
                        lastName: r.lastName || '',
                        phone: r.phone || '',
                        gender: resolveGender(r.gender),
                        status: resolveStatus(r.status),
                        study: r.study || '',
                        group: group?.id || '',
                        location: r.location || '',
                        ministry: group?.ministry || '',
                        inCharge: inCharge?.name || r.inCharge || '',
                        inChargeId: inCharge?.id || '',
                        inChargeUsername: inCharge?.username || '',
                        support: support?.name || r.support || '',
                        supportId: support?.id || '',
                    };
                });
                await api.createMany('people', chunk);
            }
            logAudit(`Importó ${rows.length} personas desde ${fileName}`);
            setResult(`Se importaron ${rows.length} personas correctamente.`);
            setRows([]);
        } catch (err) {
            console.error(err);
            setError('Error al importar. Revisa el archivo e inténtalo de nuevo.');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        downloadFile('plantilla-personas.csv', toCSV(
            ['Nombre', 'Apellido', 'Teléfono', 'Género', 'Estado', 'Estudio', 'Grupo', 'Ubicación', 'Encargado', 'Apoyo'],
            [['Juan', 'Pérez', '8095551234', 'Masculino', 'Invitado', 'La Palabra', '', 'Santo Domingo', '', '']]
        ));
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6 sm:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Importar Personas</h3>
                    <p className="text-slate-400">Sube un archivo CSV con una fila por persona. La columna "Nombre" es obligatoria.</p>
                    <button onClick={downloadTemplate} className="mt-2 text-sm text-emerald-400 hover:underline">Descargar plantilla</button>
                </div>

                <label className="block border-2 border-dashed border-slate-700 bg-slate-950/30 rounded-xl p-10 hover:border-emerald-500/50 transition-all cursor-pointer text-center group">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400" />
                    </div>
                    <h4 className="text-white font-medium mb-1">{fileName || 'Selecciona un archivo CSV'}</h4>
                    <p className="text-xs text-slate-600 mt-2">Formato: .csv (separado por comas o punto y coma). Máximo 5MB.</p>
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                </label>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
                {result && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> {result}
                    </div>
                )}

                {rows.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300">{rows.length} personas listas para importar. Vista previa:</p>
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950/50 text-slate-400">
                                    <tr>
                                        <th className="p-2">Nombre</th>
                                        <th className="p-2">Teléfono</th>
                                        <th className="p-2">Estado</th>
                                        <th className="p-2">Estudio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-300">
                                    {rows.slice(0, 5).map((r, i) => (
                                        <tr key={i}>
                                            <td className="p-2">{getPersonName(r)}</td>
                                            <td className="p-2">{r.phone}</td>
                                            <td className="p-2">{getStatusMeta(resolveStatus(r.status)).label}</td>
                                            <td className="p-2">{r.study}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="w-full px-4 py-2.5 bg-white text-slate-950 font-medium rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Importar {rows.length} personas
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function AuditTab() {
    const [logs, setLogs] = useState<AuditLog[] | null>(null);

    useEffect(() => {
        return subscribe<AuditLog>('audit_logs', undefined, docs => {
            setLogs(docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)).slice(0, 200));
        }, (error) => {
            console.error('Error loading audit logs:', error);
            setLogs([]);
        });
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50">
                <h2 className="text-xl font-bold text-slate-100">Registros de Auditoría</h2>
                <p className="text-slate-400 mt-1 text-sm">Las últimas 200 acciones significativas realizadas en el sistema.</p>
            </div>
            {logs === null ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
            ) : logs.length === 0 ? (
                <p className="text-center text-slate-500 py-10">Aún no hay registros.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800/50 text-slate-400 text-sm">
                                <th className="p-4 font-medium pl-6">Fecha y Hora</th>
                                <th className="p-4 font-medium">Usuario</th>
                                <th className="p-4 font-medium">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {logs.map((log) => {
                                const date = toDate(log.createdAt);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 text-slate-400 pl-6 font-mono text-xs whitespace-nowrap">
                                            {date ? format(date, 'yyyy-MM-dd HH:mm:ss', { locale: es }) : ''}
                                        </td>
                                        <td className="p-4 text-slate-200 font-medium whitespace-nowrap">{log.userName}</td>
                                        <td className="p-4 text-slate-300">{log.action}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    );
}
