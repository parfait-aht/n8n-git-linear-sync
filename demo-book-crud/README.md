# demo-book-crud

CRUD minimal en TypeScript avec Hono, servant de support a la demo
`git-sync` -> Linear :

- [PAR-5](https://linear.app/parfait-dev/issue/PAR-5/add-crud-endpoints-for-books) — livres
- [PAR-6](https://linear.app/parfait-dev/issue/PAR-6/add-crud-endpoints-for-authors) — auteurs
- [PAR-7](https://linear.app/parfait-dev/issue/PAR-7/add-crud-endpoints-for-book-reviews) — avis sur les livres
- [PAR-8](https://linear.app/parfait-dev/issue/PAR-8/add-health-check-endpoint) — health-check
- [PAR-9](https://linear.app/parfait-dev/issue/PAR-9/add-crud-endpoints-for-loans) — emprunts

Un livre reference son auteur via `authorId`, un avis et un emprunt
referencent leur livre via `bookId`. Stockage en memoire, aucune base de
donnees : le but est de produire de vrais commits a synchroniser, pas de
livrer un service de production.

## Lancer

```bash
cd demo-book-crud
npm install
npm start
```

## Tester

```bash
npm test              # toutes les verifications
npm run test:authors
npm run test:books
npm run test:reviews
npm run test:health
npm run test:loans
```

Chaque verification correspond a un critere d'acceptation d'un ticket. Le
resultat (pass/fail reel, pas une estimation) est imprime en une ligne JSON
sur stdout — c'est ce que `git-sync` lit via `.n8ntest` pour decider si un
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
