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
