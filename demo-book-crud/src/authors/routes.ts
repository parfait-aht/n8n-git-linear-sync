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
