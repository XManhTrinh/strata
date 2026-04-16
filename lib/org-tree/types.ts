export interface Person {
  id: string;
  fullName: string;
  title: string;
  squads: string[];
  salary: number;
  parentId: string | null;
  avatarUrl?: string;
}

export interface TreeNode {
  person: Person;
  children: TreeNode[];
  depth: number;
}

export interface PersonRepository {
  fetchAll(): Promise<Person[]>;
  create(data: { fullName: string; title: string; squads?: string[]; salary?: number; parentId?: string | null }): Promise<Person>;
  update(id: string, data: Partial<Pick<Person, 'fullName' | 'title' | 'squads' | 'salary' | 'parentId'>>): Promise<Person>;
  delete(id: string): Promise<void>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  chat(messages: ChatMessage[], context: { persons: Person[] }): Promise<string>;
}
