import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-slate-950 text-white">Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
}
