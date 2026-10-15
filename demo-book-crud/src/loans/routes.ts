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
