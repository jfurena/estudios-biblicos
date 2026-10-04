import crypto from 'node:crypto';
import { db, getDoc, newId, now, putDoc } from './db.js';

const SESSION_DAYS = 30;

export function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
    if (!stored) return false;
    const [salt, hash] = stored.split(':');
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}

export function createSession(accountId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    db.prepare('INSERT INTO sessions (token, account_id, expires_at) VALUES (?, ?, ?)').run(token, accountId, expires);
    return token;
}

export function deleteSession(token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/** Returns the user profile for a valid session token, or null. */
export function userFromToken(token) {
    if (!token) return null;
    const row = db.prepare('SELECT account_id, expires_at FROM sessions WHERE token = ?').get(token);
    if (!row) return null;
    if (row.expires_at < now()) {
        deleteSession(token);
        return null;
    }
    const account = db.prepare('SELECT id, email FROM accounts WHERE id = ?').get(row.account_id);
    if (!account) return null;
    return getDoc('users', account.id) || { id: account.id, email: account.email, name: account.email, role: 'user' };
}

export function findAccountByEmail(email) {
    return db.prepare('SELECT * FROM accounts WHERE email = ?').get(email.trim());
}

/**
 * Registers a new account. If the email belongs to an account imported from
 * Firebase (no password yet) the account is activated and keeps its data.
 */
export function registerAccount({ name, email, password }) {
    const existing = findAccountByEmail(email);
    if (existing && existing.password_hash) {
        const error = new Error('Ya existe una cuenta con este email.');
        error.status = 409;
        throw error;
    }

    if (existing) {
        db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(hashPassword(password), existing.id);
        const profile = getDoc('users', existing.id) || {};
        putDoc('users', existing.id, {
            role: 'user',
            createdAt: now(),
            ...profile,
            name: profile.name || name,
            email: existing.email,
        });
        return existing.id;
    }

    const id = newId();
    db.prepare('INSERT INTO accounts (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(id, email.trim(), hashPassword(password), now());
    putDoc('users', id, {
        name,
        email: email.trim(),
        username: '@' + name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000),
        role: 'user',
        createdAt: now(),
    });
    return id;
}

export function setPassword(accountId, password) {
    db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(hashPassword(password), accountId);
    db.prepare('DELETE FROM sessions WHERE account_id = ?').run(accountId);
}
