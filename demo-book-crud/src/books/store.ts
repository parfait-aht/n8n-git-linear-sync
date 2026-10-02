export interface Book {
  id: number;
  title: string;
  authorId: number;
}

type BookInput = { title: string; authorId: number };

let books: Book[] = [];
let nextId = 1;

export function list(): Book[] {
  return books;
}

export function get(id: number): Book | undefined {
  return books.find((book) => book.id === id);
}

export function create({ title, authorId }: BookInput): Book {
  const book: Book = { id: nextId++, title, authorId };
  books.push(book);
  return book;
}

export function update(id: number, changes: Partial<BookInput>): Book | null {
  const book = get(id);
  if (!book) return null;
  if (changes.title !== undefined) book.title = changes.title;
  if (changes.authorId !== undefined) book.authorId = changes.authorId;
  return book;
}

export function remove(id: number): boolean {
  const index = books.findIndex((book) => book.id === id);
  if (index === -1) return false;
  books.splice(index, 1);
  return true;
}
