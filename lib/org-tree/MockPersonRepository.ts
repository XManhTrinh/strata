import { Person, PersonRepository } from './types';

let persons: Person[] | null = null;

function getPersons(): Person[] {
  if (!persons) {
    // Lazy import to avoid blocking module load
    const { seedPersons } = require('./mock-data');
    persons = seedPersons;
  }
  return persons!;
}

export class MockPersonRepository implements PersonRepository {
  fetchAll(): Promise<Person[]> {
    return Promise.resolve(getPersons());
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
    getPersons().push(newPerson);
    return Promise.resolve({ ...newPerson });
  }

  update(
    id: string,
    data: Partial<Pick<Person, 'fullName' | 'title' | 'squads' | 'salary' | 'parentId'>>
  ): Promise<Person> {
    const all = getPersons();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Person with id "${id}" not found`));
    }
    all[index] = { ...all[index], ...data };
    return Promise.resolve({ ...all[index] });
  }

  delete(id: string): Promise<void> {
    const all = getPersons();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Person with id "${id}" not found`));
    }
    all.splice(index, 1);
    return Promise.resolve();
  }
}

export function resetMockData(): void {
  persons = null;
}
