import { useState, useEffect } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BIBLE_STUDIES } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';

interface AddPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface User {
    id: string;
    name?: string;
    username?: string;
    email?: string;
    [key: string]: any;
}

export function AddPersonModal({ isOpen, onClose }: AddPersonModalProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]); // Dynamic Groups

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        phone: '',
        ministry: '',
        group: '',
        study: '',
        location: '',
        inCharge: '',
        inChargeId: '',       // Stores UID
        inChargeUsername: '', // Stores @handle
        support: ''
    });

    useEffect(() => {
        // Fetch users to populate the "Encargado" dropdown
        const q = query(collection(db, "users"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
            setAvailableUsers(users);

            // Set default inCharge to current user if not set
            if (user && !formData.inChargeId) {
                // If the current user is in the fetched list (likely), set them
                const currentUserDoc = users.find(u => u.id === user.uid);
                if (currentUserDoc) {
                    setFormData(prev => ({
                        ...prev,
                        inCharge: currentUserDoc.name || user.displayName || 'Usuario',
                        inChargeId: currentUserDoc.id,
                        inChargeUsername: currentUserDoc.username || '@user'
                    }));
                }
            }
        });

        // Fetch Groups
        const groupsQuery = query(collection(db, "groups"), orderBy("name"));
        const groupsUnsub = onSnapshot(groupsQuery, (snapshot) => {
            const groupsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAvailableGroups(groupsList);
        });

        return () => {
            unsubscribe();
            groupsUnsub();
        };
    }, [user, isOpen]); // Re-run when modal opens to validly set default

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInChargeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedUserId = e.target.value;
        const selectedUser = availableUsers.find(u => u.id === selectedUserId);

        if (selectedUser) {
            setFormData(prev => ({
                ...prev,
                inCharge: selectedUser.name || 'Sin Nombre',
                inChargeId: selectedUser.id,
                inChargeUsername: selectedUser.username || '@user'
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                inCharge: '',
                inChargeId: '',
                inChargeUsername: ''
            }));
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await addDoc(collection(db, "people"), {
                ...formData,
                createdAt: new Date(),
                status: 'guest' // Start as guest (invitado)
            });
            onClose();
            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                gender: '',
                phone: '',
                ministry: '',
                group: '',
                study: '',
                location: '',
                inCharge: '',
                inChargeId: '',
                inChargeUsername: '',
                support: ''
            });
            // Defaults will be reset by useEffect next time it opens or finding user
            alert("Persona añadida correctamente");
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error al guardar. Verifica tu conexión o configuración.");
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
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">Añadir Nueva Persona</h2>
                                <p className="text-sm text-slate-400 mt-1">Rellena los detalles para registrar.</p>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Nombre</label>
                                    <input
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        type="text"
                                        placeholder="Nombre"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Apellido</label>
                                    <input
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        type="text"
                                        placeholder="Apellido"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Género</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    >
                                        <option value="">Selecciona</option>
                                        <option value="male">Masculino</option>
                                        <option value="female">Femenino</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Teléfono</label>
                                    <div className="flex gap-2">
                                        <input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            type="text"
                                            placeholder="809..."
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ministerio</label>
                                <select
                                    name="ministry"
                                    value={formData.ministry}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                >
                                    <option value="">Selecciona un ministerio</option>
                                    <option value="youth">Ministerio de Jóvenes</option>
                                    <option value="worship">Alabanza</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Charla (Grupo)</label>
                                <select
                                    name="group"
                                    value={formData.group}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                >
                                    <option value="">Selecciona un grupo</option>
                                    {availableGroups && availableGroups.length > 0 ? (
                                        availableGroups.map((grp) => (
                                            <option key={grp.id} value={grp.id}>
                                                {grp.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Cargando grupos...</option>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Estudio Actual</label>
                                    <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">Activo</span>
                                </div>
                                <select
                                    name="study"
                                    value={formData.study}
                                    onChange={handleChange}
                                    className="w-full bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-3 py-2.5 text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                >
                                    <option value="" className="bg-slate-900 text-slate-300">Selecciona un estudio...</option>
                                    {BIBLE_STUDIES.map((study) => (
                                        <option key={study.id} value={study.name} className="bg-slate-900 text-white">
                                            {study.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ubicación</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        type="text"
                                        placeholder="Ubicación..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Encargado</label>
                                <select
                                    name="inCharge"
                                    value={formData.inChargeId} // Bind to ID for uniqueness
                                    onChange={handleInChargeChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                >
                                    <option value="">Selecciona un encargado...</option>
                                    {availableUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name || user.username}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Apoyo</label>
                                <select
                                    name="support"
                                    value={formData.support}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                >
                                    <option value="">Selecciona apoyo</option>
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 sticky bottom-0 backdrop-blur-md">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : null}
                                {isLoading ? 'Guardando...' : 'Añadir Persona'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
