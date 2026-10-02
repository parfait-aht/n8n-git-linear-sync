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
