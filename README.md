# git → Linear, avec n8n en local

Un workflow n8n qui lit tes commits, retrouve le ticket Linear correspondant, le passe
en **In Progress** et y ajoute le détail du travail. Quand aucun ticket ne correspond,
Claude en propose un.

Conçu comme support de démonstration pour une équipe de développement et son chef de
projet — mais utilisable au quotidien.

```
$ git-sync
-> 2 commit(s) sur feat/ALO-42-relance-paiement (commits non pousses)
Ticket ALO-42 -> In Progress (2 commit(s))
https://linear.app/equipe/issue/ALO-42
```

---

## Ce que ça résout

Le board ne reflète jamais la réalité, parce que déplacer une carte n'apporte rien à
celui qui la déplace. Ici, le seul geste requis est celui que le dev fait déjà :
commiter.

---

## Architecture

```
$ git-sync                    script bash, sur ta machine
      │  branche, commits, fichiers modifies
      ▼
POST localhost:5678/webhook/git-sync
      │
   [n8n]  ── identifiant de ticket dans la branche ? ──┐
      │                                                 │
      ├─ oui ──────────────────────────────► ticket trouve
      └─ non ─► Claude lit les tickets ouverts
                     ├─ confiance ≥ 0.7 ───► ticket trouve
                     └─ sinon ─────────────► ticket cree
                                                 │
                              statut In Progress + commentaire
```

Tout est local : n8n tourne en Docker sur ta machine, le script appelle `localhost`.
Aucun port n'est exposé sur Internet, aucun tunnel n'est nécessaire.

---

## Démarrage

Suis les documents dans l'ordre :

| | Document | Durée |
|---|---|---|
| 1 | [Installation de n8n](docs/01-installation.md) | 10 min |
| 2 | [Identifiants Linear et Anthropic](docs/02-credentials.md) | 10 min |
| 3 | [Construire le workflow](docs/03-workflow.md) | 1 h 30 |
| 4 | [Le script `git-sync`](docs/04-script-git-sync.md) | 10 min |
| 5 | [Tests](docs/05-tests.md) | 30 min |
| 6 | [Dérouler la présentation](docs/06-demo.md) | — |
| 7 | [Passer sur un serveur](docs/07-vps.md) | plus tard |

---

## Contenu du dépôt

```
docker/docker-compose.yml     n8n + postgres
docker/.env.example           secrets a copier en .env
bin/git-sync                  le script CLI
workflows/git-linear-sync.json  export du workflow, en secours
docs/                         le pas-a-pas
```

---

## Prérequis

Docker, `jq`, un compte Linear, une clé API Anthropic.

---

## Licence et coûts

n8n est en *fair-code* (Sustainable Use License) : l'auto-hébergement est gratuit et
illimité pour un usage interne. La revente de n8n en tant que service est interdite.

L'appel à l'API Anthropic est facturé à l'usage, de l'ordre du centime par
rapprochement — et seulement quand la branche ne nomme pas déjà le ticket.
