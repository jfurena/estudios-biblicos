/**
 * Imports the JSON produced by scripts/export-firestore.mjs into SQLite.
 *
 *   npm run import-firebase -- firebase-export.json
 *
 * Document ids are kept, so all references (groups, people, chats...) stay valid.
 * Passwords cannot be exported from Firebase: imported accounts have none and
 * each person activates theirs by registering again with the same email.
 * Safe to run more than once (documents are overwritten, not duplicated).
 */
import fs from 'node:fs';
import { db, putDoc, transaction, now } from './db.js';

const file = process.argv[2];
if (!file) {
    console.error('Uso: npm run import-firebase -- firebase-export.json');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const COLLECTIONS = ['users', 'people', 'person_history', 'groups', 'events', 'announcements', 'bible_studies', 'chats', 'messages', 'audit_logs'];

const insertAccount = db.prepare(
    'INSERT INTO accounts (id, email, password_hash, created_at) VALUES (?, ?, NULL, ?) ON CONFLICT(id) DO NOTHING'
);
const emailTaken = db.prepare('SELECT id FROM accounts WHERE email = ? AND id <> ?');

transaction(() => {
    for (const name of COLLECTIONS) {
        const docs = data[name] || [];
        for (const doc of docs) {
            if (!doc.id) continue;
            const record = { ...doc };
            if (name === 'users') {
                if (!record.email) {
                    console.warn(`Usuario ${doc.id} sin email: se importa el perfil pero no podrá iniciar sesión.`);
                } else if (emailTaken.get(record.email, doc.id)) {
                    console.warn(`El email ${record.email} ya existe con otra cuenta: se omite.`);
                    continue;
                } else {
                    insertAccount.run(doc.id, record.email, record.createdAt || now());
                }
                record.role = record.role || 'user';
            }
            putDoc(name, doc.id, record);
        }
        console.log(`${name}: ${docs.length}`);
    }
})();

console.log('\nImportación completada. Los usuarios deben registrarse de nuevo con su mismo email para crear su contraseña.');
