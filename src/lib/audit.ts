import { api } from './api';

/** Records an action in the audit log. Never throws: logging must not break the main action. */
export async function logAudit(action: string) {
    try {
        await api.create('audit_logs', { action });
    } catch (error) {
        console.error('Error writing audit log:', error);
    }
}

/** Adds an entry to a person's history. */
export async function addPersonHistory(personId: string, type: string, text: string, userName?: string) {
    try {
        await api.create('person_history', { personId, type, text, userName });
    } catch (error) {
        console.error('Error writing person history:', error);
    }
}
