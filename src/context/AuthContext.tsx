import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, subscribeDoc } from '../lib/api';
import type { AppUser } from '../lib/types';

/** The signed-in user. `uid` mirrors `id` for readability at call sites. */
export interface SessionUser {
    uid: string;
    email: string;
    displayName: string;
}

interface AuthContextType {
    user: SessionUser | null;
    profile: AppUser | null;
    isAdmin: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    isAdmin: false,
    loading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
});

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

interface AuthResponse {
    token: string;
    user: AppUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(() => !!getToken());

    // Restore the session saved in this browser
    useEffect(() => {
        if (!getToken()) return;
        api.request<AppUser>('GET', '/api/auth/me')
            .then(setProfile)
            .catch(() => setToken(null))
            .finally(() => setLoading(false));
    }, []);

    // Keep the profile (name, photo, role...) live
    const profileId = profile?.id;
    useEffect(() => {
        if (!profileId) return;
        return subscribeDoc<AppUser>('users', profileId, (doc) => {
            if (doc) setProfile(doc);
        });
    }, [profileId]);

    // Server rejected the session (expired or revoked)
    useEffect(() => {
        const onExpired = () => {
            setToken(null);
            setProfile(null);
        };
        window.addEventListener('auth-expired', onExpired);
        return () => window.removeEventListener('auth-expired', onExpired);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.request<AuthResponse>('POST', '/api/auth/login', { email, password });
        setToken(res.token);
        setProfile(res.user);
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        const res = await api.request<AuthResponse>('POST', '/api/auth/register', { name, email, password });
        setToken(res.token);
        setProfile(res.user);
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.request('POST', '/api/auth/logout');
        } catch {
            // the session is discarded locally anyway
        }
        setToken(null);
        setProfile(null);
    }, []);

    const userEmail = profile?.email || '';
    const userName = profile?.name || userEmail || 'Usuario';
    const user = useMemo<SessionUser | null>(
        () => (profileId ? { uid: profileId, email: userEmail, displayName: userName } : null),
        [profileId, userEmail, userName]
    );

    const value = {
        user,
        profile,
        isAdmin: profile?.role === 'admin',
        loading,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">Cargando...</div>
            ) : children}
        </AuthContext.Provider>
    );
}
