import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, User, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, setToken } from '../../lib/api';
import { compressImage } from '../../lib/utils';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        <ProfileForm onClose={onClose} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

function ProfileForm({ onClose }: { onClose: () => void }) {
    const { user, profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState(() => ({
        displayName: profile?.name || user?.displayName || '',
        username: profile?.username || '',
        phone: profile?.phone || '',
        photoURL: profile?.photoURL || '',
    }));

    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const image = await compressImage(file);
            setFormData(prev => ({ ...prev, photoURL: image }));
        } catch (err) {
            console.error("Error converting file", err);
            setError("Error procesando la imagen.");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.displayName.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }
        setIsLoading(true);
        setError('');

        let username = formData.username.trim().replace(/\s+/g, '');
        if (username && !username.startsWith('@')) username = '@' + username;

        try {
            if (passwords.newPassword) {
                if (passwords.newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
                const res = await api.request<{ token: string }>('POST', '/api/auth/password', passwords);
                setToken(res.token);
            }

            await api.update('users', user.uid, {
                name: formData.displayName.trim(),
                username,
                phone: formData.phone.trim(),
                photoURL: formData.photoURL,
            });

            onClose();
        } catch (err) {
            console.error("Error updating profile:", err);
            setError(err instanceof Error ? err.message : "Error al actualizar el perfil.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                    <p className="text-sm text-slate-400">Actualiza tu información personal.</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">{error}</div>}

                <div className="flex flex-col items-center gap-4">
                    <div className="h-32 w-32 rounded-full overflow-hidden ring-4 ring-slate-800 bg-slate-800">
                        {formData.photoURL ? (
                            <img src={formData.photoURL} alt="Vista previa" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-700">
                                <User className="h-16 w-16 text-slate-500" />
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-700"
                        >
                            <Upload className="h-4 w-4" />
                            Subir foto
                        </button>
                        {formData.photoURL && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, photoURL: '' }))}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-red-500/10 text-slate-300 hover:text-red-400 text-sm font-medium rounded-lg transition-colors border border-slate-700"
                            >
                                <Trash2 className="h-4 w-4" />
                                Quitar
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Nombre a mostrar</label>
                        <input name="displayName" value={formData.displayName} onChange={handleChange} type="text" required className={inputClass} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Nombre de usuario</label>
                        <input name="username" value={formData.username} onChange={handleChange} type="text" placeholder="@usuario" className={inputClass} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Teléfono</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="+1 809..." className={inputClass} />
                    </div>
                </div>

                <div className="space-y-4 border-t border-slate-800 pt-6">
                    <p className="text-sm font-medium text-slate-300">Cambiar contraseña (opcional)</p>
                    <input
                        type="password"
                        autoComplete="current-password"
                        value={passwords.currentPassword}
                        onChange={e => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Contraseña actual"
                        className={inputClass}
                    />
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={passwords.newPassword}
                        onChange={e => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Nueva contraseña (mínimo 6 caracteres)"
                        className={inputClass}
                    />
                </div>
            </div>

            <div className="p-6 border-t border-slate-800">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-white text-slate-950 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
}
