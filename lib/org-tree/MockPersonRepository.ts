import { Person, PersonRepository } from './types';
import { seedPersons } from './mock-data';

// Module-level state so mutations persist within a session
let persons: Person[] = seedPersons.map(p => ({ ...p }));

export class MockPersonRepository implements PersonRepository {
  fetchAll(): Promise<Person[]> {
    return Promise.resolve([...persons]);
  }

  create(data: {
    fullName: string;
    title: string;
    squads?: string[];
    salary?: number;
    parentId?: string | null;
  }): Promise<Person> {
    const newPerson: Person = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: data.fullName,
      title: data.title,
      squads: data.squads ?? [],
      salary: data.salary ?? 0,
      parentId: data.parentId ?? null,
    };
    persons.push(newPerson);
    return Promise.resolve({ ...newPerson });
  }

  update(
    id: string,
    data: Partial<Pick<Person, 'fullName' | 'title' | 'squads' | 'salary' | 'parentId'>>
  ): Promise<Person> {
    const index = persons.findIndex(p => p.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Person with id "${id}" not found`));
    }
    persons[index] = { ...persons[index], ...data };
    return Promise.resolve({ ...persons[index] });
  }

  delete(id: string): Promise<void> {
    const index = persons.findIndex(p => p.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Person with id "${id}" not found`));
    }
    persons.splice(index, 1);
    return Promise.resolve();
  }
}

/** Reset the in-memory store to seed data (useful for tests) */
export function resetMockData(): void {
  persons = seedPersons.map(p => ({ ...p }));
}
