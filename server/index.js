import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { deleteDoc, getDoc, listDocs, newId, now, putDoc, transaction } from './db.js';
import {
    createSession, deleteSession, findAccountByEmail, registerAccount, setPassword, userFromToken, verifyPassword,
} from './auth.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

const COLLECTIONS = new Set([
    'users', 'people', 'person_history', 'groups', 'events', 'announcements',
    'bible_studies', 'chats', 'messages', 'audit_logs',
]);

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const wrap = (fn) => (req, res) => {
    try {
        const result = fn(req, res);
        if (result !== undefined) res.json(result);
    } catch (error) {
        const status = error.status || 500;
        if (status === 500) console.error(error);
        res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : error.message });
    }
};

// ---------- Live updates (Server-Sent Events) ----------

const clients = new Set();

function broadcast(collection) {
    const payload = `data: ${JSON.stringify({ collection })}\n\n`;
    for (const client of clients) client.write(payload);
}

app.get('/api/live', (req, res) => {
    const user = userFromToken(String(req.query.token || ''));
    if (!user) return res.status(401).end();
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
        clearInterval(ping);
        clients.delete(res);
    });
});

// ---------- Auth ----------

function requireUser(req) {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const user = userFromToken(token);
    if (!user) throw new HttpError(401, 'Sesión no válida. Vuelve a iniciar sesión.');
    req.token = token;
    return user;
}

function requireAdmin(req) {
    const user = requireUser(req);
    if (user.role !== 'admin') throw new HttpError(403, 'Solo para administradores.');
    return user;
}

const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

app.post('/api/auth/register', wrap((req) => {
    const { name, email, password } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, 'El nombre es obligatorio.');
    if (!isEmail(email)) throw new HttpError(400, 'El email no es válido.');
    if (!password || String(password).length < 6) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres.');
    const id = registerAccount({ name: String(name).trim(), email: String(email), password: String(password) });
    broadcast('users');
    return { token: createSession(id), user: getDoc('users', id) };
}));

app.post('/api/auth/login', wrap((req) => {
    const { email, password } = req.body || {};
    const account = isEmail(email) ? findAccountByEmail(String(email)) : null;
    if (account && !account.password_hash) {
        throw new HttpError(401, 'Tu cuenta fue migrada. Regístrate con este mismo email para crear tu nueva contraseña.');
    }
    if (!account || !verifyPassword(String(password || ''), account.password_hash)) {
        throw new HttpError(401, 'Email o contraseña incorrectos.');
    }
    const token = createSession(account.id);
    return { token, user: userFromToken(token) };
}));

app.post('/api/auth/logout', wrap((req) => {
    requireUser(req);
    deleteSession(req.token);
    return { ok: true };
}));

app.get('/api/auth/me', wrap((req) => requireUser(req)));

app.post('/api/auth/password', wrap((req) => {
    const user = requireUser(req);
    const { currentPassword, newPassword } = req.body || {};
    const account = findAccountByEmail(user.email || '');
    if (!account || !verifyPassword(String(currentPassword || ''), account.password_hash)) {
        throw new HttpError(400, 'La contraseña actual no es correcta.');
    }
    if (!newPassword || String(newPassword).length < 6) throw new HttpError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
    setPassword(account.id, String(newPassword));
    return { token: createSession(account.id) };
}));

// First admin bootstrap: only allowed while there is no admin at all
app.post('/api/auth/claim-admin', wrap((req) => {
    const user = requireUser(req);
    if (listDocs('users').some(u => u.role === 'admin')) throw new HttpError(403, 'Ya existe un administrador.');
    putDoc('users', user.id, { ...user, role: 'admin' });
    broadcast('users');
    return { ok: true };
}));

// Admin sets a temporary password for a user (replaces e-mail password reset)
app.post('/api/admin/users/:id/password', wrap((req) => {
    requireAdmin(req);
    const { password } = req.body || {};
    if (!password || String(password).length < 6) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres.');
    const profile = getDoc('users', req.params.id);
    const account = profile?.email ? findAccountByEmail(profile.email) : null;
    if (!account) throw new HttpError(404, 'Usuario no encontrado.');
    setPassword(account.id, String(password));
    return { ok: true };
}));

// ---------- Access rules ----------

function chatOf(chatId) {
    return chatId ? getDoc('chats', chatId) : null;
}

function canRead(collection, doc, user) {
    switch (collection) {
        case 'chats': return doc.participantIds?.includes(user.id);
        case 'messages': return !!chatOf(doc.chatId)?.participantIds?.includes(user.id);
        case 'audit_logs': return user.role === 'admin';
        default: return true;
    }
}

/** Validates a write and returns the data to store (may be adjusted). */
function checkWrite(collection, action, before, after, user) {
    const isAdmin = user.role === 'admin';
    switch (collection) {
        case 'users':
            if (action !== 'update') throw new HttpError(403, 'Operación no permitida.');
            if (before.id !== user.id && !isAdmin) throw new HttpError(403, 'Solo puedes editar tu propio perfil.');
            if (!isAdmin) after.role = before.role;
            if (isAdmin && before.id === user.id && after.role !== 'admin' &&
                listDocs('users').filter(u => u.role === 'admin').length <= 1) {
                throw new HttpError(400, 'Eres el único administrador. Asigna otro antes de cambiar tu rol.');
            }
            after.email = before.email;
            return after;
        case 'chats':
            if (action === 'delete') throw new HttpError(403, 'Operación no permitida.');
            if (before && !before.participantIds?.includes(user.id)) throw new HttpError(403, 'No participas en este chat.');
            if (!after.participantIds?.includes(user.id)) throw new HttpError(400, 'Debes participar en el chat.');
            return after;
        case 'messages': {
            if (action !== 'create') throw new HttpError(403, 'Operación no permitida.');
            if (!chatOf(after.chatId)?.participantIds?.includes(user.id)) throw new HttpError(403, 'No participas en este chat.');
            return { ...after, senderId: user.id };
        }
        case 'audit_logs':
            if (action !== 'create') throw new HttpError(403, 'Operación no permitida.');
            return { action: String(after.action || ''), userId: user.id, userName: user.name || user.email };
        case 'person_history':
            if (action !== 'create') throw new HttpError(403, 'Operación no permitida.');
            return { ...after, userId: user.id, userName: user.name || user.email };
        case 'bible_studies':
            if (action === 'delete' && !isAdmin) throw new HttpError(403, 'Solo un administrador puede eliminar estudios.');
            return after;
        default:
            return after;
    }
}

function afterWrite(collection, action, doc) {
    broadcast(collection);
    if (collection === 'messages' && action === 'create') {
        const chat = chatOf(doc.chatId);
        if (chat) {
            putDoc('chats', chat.id, { ...chat, lastMessage: doc.text, lastMessageTime: doc.createdAt });
            broadcast('chats');
        }
    }
}

function collectionParam(req) {
    const { collection } = req.params;
    if (!COLLECTIONS.has(collection)) throw new HttpError(404, 'Colección desconocida.');
    return collection;
}

// ---------- Documents ----------

// GET /api/:collection?field=value  (equality filters; array fields match if they contain the value)
app.get('/api/:collection', wrap((req) => {
    const user = requireUser(req);
    const collection = collectionParam(req);
    const filters = Object.entries(req.query).map(([key, value]) => [key, String(value)]);
    return listDocs(collection).filter(doc => {
        if (!canRead(collection, doc, user)) return false;
        return filters.every(([key, value]) => {
            const field = doc[key];
            return Array.isArray(field) ? field.includes(value) : String(field ?? '') === value;
        });
    });
}));

app.get('/api/:collection/:id', wrap((req) => {
    const user = requireUser(req);
    const collection = collectionParam(req);
    const doc = getDoc(collection, req.params.id);
    if (!doc || !canRead(collection, doc, user)) throw new HttpError(404, 'No encontrado.');
    return doc;
}));

app.post('/api/:collection', wrap((req) => {
    const user = requireUser(req);
    const collection = collectionParam(req);
    const incoming = Array.isArray(req.body) ? req.body : [req.body];
    const created = transaction(() => incoming.map(item => {
        const timestamp = now();
        const data = checkWrite(collection, 'create', null, { ...item, createdAt: timestamp }, user);
        const doc = putDoc(collection, newId(), { ...data, createdAt: timestamp });
        return doc;
    }))();
    created.forEach(doc => afterWrite(collection, 'create', doc));
    return Array.isArray(req.body) ? created : created[0];
}));

// PUT creates or merges a document with a known id
app.put('/api/:collection/:id', wrap((req) => {
    const user = requireUser(req);
    const collection = collectionParam(req);
    const before = getDoc(collection, req.params.id);
    const timestamp = now();
    const merged = before
        ? { ...before, ...req.body, updatedAt: timestamp }
        : { ...req.body, createdAt: timestamp };
    const data = checkWrite(collection, before ? 'update' : 'create', before, merged, user);
    const doc = putDoc(collection, req.params.id, data);
    afterWrite(collection, before ? 'update' : 'create', doc);
    return doc;
}));

// PATCH merges fields. Special keys: $addToSet / $pull { field: value }
app.patch('/api/:collection/:id', wrap((req) => {
    const user = requireUser(req);
    const collection = collectionParam(req);
    const before = getDoc(collection, req.params.id);
    if (!before || !canRead(collection, before, user)) throw new HttpError(404, 'No encontrado.');

    const { $addToSet, $pull, ...fields } = req.body || {};
    const merged = { ...before, ...fields, updatedAt: now() };
    for (const [field, value] of Object.entries($addToSet || {})) {
        const list = Array.isArray(merged[field]) ? merged[field] : [];
        merged[field] = list.includes(value) ? list : [...list, value];
    }
    for (const [field, value] of Object.entries($pull || {})) {
        merged[field] = (Array.isArray(merged[field]) ? merged[field] : []).filter(v => v !== value);
    }

    const data = checkWrite(collection, 'update', before, merged, user);
    const doc = putDoc(collection, before.id, data);
    afterWrite(collection, 'update', doc);
    return doc;
}));

app.delete('/api/:collection/:id', wrap((req) => {
    const user = requireUser(req);
    const collection = collectionParam(req);
    const before = getDoc(collection, req.params.id);
    if (!before || !canRead(collection, before, user)) throw new HttpError(404, 'No encontrado.');
    checkWrite(collection, 'delete', before, null, user);

    transaction(() => {
        deleteDoc(collection, before.id);
        if (collection === 'people') {
            listDocs('person_history').filter(h => h.personId === before.id).forEach(h => deleteDoc('person_history', h.id));
        }
        if (collection === 'groups') {
            listDocs('people').filter(p => p.group === before.id).forEach(p => putDoc('people', p.id, { ...p, group: '' }));
            listDocs('announcements').filter(a => a.groupId === before.id).forEach(a => deleteDoc('announcements', a.id));
        }
    })();

    afterWrite(collection, 'delete', before);
    if (collection === 'people') broadcast('person_history');
    if (collection === 'groups') { broadcast('people'); broadcast('announcements'); }
    return { ok: true };
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ---------- Frontend (production build) ----------

const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/.*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
