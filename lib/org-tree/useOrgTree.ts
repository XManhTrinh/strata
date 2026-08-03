'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Person, PersonRepository } from './types';

interface UseOrgTreeReturn {
  persons: Person[];
  unallocated: Person[];
  loading: boolean;
  error: string | null;
  reparent(draggedId: string, newParentId: string | null, moveWithChildren?: boolean, childrenNewParentId?: string): Promise<void>;
  editPerson(id: string, data: Partial<Pick<Person, 'fullName' | 'title' | 'squads' | 'salary'>>): Promise<void>;
  createPerson(data: { fullName: string; title: string; squads?: string[]; salary?: number; parentId?: string | null }): Promise<void>;
  deletePerson(id: string): Promise<void>;
}

export function useOrgTree(repository: PersonRepository): UseOrgTreeReturn {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    repository.fetchAll().then(
      (data) => {
        if (!cancelled) {
          setPersons(data);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load persons');
          setLoading(false);
        }
      }
    );
    return () => { cancelled = true; };
  }, [repository]);

  // Only compute unallocated (persons with no parent and no children) — cheap O(n) scan
  const unallocated = useMemo(() => {
    const hasChildren = new Set<string>();
    for (const p of persons) {
      if (p.parentId) hasChildren.add(p.parentId);
    }
    return persons.filter(p => p.parentId === null && !hasChildren.has(p.id));
  }, [persons]);

  const reparent = useCallback(async (draggedId: string, newParentId: string | null, moveWithChildren = true, childrenNewParentId?: string) => {
    const previous = persons;
    const dragged = persons.find(p => p.id === draggedId);
    if (!dragged) return;

    const childUpdates = !moveWithChildren
      ? persons.filter(p => p.parentId === draggedId).map(p => ({ id: p.id, parentId: childrenNewParentId ?? dragged.parentId }))
      : [];

    setPersons(prev => prev.map(p => {
      if (p.id === draggedId) return { ...p, parentId: newParentId };
      const childUpdate = childUpdates.find(c => c.id === p.id);
      if (childUpdate) return { ...p, parentId: childUpdate.parentId };
      return p;
    }));
    setError(null);
    try {
      await Promise.all([
        repository.update(draggedId, { parentId: newParentId }),
        ...childUpdates.map(c => repository.update(c.id, { parentId: c.parentId })),
      ]);
    } catch (err) {
      setPersons(previous);
      setError(err instanceof Error ? err.message : 'Failed to reparent person');
    }
  }, [persons, repository]);

  const editPerson = useCallback(async (
    id: string,
    data: Partial<Pick<Person, 'fullName' | 'title' | 'squads' | 'salary'>>
  ) => {
    setError(null);
    try {
      const updated = await repository.update(id, data);
      setPersons(prev => prev.map(p => p.id === id ? updated : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update person');
      throw err;
    }
  }, [repository]);

  const createPerson = useCallback(async (data: {
    fullName: string;
    title: string;
    squads?: string[];
    salary?: number;
    parentId?: string | null;
  }) => {
    setError(null);
    try {
      const created = await repository.create(data);
      setPersons(prev => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person');
      throw err;
    }
  }, [repository]);

  const deletePerson = useCallback(async (id: string) => {
    setError(null);
    try {
      await repository.delete(id);
      setPersons(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete person');
      throw err;
    }
  }, [repository]);

  return { persons, unallocated, loading, error, reparent, editPerson, createPerson, deletePerson };
}
