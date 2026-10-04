import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dbPath = process.env.DATABASE_PATH || path.resolve('data', 'app.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS docs (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, id)
    );
`);

export const newId = () => crypto.randomBytes(10).toString('hex');
export const now = () => new Date().toISOString();

const stmts = {
    list: db.prepare('SELECT id, data FROM docs WHERE collection = ?'),
    get: db.prepare('SELECT id, data FROM docs WHERE collection = ? AND id = ?'),
    upsert: db.prepare('INSERT INTO docs (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data'),
    remove: db.prepare('DELETE FROM docs WHERE collection = ? AND id = ?'),
};

const parse = (row) => (row ? { ...JSON.parse(row.data), id: row.id } : null);

export function listDocs(collection) {
    return stmts.list.all(collection).map(parse);
}

export function getDoc(collection, id) {
    return parse(stmts.get.get(collection, id));
}

export function putDoc(collection, id, data) {
    const { id: _ignored, ...rest } = data;
    void _ignored;
    stmts.upsert.run(collection, id, JSON.stringify(rest));
    return { ...rest, id };
}

export function deleteDoc(collection, id) {
    stmts.remove.run(collection, id);
}

export const transaction = (fn) => db.transaction(fn);
