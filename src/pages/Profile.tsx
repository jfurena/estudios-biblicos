import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Edit, Loader2 } from 'lucide-react';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';

export default function Profile() {
    const { user: currentUser } = useAuth();
    const { userId } = useParams();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    // State for the user being VIEWED
    const [profileUser, setProfileUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        pending: 0,
        completed: 0
    });

    const isOwnProfile = !userId || (currentUser && userId === currentUser.uid);

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                let targetUid = userId;
                if (!targetUid && currentUser) {
                    targetUid = currentUser.uid;
                }

                if (!targetUid) {
                    setLoading(false);
                    return;
                }

                // Fetch User Details
                const userDoc = await getDoc(doc(db, "users", targetUid));
                if (userDoc.exists()) {
                    setProfileUser({ id: targetUid, ...userDoc.data() });
                } else if (isOwnProfile && currentUser) {
                    // Fallback if doc missing but auth exists
                    setProfileUser({
                        id: currentUser.uid,
                        name: currentUser.displayName,
                        email: currentUser.email,
                        photoURL: currentUser.photoURL,
                        username: '@nuevo_usuario'
                    });
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId, currentUser]);

    // Fetch Stats for this user (assuming they are "inCharge" of people)
    useEffect(() => {
        if (!profileUser?.id) return;

        // Query by inChargeId for robust linking
        const q = query(collection(db, "people"), where("inChargeId", "==", profileUser.id));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const allPeople = querySnapshot.docs.map(doc => doc.data());

            setStats({
                total: allPeople.filter(p => !['pending', 'guest'].includes(p.status?.toLowerCase())).length,
                active: allPeople.filter(p => p.status?.toLowerCase() === 'active').length,
                pending: allPeople.filter(p => p.status?.toLowerCase() === 'pending').length,
                completed: allPeople.filter(p => p.status?.toLowerCase() === 'completed').length
            });
        });

        return () => unsubscribe();
    }, [profileUser]);

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-emerald-500" /></div>;
    }

    if (!profileUser) {
        return <div className="text-center py-10 text-slate-400">Usuario no encontrado.</div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight">Perfil</h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-1 p-8 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col items-center text-center"
                >
                    <div className="relative mb-6">
                        <div className="h-32 w-32 rounded-full bg-slate-700 overflow-hidden ring-4 ring-slate-800">
                            {profileUser.photoURL ? (
                                <img src={profileUser.photoURL} alt={profileUser.name} className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-full w-full text-slate-500 p-6" />
                            )}
                        </div>
                        <span className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 border-4 border-slate-900 rounded-full"></span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">{profileUser.name || 'Sin Nombre'}</h2>
                    <p className="text-slate-400 text-sm mb-4">{profileUser.username || ''}</p>
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 mb-6">Active</span>

                    <p className="text-xs text-slate-500 mb-8">
                        {profileUser.createdAt?.seconds
                            ? `Miembro desde ${new Date(profileUser.createdAt.seconds * 1000).toLocaleDateString()}`
                            : 'Miembro reciente'}
                    </p>

                    <div className="grid grid-cols-4 w-full gap-2 border-t border-slate-800 pt-6">
                        <div className="text-center">
                            <div className="text-xl font-bold text-white">{stats.total}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Totales</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-white">{stats.active}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Activos</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-white">{stats.pending}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Pendientes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-white">{stats.completed}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Completados</div>
                        </div>
                    </div>
                </motion.div>

                {/* Details & Actions */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    {/* Ministerios */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-5 w-5 text-slate-400" />
                            <h3 className="text-lg font-semibold text-white">Ministerios</h3>
                        </div>
                        <p className="text-slate-500 text-sm">No es parte de ningún ministerio.</p>
                    </motion.div>

                    {/* Acciones */}
                    {isOwnProfile && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm shadow-xl"
                        >
                            <h3 className="text-lg font-semibold text-white mb-6">Acciones</h3>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors border border-slate-700"
                                >
                                    <Edit className="h-4 w-4" />
                                    Editar Perfil
                                </button>
                                <p className="text-sm text-slate-500 flex items-center">
                                    Añade tu teléfono en "Editar Perfil" para usar WhatsApp.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
            />
        </div>
    );
}
