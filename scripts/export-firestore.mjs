/**
 * Exports all data from the old Firebase project to a JSON file that
 * `npm run import-firebase` can load into the new SQLite database.
 *
 * One-time use. firebase-admin is NOT a dependency of the app:
 *
 *   npm install --no-save firebase-admin
 *   node scripts/export-firestore.mjs ruta/a/service-account.json firebase-export.json
 *
 * The service account key is downloaded from Firebase Console >
 * Project settings > Service accounts > Generate new private key.
 * Never commit that file.
 */
import fs from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const [serviceAccountPath, outPath = 'firebase-export.json'] = process.argv.slice(2);
if (!serviceAccountPath) {
    console.error('Uso: node scripts/export-firestore.mjs <service-account.json> [salida.json]');
    process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))) });
const db = getFirestore();

/** Converts Firestore Timestamps (and nested values) to plain JSON. */
function plain(value) {
    if (value === null || value === undefined) return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(plain);
    if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
    return value;
}

async function exportCollection(name) {
    const snap = await db.collection(name).get();
    return snap.docs.map(d => ({ id: d.id, ...plain(d.data()) }));
}

const output = {};
for (const name of ['users', 'people', 'groups', 'events', 'announcements', 'bible_studies', 'chats', 'audit_logs']) {
    output[name] = await exportCollection(name);
    console.log(`${name}: ${output[name].length}`);
}

// Subcollections become flat collections with a reference to their parent
output.person_history = [];
for (const person of output.people) {
    const snap = await db.collection('people').doc(person.id).collection('history').get();
    snap.docs.forEach(d => output.person_history.push({ id: d.id, personId: person.id, ...plain(d.data()) }));
}
console.log(`person_history: ${output.person_history.length}`);

output.messages = [];
for (const chat of output.chats) {
    const snap = await db.collection('chats').doc(chat.id).collection('messages').get();
    snap.docs.forEach(d => output.messages.push({ id: d.id, chatId: chat.id, ...plain(d.data()) }));
}
console.log(`messages: ${output.messages.length}`);

// Accounts that signed up but never got a profile document
let pageToken;
do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const account of page.users) {
        const existing = output.users.find(u => u.id === account.uid);
        if (existing) {
            existing.email = existing.email || account.email;
        } else if (account.email) {
            output.users.push({
                id: account.uid,
                name: account.displayName || account.email.split('@')[0],
                email: account.email,
                role: 'user',
                createdAt: account.metadata.creationTime ? new Date(account.metadata.creationTime).toISOString() : undefined,
            });
        }
    }
    pageToken = page.pageToken;
} while (pageToken);
console.log(`users (incl. Auth accounts): ${output.users.length}`);

fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nExportado a ${outPath}. Ahora ejecuta: npm run import-firebase -- ${outPath}`);
