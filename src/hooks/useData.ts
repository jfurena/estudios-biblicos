import { useEffect, useMemo, useState } from 'react';
import { subscribe } from '../lib/api';
import { BIBLE_STUDIES } from '../lib/constants';
import type { AppUser, BibleStudy, Group, Person } from '../lib/types';
import { toMillis } from '../lib/utils';

/** Subscribes to a whole collection and keeps it updated live. */
function useCollection<T extends { id: string }>(name: string, sort?: (a: T, b: T) => number) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return subscribe<T>(
            name,
            undefined,
            (docs) => {
                setData(sort ? docs.sort(sort) : docs);
                setLoading(false);
            },
            (error) => {
                console.error(`Error loading ${name}:`, error);
                setLoading(false);
            }
        );
        // sort functions are module-level constants
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name]);

    return { data, loading };
}

const byName = (a: { name?: string }, b: { name?: string }) => (a.name || '').localeCompare(b.name || '', 'es');
const byNewest = (a: { createdAt?: Person['createdAt'] }, b: { createdAt?: Person['createdAt'] }) =>
    toMillis(b.createdAt) - toMillis(a.createdAt);

export function useUsers() {
    const { data, loading } = useCollection<AppUser>('users', byName);
    return { users: data, loading };
}

export function useGroups() {
    const { data, loading } = useCollection<Group>('groups', byName);
    return { groups: data, loading };
}

export function usePeople() {
    const { data, loading } = useCollection<Person>('people', byNewest);
    return { people: data, loading };
}

interface StoredStudy {
    id: string;
    name: string;
    owner?: string;
    createdAt?: Person['createdAt'];
}

/** Built-in studies plus the ones added from the "Guía de Estudios" page. */
export function useBibleStudies() {
    const { data, loading } = useCollection<StoredStudy>('bible_studies', byNewest);

    const studies = useMemo<BibleStudy[]>(() => {
        const builtIn = BIBLE_STUDIES.map(s => ({ id: `builtin-${s.id}`, name: s.name, owner: s.owner, custom: false }));
        const builtInNames = new Set(builtIn.map(s => s.name));
        const custom = data
            .filter(s => s.name && !builtInNames.has(s.name))
            .reverse()
            .map(s => ({ id: s.id, name: s.name, owner: s.owner || 'N/A', custom: true }));
        return [...builtIn, ...custom];
    }, [data]);

    return { studies, loading };
}
