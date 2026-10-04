const TOKEN_KEY = 'bt_session';

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export function getToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setToken(token: string | null) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        // storage unavailable (private mode): session lasts only for this tab
    }
    // Reconnect live updates with the new credentials
    closeRealtime();
    if (token && listeners.size) ensureSource();
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const token = getToken();
    const res = await fetch(url, {
        method,
        headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 401 && token) {
            window.dispatchEvent(new Event('auth-expired'));
        }
        throw new ApiError(res.status, data?.error || 'Error de conexión con el servidor.');
    }
    return data as T;
}

type Filters = Record<string, string>;
const query = (filters?: Filters) => (filters && Object.keys(filters).length ? '?' + new URLSearchParams(filters).toString() : '');

export const api = {
    request,
    list: <T>(collection: string, filters?: Filters) => request<T[]>('GET', `/api/${collection}${query(filters)}`),
    get: <T>(collection: string, id: string) => request<T>('GET', `/api/${collection}/${id}`),
    create: <T = { id: string }>(collection: string, data: object) => request<T>('POST', `/api/${collection}`, data),
    createMany: (collection: string, data: object[]) => request<{ id: string }[]>('POST', `/api/${collection}`, data),
    /** Creates the document with this id or merges into it. */
    put: <T = { id: string }>(collection: string, id: string, data: object) => request<T>('PUT', `/api/${collection}/${id}`, data),
    /** Merges fields. Use $addToSet / $pull for array membership. */
    update: <T = { id: string }>(collection: string, id: string, data: object) => request<T>('PATCH', `/api/${collection}/${id}`, data),
    remove: (collection: string, id: string) => request<{ ok: boolean }>('DELETE', `/api/${collection}/${id}`),
};

// ---------- Live updates ----------

const listeners = new Map<string, Set<() => void>>();
let source: EventSource | null = null;

function notifyAll() {
    listeners.forEach(set => set.forEach(fn => fn()));
}

function ensureSource() {
    const token = getToken();
    if (source || !token) return;
    source = new EventSource(`/api/live?token=${encodeURIComponent(token)}`);
    let hadError = false;
    source.onmessage = (event) => {
        try {
            const { collection } = JSON.parse(event.data);
            listeners.get(collection)?.forEach(fn => fn());
        } catch {
            // ignore malformed events
        }
    };
    source.onopen = () => {
        // After a reconnect we may have missed changes: reload everything
        if (hadError) notifyAll();
        hadError = false;
    };
    source.onerror = () => {
        hadError = true;
    };
}

export function closeRealtime() {
    source?.close();
    source = null;
}

function listen(collection: string, fn: () => void) {
    ensureSource();
    if (!listeners.has(collection)) listeners.set(collection, new Set());
    listeners.get(collection)!.add(fn);
    return () => {
        listeners.get(collection)?.delete(fn);
    };
}

/** Loads now and reloads whenever the collection changes on the server. */
function live(collection: string, load: () => void) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
        clearTimeout(timer);
        timer = setTimeout(load, 80);
    };
    load();
    const stop = listen(collection, debounced);
    return () => {
        clearTimeout(timer);
        stop();
    };
}

export function subscribe<T>(
    collection: string,
    filters: Filters | undefined,
    onData: (docs: T[]) => void,
    onError?: (error: Error) => void,
) {
    let active = true;
    const stop = live(collection, () => {
        api.list<T>(collection, filters)
            .then(docs => { if (active) onData(docs); })
            .catch(error => {
                if (!active) return;
                if (onError) onError(error);
                else console.error(error);
            });
    });
    return () => {
        active = false;
        stop();
    };
}

/** Like subscribe, for a single document. Calls onData(null) when it doesn't exist. */
export function subscribeDoc<T>(
    collection: string,
    id: string,
    onData: (doc: T | null) => void,
    onError?: (error: Error) => void,
) {
    let active = true;
    const stop = live(collection, () => {
        api.get<T>(collection, id)
            .then(doc => { if (active) onData(doc); })
            .catch(error => {
                if (!active) return;
                if (error instanceof ApiError && error.status === 404) onData(null);
                else if (onError) onError(error);
                else console.error(error);
            });
    });
    return () => {
        active = false;
        stop();
    };
}
