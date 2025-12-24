import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            if (isResetting) {
                await sendPasswordResetEmail(auth, email);
                setSuccessMessage('Si el correo existe, recibirás un enlace de recuperación pronto.');
                // Optionally switch back to login after short delay? 
                // For now, let user choose when to go back.
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                navigate('/');
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            if (isResetting) {
                setError('Error al enviar correo. Verifica que el email sea correcto.');
            } else {
                setError('Error al iniciar sesión. Verifica tus credenciales.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {isResetting ? 'Recuperar Contraseña' : 'Bienvenido'}
                    </h1>
                    <p className="text-slate-400">
                        {isResetting
                            ? 'Ingresa tu email para recibir un enlace de recuperación'
                            : 'Inicia sesión para continuar'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg mb-6 text-sm text-center">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                    </div>

                    {!isResetting && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-300">Contraseña</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetting(true);
                                        setError('');
                                        setSuccessMessage('');
                                    }}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="animate-spin h-4 w-4" />}
                        {loading
                            ? (isResetting ? 'Enviando...' : 'Entrando...')
                            : (isResetting ? 'Enviar Enlace' : 'Iniciar Sesión')
                        }
                    </button>

                    {isResetting && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsResetting(false);
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="w-full text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al inicio de sesión
                        </button>
                    )}
                </form>

                {!isResetting && (
                    <div className="mt-6 text-center text-sm text-slate-400">
                        ¿No tienes cuenta?{' '}
                        <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                            Regístrate
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
