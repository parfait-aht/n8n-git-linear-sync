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
