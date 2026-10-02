#!/bin/bash
# setup-demo-book-crud.sh — cree le CRUD de demonstration (Hono + TypeScript)
# pour les tickets PAR-5 (books), PAR-6 (authors), PAR-7 (reviews),
# PAR-8 (health) et PAR-9 (loans), avec de vrais tests d'acceptation
# (test.mjs) utilises par git-sync pour le passage en Done.
set -e

PROJECT="demo-book-crud"
rm -rf "$PROJECT/src"
mkdir -p "$PROJECT/src/books" "$PROJECT/src/authors" "$PROJECT/src/reviews" \
         "$PROJECT/src/health" "$PROJECT/src/loans"

cat > "$PROJECT/package.json" << ENDOFFILE_1
{
  "name": "demo-book-crud",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "CRUD de demonstration (Hono + TypeScript) pour git-sync -> Linear (tickets PAR-5 a PAR-9)",
  "main": "src/server.ts",
  "scripts": {
    "start": "tsx src/server.ts",
    "test": "tsx test.mjs",
    "test:authors": "tsx test.mjs authors",
    "test:books": "tsx test.mjs books",
    "test:reviews": "tsx test.mjs reviews",
    "test:health": "tsx test.mjs health",
    "test:loans": "tsx test.mjs loans"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@hono/node-server": "^1.13.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.7.0"
  }
}
ENDOFFILE_1

cat > "$PROJECT/tsconfig.json" << ENDOFFILE_2
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src", "test.mjs"]
}
ENDOFFILE_2

cat > "$PROJECT/.gitignore" << ENDOFFILE_3
node_modules
dist
ENDOFFILE_3

cat > "$PROJECT/README.md" << ENDOFFILE_4
# demo-book-crud

CRUD minimal en TypeScript avec Hono, servant de support a la demo
\`git-sync\` -> Linear :

- [PAR-5](https://linear.app/parfait-dev/issue/PAR-5/add-crud-endpoints-for-books) — livres
- [PAR-6](https://linear.app/parfait-dev/issue/PAR-6/add-crud-endpoints-for-authors) — auteurs
- [PAR-7](https://linear.app/parfait-dev/issue/PAR-7/add-crud-endpoints-for-book-reviews) — avis sur les livres
- [PAR-8](https://linear.app/parfait-dev/issue/PAR-8/add-health-check-endpoint) — health-check
- [PAR-9](https://linear.app/parfait-dev/issue/PAR-9/add-crud-endpoints-for-loans) — emprunts

Un livre reference son auteur via \`authorId\`, un avis et un emprunt
referencent leur livre via \`bookId\`. Stockage en memoire, aucune base de
donnees : le but est de produire de vrais commits a synchroniser, pas de
livrer un service de production.

## Lancer

\`\`\`bash
cd demo-book-crud
npm install
npm start
\`\`\`

## Tester

\`\`\`bash
npm test              # toutes les verifications
npm run test:authors
npm run test:books
npm run test:reviews
npm run test:health
npm run test:loans
\`\`\`

Chaque verification correspond a un critere d'acceptation d'un ticket. Le
resultat (pass/fail reel, pas une estimation) est imprime en une ligne JSON
sur stdout — c'est ce que \`git-sync\` lit via \`.n8ntest\` pour decider si un
ticket peut passer en Done (voir docs/04-script-git-sync.md).

## Endpoints

| Methode | Route | Description |
|---|---|---|
| GET | /health | verifie que l'API repond |
| POST | /authors | cree un auteur (name requis) |
| GET | /authors | liste les auteurs |
| GET | /authors/:id | un auteur, 404 si absent |
| PUT | /authors/:id | met a jour un auteur, 404 si absent |
| DELETE | /authors/:id | supprime un auteur, 404 si absent |
| POST | /books | cree un livre (title, authorId requis ; 400 si authorId inconnu) |
| GET | /books | liste les livres |
| GET | /books/:id | un livre, 404 si absent |
| PUT | /books/:id | met a jour un livre, 404 si absent |
| DELETE | /books/:id | supprime un livre, 404 si absent |
| POST | /reviews | cree un avis (bookId, rating 1-5 requis ; 400 si bookId inconnu ou rating invalide) |
| GET | /reviews | liste les avis |
| GET | /reviews/:id | un avis, 404 si absent |
| DELETE | /reviews/:id | supprime un avis, 404 si absent |
| POST | /loans | cree un emprunt (bookId, borrowerName requis ; 400 si bookId inconnu) |
| GET | /loans | liste les emprunts |
| GET | /loans/:id | un emprunt, 404 si absent |
| PUT | /loans/:id | marque l'emprunt comme rendu, 404 si absent |
| DELETE | /loans/:id | supprime un emprunt, 404 si absent |
ENDOFFILE_4

cat > "$PROJECT/src/authors/store.ts" << ENDOFFILE_5
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
ENDOFFILE_5

cat > "$PROJECT/src/authors/routes.ts" << ENDOFFILE_6
import { Hono } from 'hono';
import * as store from './store.js';

export const authors = new Hono();

authors.get('/', (c) => c.json(store.list()));

authors.post('/', async (c) => {
  const body = await c.req.json<{ name?: string; nationality?: string }>();
  if (!body.name) {
    return c.json({ error: 'name est requis' }, 400);
  }
  const author = store.create({ name: body.name, nationality: body.nationality });
  return c.json(author, 201);
});

authors.get('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const author = store.get(id);
  if (!author) return c.json({ error: 'Auteur introuvable' }, 404);
  return c.json(author);
});

authors.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const body = await c.req.json<{ name?: string; nationality?: string }>();
  const author = store.update(id, body);
  if (!author) return c.json({ error: 'Auteur introuvable' }, 404);
  return c.json(author);
});

authors.delete('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const removed = store.remove(id);
  if (!removed) return c.json({ error: 'Auteur introuvable' }, 404);
  return c.body(null, 204);
});
ENDOFFILE_6

cat > "$PROJECT/src/books/store.ts" << ENDOFFILE_7
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

export function exists(id: number): boolean {
  return books.some((book) => book.id === id);
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
ENDOFFILE_7

cat > "$PROJECT/src/books/routes.ts" << ENDOFFILE_8
import { Hono } from 'hono';
import * as store from './store.js';
import * as authors from '../authors/store.js';

export const books = new Hono();

books.get('/', (c) => c.json(store.list()));

books.post('/', async (c) => {
  const body = await c.req.json<{ title?: string; authorId?: number }>();
  if (!body.title || body.authorId === undefined) {
    return c.json({ error: 'title et authorId sont requis' }, 400);
  }
  if (!authors.exists(body.authorId)) {
    return c.json({ error: 'authorId invalide : auteur introuvable' }, 400);
  }
  const book = store.create({ title: body.title, authorId: body.authorId });
  return c.json(book, 201);
});

books.get('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const book = store.get(id);
  if (!book) return c.json({ error: 'Livre introuvable' }, 404);
  return c.json(book);
});

books.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const body = await c.req.json<{ title?: string; authorId?: number }>();
  if (body.authorId !== undefined && !authors.exists(body.authorId)) {
    return c.json({ error: 'authorId invalide : auteur introuvable' }, 400);
  }
  const book = store.update(id, body);
  if (!book) return c.json({ error: 'Livre introuvable' }, 404);
  return c.json(book);
});

books.delete('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const removed = store.remove(id);
  if (!removed) return c.json({ error: 'Livre introuvable' }, 404);
  return c.body(null, 204);
});
ENDOFFILE_8

cat > "$PROJECT/src/reviews/store.ts" << ENDOFFILE_9
export interface Review {
  id: number;
  bookId: number;
  rating: number;
  comment?: string;
}

type ReviewInput = { bookId: number; rating: number; comment?: string };

let reviews: Review[] = [];
let nextId = 1;

export function list(): Review[] {
  return reviews;
}

export function get(id: number): Review | undefined {
  return reviews.find((review) => review.id === id);
}

export function create({ bookId, rating, comment }: ReviewInput): Review {
  const review: Review = { id: nextId++, bookId, rating, comment };
  reviews.push(review);
  return review;
}

export function remove(id: number): boolean {
  const index = reviews.findIndex((review) => review.id === id);
  if (index === -1) return false;
  reviews.splice(index, 1);
  return true;
}
ENDOFFILE_9

cat > "$PROJECT/src/reviews/routes.ts" << ENDOFFILE_10
import { Hono } from 'hono';
import * as store from './store.js';
import * as books from '../books/store.js';

export const reviews = new Hono();

reviews.get('/', (c) => c.json(store.list()));

reviews.post('/', async (c) => {
  const body = await c.req.json<{ bookId?: number; rating?: number; comment?: string }>();
  if (body.bookId === undefined || body.rating === undefined) {
    return c.json({ error: 'bookId et rating sont requis' }, 400);
  }
  if (!books.exists(body.bookId)) {
    return c.json({ error: 'bookId invalide : livre introuvable' }, 400);
  }
  if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
    return c.json({ error: 'rating doit etre un nombre entre 1 et 5' }, 400);
  }
  const review = store.create({ bookId: body.bookId, rating: body.rating, comment: body.comment });
  return c.json(review, 201);
});

reviews.get('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const review = store.get(id);
  if (!review) return c.json({ error: 'Avis introuvable' }, 404);
  return c.json(review);
});

reviews.delete('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const removed = store.remove(id);
  if (!removed) return c.json({ error: 'Avis introuvable' }, 404);
  return c.body(null, 204);
});
ENDOFFILE_10

cat > "$PROJECT/src/health/routes.ts" << ENDOFFILE_11
import { Hono } from 'hono';

export const health = new Hono();

health.get('/', (c) => c.json({ status: 'ok' }));
ENDOFFILE_11

cat > "$PROJECT/src/loans/store.ts" << ENDOFFILE_12
export interface Loan {
  id: number;
  bookId: number;
  borrowerName: string;
  returnedAt: string | null;
}

type LoanInput = { bookId: number; borrowerName: string };

let loans: Loan[] = [];
let nextId = 1;

export function list(): Loan[] {
  return loans;
}

export function get(id: number): Loan | undefined {
  return loans.find((loan) => loan.id === id);
}

export function create({ bookId, borrowerName }: LoanInput): Loan {
  const loan: Loan = { id: nextId++, bookId, borrowerName, returnedAt: null };
  loans.push(loan);
  return loan;
}

export function markReturned(id: number, returnedAt: string): Loan | null {
  const loan = get(id);
  if (!loan) return null;
  loan.returnedAt = returnedAt;
  return loan;
}

export function remove(id: number): boolean {
  const index = loans.findIndex((loan) => loan.id === id);
  if (index === -1) return false;
  loans.splice(index, 1);
  return true;
}
ENDOFFILE_12

cat > "$PROJECT/src/loans/routes.ts" << ENDOFFILE_13
import { Hono } from 'hono';
import * as store from './store.js';
import * as books from '../books/store.js';

export const loans = new Hono();

loans.get('/', (c) => c.json(store.list()));

loans.post('/', async (c) => {
  const body = await c.req.json<{ bookId?: number; borrowerName?: string }>();
  if (body.bookId === undefined || !body.borrowerName) {
    return c.json({ error: 'bookId et borrowerName sont requis' }, 400);
  }
  if (!books.exists(body.bookId)) {
    return c.json({ error: 'bookId invalide : livre introuvable' }, 400);
  }
  const loan = store.create({ bookId: body.bookId, borrowerName: body.borrowerName });
  return c.json(loan, 201);
});

loans.get('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const loan = store.get(id);
  if (!loan) return c.json({ error: 'Emprunt introuvable' }, 404);
  return c.json(loan);
});

loans.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const body = await c.req.json<{ returnedAt?: string }>();
  const loan = store.markReturned(id, body.returnedAt || new Date().toISOString());
  if (!loan) return c.json({ error: 'Emprunt introuvable' }, 404);
  return c.json(loan);
});

loans.delete('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'Identifiant invalide' }, 400);
  const removed = store.remove(id);
  if (!removed) return c.json({ error: 'Emprunt introuvable' }, 404);
  return c.body(null, 204);
});
ENDOFFILE_13

cat > "$PROJECT/src/app.ts" << ENDOFFILE_14
import { Hono } from 'hono';
import { books } from './books/routes.js';
import { authors } from './authors/routes.js';
import { reviews } from './reviews/routes.js';
import { health } from './health/routes.js';
import { loans } from './loans/routes.js';

export const app = new Hono();
app.route('/books', books);
app.route('/authors', authors);
app.route('/reviews', reviews);
app.route('/health', health);
app.route('/loans', loans);
ENDOFFILE_14

cat > "$PROJECT/src/server.ts" << ENDOFFILE_15
import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(\`book-crud en ecoute sur http://localhost:\${info.port}\`);
});
ENDOFFILE_15

cat > "$PROJECT/test.mjs" << 'ENDOFFILE_16'
// test.mjs — verifications reelles contre l'API (pas une estimation).
// Chaque check correspond a un critere d'acceptation d'un ticket (PAR-5 a
// PAR-9). Resultat final : UNE ligne JSON sur stdout, lue par bin/git-sync
// via .n8ntest. Les logs humains partent sur stderr.
import assert from 'node:assert/strict';
import { app } from './src/app.ts';

const suite = process.argv[2] || 'all';
const results = [];

async function check(name, group, fn) {
  if (suite !== 'all' && suite !== group) return;
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, error: String(error && error.message || error) });
  }
}

async function req(method, path, body) {
  const init = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await app.request(path, init);
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

// --- Health (PAR-8) ----------------------------------------------------------

await check('GET /health renvoie 200 avec status ok', 'health', async () => {
  const res = await req('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'ok');
});

// --- Authors (PAR-6) -------------------------------------------------------

let authorId;

await check('POST /authors cree un auteur et renvoie 201', 'authors', async () => {
  const res = await req('POST', '/authors', { name: 'Frank Herbert', nationality: 'US' });
  assert.equal(res.status, 201);
  assert.equal(res.json.name, 'Frank Herbert');
  authorId = res.json.id;
});

await check('POST /authors renvoie 400 si name manquant', 'authors', async () => {
  const res = await req('POST', '/authors', { nationality: 'US' });
  assert.equal(res.status, 400);
});

await check('GET /authors renvoie la liste des auteurs', 'authors', async () => {
  const res = await req('GET', '/authors');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json));
  assert.ok(res.json.some((a) => a.id === authorId));
});

await check('GET /authors/:id renvoie 404 si absent', 'authors', async () => {
  const res = await req('GET', '/authors/999999');
  assert.equal(res.status, 404);
});

await check('PUT /authors/:id met a jour un auteur', 'authors', async () => {
  const res = await req('PUT', `/authors/${authorId}`, { nationality: 'FR' });
  assert.equal(res.status, 200);
  assert.equal(res.json.nationality, 'FR');
});

await check('PUT /authors/:id renvoie 404 si absent', 'authors', async () => {
  const res = await req('PUT', '/authors/999999', { name: 'x' });
  assert.equal(res.status, 404);
});

await check('DELETE /authors/:id supprime un auteur', 'authors', async () => {
  const created = await req('POST', '/authors', { name: 'A supprimer' });
  const res = await req('DELETE', `/authors/${created.json.id}`);
  assert.equal(res.status, 204);
});

await check('DELETE /authors/:id renvoie 404 si absent', 'authors', async () => {
  const res = await req('DELETE', '/authors/999999');
  assert.equal(res.status, 404);
});

// --- Books (PAR-5) ----------------------------------------------------------

await check('POST /books cree un livre avec authorId valide', 'books', async () => {
  const author = await req('POST', '/authors', { name: 'Author Books' });
  const res = await req('POST', '/books', { title: 'Dune', authorId: author.json.id });
  assert.equal(res.status, 201);
  assert.equal(res.json.title, 'Dune');
});

await check('POST /books renvoie 400 si authorId inconnu', 'books', async () => {
  const res = await req('POST', '/books', { title: 'Fake', authorId: 999999 });
  assert.equal(res.status, 400);
});

await check('GET /books renvoie la liste des livres', 'books', async () => {
  const res = await req('GET', '/books');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json));
});

await check('GET /books/:id renvoie 404 si absent', 'books', async () => {
  const res = await req('GET', '/books/999999');
  assert.equal(res.status, 404);
});

await check('PUT /books/:id met a jour un livre', 'books', async () => {
  const author = await req('POST', '/authors', { name: 'Author Update' });
  const book = await req('POST', '/books', { title: 'Temp', authorId: author.json.id });
  const res = await req('PUT', `/books/${book.json.id}`, { title: 'Temp 2' });
  assert.equal(res.status, 200);
  assert.equal(res.json.title, 'Temp 2');
});

await check('DELETE /books/:id supprime un livre', 'books', async () => {
  const author = await req('POST', '/authors', { name: 'Author Delete' });
  const book = await req('POST', '/books', { title: 'A supprimer', authorId: author.json.id });
  const res = await req('DELETE', `/books/${book.json.id}`);
  assert.equal(res.status, 204);
});

// --- Reviews (PAR-7) ---------------------------------------------------------

await check('POST /reviews cree un avis et renvoie 201', 'reviews', async () => {
  const author = await req('POST', '/authors', { name: 'Author Reviews' });
  const book = await req('POST', '/books', { title: 'Livre Avis', authorId: author.json.id });
  const res = await req('POST', '/reviews', { bookId: book.json.id, rating: 5, comment: 'Super' });
  assert.equal(res.status, 201);
  assert.equal(res.json.rating, 5);
});

await check('POST /reviews renvoie 400 si bookId inconnu', 'reviews', async () => {
  const res = await req('POST', '/reviews', { bookId: 999999, rating: 4 });
  assert.equal(res.status, 400);
});

await check('POST /reviews renvoie 400 si rating hors intervalle', 'reviews', async () => {
  const author = await req('POST', '/authors', { name: 'Author Reviews 2' });
  const book = await req('POST', '/books', { title: 'Livre Avis 2', authorId: author.json.id });
  const res = await req('POST', '/reviews', { bookId: book.json.id, rating: 9 });
  assert.equal(res.status, 400);
});

await check('GET /reviews renvoie la liste des avis', 'reviews', async () => {
  const res = await req('GET', '/reviews');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json));
});

await check('GET /reviews/:id renvoie 404 si absent', 'reviews', async () => {
  const res = await req('GET', '/reviews/999999');
  assert.equal(res.status, 404);
});

await check('DELETE /reviews/:id supprime un avis', 'reviews', async () => {
  const author = await req('POST', '/authors', { name: 'Author Reviews 3' });
  const book = await req('POST', '/books', { title: 'Livre Avis 3', authorId: author.json.id });
  const created = await req('POST', '/reviews', { bookId: book.json.id, rating: 3 });
  const res = await req('DELETE', `/reviews/${created.json.id}`);
  assert.equal(res.status, 204);
});

// --- Loans (PAR-9) ------------------------------------------------------------

await check('POST /loans cree un emprunt et renvoie 201', 'loans', async () => {
  const author = await req('POST', '/authors', { name: 'Author Loans' });
  const book = await req('POST', '/books', { title: 'Livre Emprunt', authorId: author.json.id });
  const res = await req('POST', '/loans', { bookId: book.json.id, borrowerName: 'Alice' });
  assert.equal(res.status, 201);
  assert.equal(res.json.borrowerName, 'Alice');
});

await check('POST /loans renvoie 400 si bookId inconnu', 'loans', async () => {
  const res = await req('POST', '/loans', { bookId: 999999, borrowerName: 'Bob' });
  assert.equal(res.status, 400);
});

await check('GET /loans renvoie la liste des emprunts', 'loans', async () => {
  const res = await req('GET', '/loans');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json));
});

await check('GET /loans/:id renvoie 404 si absent', 'loans', async () => {
  const res = await req('GET', '/loans/999999');
  assert.equal(res.status, 404);
});

await check('PUT /loans/:id marque l\'emprunt comme rendu', 'loans', async () => {
  const author = await req('POST', '/authors', { name: 'Author Loans 2' });
  const book = await req('POST', '/books', { title: 'Livre Emprunt 2', authorId: author.json.id });
  const loan = await req('POST', '/loans', { bookId: book.json.id, borrowerName: 'Chloe' });
  const res = await req('PUT', `/loans/${loan.json.id}`, {});
  assert.equal(res.status, 200);
  assert.ok(res.json.returnedAt);
});

await check('DELETE /loans/:id supprime un emprunt', 'loans', async () => {
  const author = await req('POST', '/authors', { name: 'Author Loans 3' });
  const book = await req('POST', '/books', { title: 'Livre Emprunt 3', authorId: author.json.id });
  const loan = await req('POST', '/loans', { bookId: book.json.id, borrowerName: 'Dan' });
  const res = await req('DELETE', `/loans/${loan.json.id}`);
  assert.equal(res.status, 204);
});

const allPassed = results.length > 0 && results.every((r) => r.passed);

for (const r of results) {
  console.error((r.passed ? 'PASS' : 'FAIL') + ' - ' + r.name + (r.error ? ' : ' + r.error : ''));
}

console.log(JSON.stringify({ allPassed, results }));

process.exit(allPassed ? 0 : 1);
ENDOFFILE_16

# Cle d'equipe Linear pour git-sync, a la racine du depot (equipe PAR).
echo "PAR" > .n8nsync

cd "$PROJECT" && npm install

echo "Termine ! Lance : cd demo-book-crud && npm start   (ou npm test)"
