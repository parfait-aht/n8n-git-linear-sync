export interface Author {
  id: number;
  name: string;
  nationality?: string;
}

type AuthorInput = { name: string; nationality?: string };

let authors: Author[] = [];
let nextId = 1;

export function list(): Author[] {
  return authors;
}

export function get(id: number): Author | undefined {
  return authors.find((author) => author.id === id);
}

export function exists(id: number): boolean {
  return authors.some((author) => author.id === id);
}

export function create({ name, nationality }: AuthorInput): Author {
  const author: Author = { id: nextId++, name, nationality };
  authors.push(author);
  return author;
}

export function update(id: number, changes: Partial<AuthorInput>): Author | null {
  const author = get(id);
  if (!author) return null;
  if (changes.name !== undefined) author.name = changes.name;
  if (changes.nationality !== undefined) author.nationality = changes.nationality;
  return author;
}

export function remove(id: number): boolean {
  const index = authors.findIndex((author) => author.id === id);
  if (index === -1) return false;
  authors.splice(index, 1);
  return true;
}
