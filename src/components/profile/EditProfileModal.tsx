import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { convertFileToBase64 } from '../../lib/utils';
import { updateProfile } from 'firebase/auth';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
        phone: '',
        email: '',
        photoURL: ''
    });

    useEffect(() => {
        if (isOpen && user) {
            const fetchUserData = async () => {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setFormData({
                        displayName: data.name || user.displayName || '',
                        username: data.username || '',
                        phone: data.phone || '',
                        email: data.email || user.email || '',
                        photoURL: data.photoURL || user.photoURL || ''
                    });
                    setPreviewImage(data.photoURL || user.photoURL || null);
                } else {
                    // Fallback if doc doesn't exist but auth does
                    setFormData({
                        displayName: user.displayName || '',
                        username: '',
                        phone: '',
                        email: user.email || '',
                        photoURL: user.photoURL || ''
                    });
                }
            };
            fetchUserData();
        }
    }, [isOpen, user]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await convertFileToBase64(file);
                setPreviewImage(base64);
                setFormData(prev => ({ ...prev, photoURL: base64 }));
            } catch (err) {
                console.error("Error converting file", err);
                alert("Error procesando la imagen");
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Update Auth Profile
            await updateProfile(user, {
                displayName: formData.displayName,
                photoURL: formData.photoURL
            });

            // Update Firestore Document
            await updateDoc(doc(db, "users", user.uid), {
                name: formData.displayName,
                username: formData.username,
                phone: formData.phone,
                photoURL: formData.photoURL,
                updatedAt: new Date()
            });

            onClose();
            alert("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error al actualizar el perfil.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-800/10">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                                    <p className="text-sm text-slate-400">Actualiza tu información personal.</p>
                                </div>
                                <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-slate-300">Foto de Perfil</label>
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-32 w-32 rounded-full overflow-hidden ring-4 ring-slate-800 bg-slate-800 relative group">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center bg-slate-700">
                                                    <User className="h-16 w-16 text-slate-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 w-full justify-center">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-700"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Subir
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Nombre a mostrar</label>
                                        <input
                                            name="displayName"
                                            value={formData.displayName}
                                            onChange={handleChange}
                                            type="text"
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Nombre de usuario</label>
                                        <input
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            type="text"
                                            placeholder="@usuario"
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Teléfono</label>
                                        <input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            type="tel"
                                            placeholder="+1..."
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800/10 bg-slate-900">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-white text-slate-950 hover:bg-slate-200 rounded-lg transition-colors shadow-lg shadow-white/5 disabled:opacity-50"
                                >
                                    {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
                                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
