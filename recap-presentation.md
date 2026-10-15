# Récap — git → Linear, avec n8n en local

Ce document accompagne la présentation (`presentation/n8n-git-linear.pptx` ou `.pdf`). Il reprend les notions abordées, explique comment tout installer, puis décrit la démo. Le détail pas à pas de chaque étape est dans le dossier `docs/` du dépôt.

---

## 1. Le problème et l'idée

Le board Linear ne reflète presque jamais la réalité. Un dev commence une tâche, le ticket ne bouge pas (ou n'existe pas encore), et le chef de projet n'a aucune visibilité sur ce qui avance.

Ce n'est pas un problème de discipline, c'est un problème d'incitation : celui qui déplace la carte n'en tire aucun bénéfice.

**L'idée** : le seul geste demandé au dev est celui qu'il fait déjà, commiter. Un workflow n8n lit ces commits, retrouve le ticket Linear correspondant et le met à jour.

```
$ git-sync
-> 2 commit(s) sur feat/PAR-5-books-crud (commits non pousses)
Ticket PAR-5 -> In Progress (2 commit(s))
https://linear.app/equipe/issue/PAR-5
```

---

## 2. Ce que fait le système

| Action du dev | Effet dans Linear |
|---|---|
| `git-sync` sur une branche dont le nom contient l'identifiant (`feat/PAR-5-...`) | Le ticket PAR-5 passe en **In Progress** et reçoit un commentaire listant les commits. Aucune IA n'intervient. |
| Plusieurs `git-sync` successifs sur le même ticket | Un nouveau commentaire s'ajoute à chaque fois. Le statut ne bouge pas : il ne change que si le dev le décide. |
| Un commit contenant `(closes-all)` | Les tests tournent en local. S'ils passent tous, le ticket passe en **Done** avec un récap des vérifications. Sinon il reste en In Progress. |
| Aucun identifiant de ticket dans la branche (chemin optionnel) | Claude lit les tickets ouverts et propose le plus proche. Au-dessus de 0,7 de confiance, le ticket est utilisé. Sinon un nouveau ticket est créé. |

Tout est réversible : le workflow ne fait que changer un statut et ajouter un commentaire, rien de destructif.

---

## 3. Les notions à connaître

### n8n et les workflows

n8n est un outil d'automatisation. Un **workflow** est une suite de **nœuds** reliés par des flèches, qui s'exécute automatiquement quand un événement le déclenche. Quatre types de nœuds suffisent à comprendre celui-ci :

| Type | Rôle | Exemple ici |
|---|---|---|
| Déclencheur | Démarre le workflow | Webhook `/webhook/git-sync` |
| Logique (IF) | Choisit un chemin | « Référence trouvée ? » |
| Code | Calcule, analyse | « Analyser le contexte » |
| Action | Appelle une API | Les requêtes vers Linear et Anthropic |

### Le webhook

Un webhook est une adresse HTTP qui attend qu'on lui envoie des données. Ici, le script `git-sync` envoie un POST à `http://localhost:5678/webhook/git-sync`. n8n reconnaît ce chemin grâce au nœud Webhook et lance une exécution du workflow avec les données reçues.

### Comment n8n est construit

Trois briques : le **moteur** qui exécute le workflow nœud par nœud, les **nœuds** qui font le travail, et le **serveur HTTP** qui reçoit les appels. Le workflow lui-même est un simple fichier JSON (un tableau `nodes` et un objet `connections`). Ce JSON est exactement ce que le moteur exécute, il n'y a pas de couche cachée. C'est aussi ce qui permet de le versionner dans git (`workflows/git-linear-sync.json`).

### Postgres

n8n stocke dans Postgres ses workflows, ses identifiants chiffrés et l'historique des exécutions. Le nom `postgres` utilisé par n8n pour s'y connecter est du DNS interne Docker standard, rien de magique. La démo `demo-book-crud` n'utilise pas ce Postgres, ses données sont en mémoire.

### Les états d'un nœud

- **Actif / Désactivé** : un choix de configuration.
- **Succès / Erreur / Non atteint** : le résultat d'une exécution.

L'onglet **Executions** est l'outil de diagnostic : on y voit chaque exécution et les données qui ont traversé chaque nœud.

### Le seuil de confiance

Quand Claude rapproche un commit d'un ticket, il renvoie un score entre 0 et 1. En dessous de 0,7, rien n'est modifié sur un ticket existant. Ce garde-fou évite qu'une mauvaise devinette touche le mauvais ticket.

### Le double verrou du passage en Done

Un ticket ne passe en Done que si **les deux** conditions sont réunies :
1. Le dev a écrit volontairement `closes-all` dans un message de commit.
2. Une vraie commande de test, exécutée en local par `git-sync`, renvoie un résultat où toutes les vérifications sont réussies.

n8n ne devine jamais : il lit un résultat pass/fail réel.

---

## 4. Le parcours complet, du terminal à Linear

1. **Dans le terminal**, le dev tape `git-sync` à la racine du projet.
2. **Le script lit l'état local** : la branche, les commits pas encore envoyés (via un marqueur dans `.git/n8n-last-sync`), les fichiers modifiés, et la clé d'équipe Linear (fichier `.n8nsync`).
3. **Si un commit contient `closes-all`**, le script exécute la commande de `.n8ntest` en local et récupère le résultat réel de chaque vérification.
4. **Il envoie le tout** dans un JSON, par POST, vers `localhost:5678/webhook/git-sync`.
5. **n8n déclenche le workflow.** Un nœud Code cherche un identifiant du type `PAR-5` dans la branche et les messages de commit.
6. **Ticket trouvé** : n8n interroge directement l'API GraphQL de Linear. **Ticket non trouvé** : le chemin optionnel passe par Claude (rapprochement ou création).
7. **Mise à jour de Linear** : passage en In Progress, puis commentaire listant les commits.
8. **Si `closes-all` et tests tous réussis**, une branche parallèle passe le ticket en Done, avec un commentaire récapitulatif des vérifications.
9. **Le script met à jour son marqueur** seulement si n8n a répondu 200. Un échec ne perd donc aucun commit, et un `git-sync` relancé ne crée pas de commentaire en double.

Point à connaître : le terminal affiche toujours « -> In Progress », même quand le ticket finit en Done juste après. La réponse HTTP part avant la fin de l'évaluation Done. Le vrai résultat est dans Linear.

### Architecture

```
git-sync (script bash, sur ta machine)
   │  branche, commits, fichiers modifiés (+ résultat des tests si closes-all)
   ▼
POST localhost:5678/webhook/git-sync   →   n8n (Docker + Postgres)
   │
   ├─ identifiant de ticket dans la branche ? ── oui ──► Linear (API GraphQL)
   └─ non ─► Claude (optionnel) ─────────────────────────► Linear
                                                            │
                              In Progress + commentaire  →  Done si closes-all + tests OK
```

- **Tout est local.** n8n tourne en Docker sur la machine, aucun port exposé sur Internet, aucun tunnel.
- **Les tests tournent avant l'envoi.** n8n ne lit jamais le code, seulement un résultat pass/fail.
- **Seuls deux appels sortent** de la machine : Linear et, en option, Anthropic. Claude ne voit que des noms de fichiers et des messages de commit.

### Les 21 nœuds du workflow

| Nœuds | Rôle |
|---|---|
| 1 à 3 | Webhook, analyse du contexte, test « référence trouvée ? » |
| 4 | Chemin direct : récupérer le ticket nommé dans la branche |
| 5 à 10 | Chemin IA (optionnel) : contexte de l'équipe, appel à Claude, décision, création de ticket si besoin |
| 11 | « Normaliser le ticket » : les deux chemins convergent ici |
| 12 à 14 | Passage en In Progress, ajout du commentaire |
| 15 | Réponse HTTP au script |
| 16 à 21 | Mécanisme Done : mot-clé, décision sur les tests réels, passage en Done, commentaire de récap |

Le détail de chaque nœud est dans `docs/03-workflow.md`.

---

## 5. Installation

Prérequis : Docker, `jq`, un compte Linear. Une clé API Anthropic est optionnelle : elle n'est nécessaire que pour le rapprochement automatique par IA. Le reste (In Progress, commentaires, Done via tests réels) fonctionne sans.

### Étape 1 — Installer n8n en local (10 min, `docs/01-installation.md`)

```bash
cd docker
cp .env.example .env

# génère les deux secrets, puis remplace les REMPLACE_MOI dans .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)"

docker compose up -d
docker compose ps        # n8n et postgres : running, postgres (healthy)
```

Ouvre <http://localhost:5678> et crée le compte propriétaire (local à ta machine, sans lien avec n8n Cloud).

> **La clé `N8N_ENCRYPTION_KEY` est le point critique.** n8n s'en sert pour chiffrer tes identifiants. Si tu la perds ou la modifies après le premier démarrage, ils deviennent illisibles, y compris dans une sauvegarde. Garde-la dans un gestionnaire de mots de passe. Le fichier `.env` n'est jamais versionné.

### Étape 2 — Créer les identifiants (10 min, `docs/02-credentials.md`)

**Linear** : Settings → Security & access → Personal API keys → New API key. Dans n8n : Credentials → Add credential → type **Linear API**, nom `Linear`, authentification `API Token`, puis **Test**.

**Anthropic (optionnel)** : crée une clé sur la console Anthropic. Dans n8n : Credentials → Add credential → **Header Auth**, nom `Anthropic`, Name `x-api-key`, Value = la clé `sk-ant-...`.

Note aussi la **clé d'équipe** Linear : c'est le préfixe de tes tickets (`PAR` dans `PAR-5`).

### Étape 3 — Mettre en place le workflow (`docs/03-workflow.md`)

Le plus rapide : importer `workflows/git-linear-sync.json` (menu `⋯` en haut à droite → Import from File), puis rattacher le credential Linear à chaque nœud Linear (pas de triangle rouge restant). Pour le construire à la main, compte 1 h 30 en suivant `docs/03-workflow.md`.

Active le workflow avec l'interrupteur **Active** en haut à droite.

### Étape 4 — Installer le script `git-sync` (10 min, `docs/04-script-git-sync.md`)

```bash
ln -sf <chemin-du-depot>/bin/git-sync /usr/local/bin/git-sync
# Mac Apple Silicon, si /usr/local/bin n'est pas dans le PATH :
# ln -sf <chemin-du-depot>/bin/git-sync /opt/homebrew/bin/git-sync

which git-sync && git-sync --help
```

Dans le dépôt de ton projet, indique la clé d'équipe :

```bash
echo "PAR" > .n8nsync
```

Options utiles :

| Commande | Effet |
|---|---|
| `git-sync` | Usage normal |
| `git-sync --dry-run` | Affiche ce qui serait envoyé, sans appeler n8n |
| `git-sync --all` | Ignore le marqueur et renvoie toute la branche |
| `git-sync --team WEB` | Force la clé d'équipe |

### Étape 5 — Activer le passage en Done (optionnel)

Crée un fichier `.n8ntest` à la racine du projet, avec une seule ligne : la commande de test à exécuter.

```bash
echo "cd demo-book-crud && npm test" > .n8ntest
```

Cette commande doit afficher, sur la dernière ligne de sa sortie standard, un JSON de la forme :

```json
{"allPassed": true, "results": [{"name": "...", "passed": true}]}
```

### Étape 6 — Valider (30 min, `docs/05-tests.md`)

Cinq scénarios à passer avant de présenter : ticket nommé dans la branche, rapprochement par IA, création de ticket, idempotence (relancer `git-sync` ne renvoie rien), passage en Done. Le document contient aussi un tableau de diagnostic des erreurs fréquentes.

### Commandes Docker utiles

| Besoin | Commande (depuis `docker/`) |
|---|---|
| Démarrer / arrêter | `docker compose up -d` / `docker compose stop` |
| Voir les logs | `docker compose logs -f n8n` |
| Mettre à jour n8n | `docker compose pull && docker compose up -d` |
| Sauvegarder la base | `docker compose exec postgres pg_dump -U n8n n8n > ~/n8n-backup.sql` |

`docker compose down` supprime les conteneurs mais pas les volumes, donc tes workflows survivent. `docker compose down -v` efface tout.

---

## 6. La démo

### Le projet de démonstration : `demo-book-crud`

Une petite API REST en TypeScript avec Hono, sans base de données (stockage en mémoire). Son but est de produire de vrais commits à synchroniser, pas de livrer un service de production. Chaque ressource correspond à un ticket Linear :

| Ticket | Ressource |
|---|---|
| PAR-5 | Livres (`/books`) |
| PAR-6 | Auteurs (`/authors`) |
| PAR-7 | Avis sur les livres (`/reviews`) |
| PAR-8 | Health-check (`/health`) |
| PAR-9 | Emprunts (`/loans`) |

```bash
cd demo-book-crud
npm install
npm start          # lance l'API
npm test           # toutes les vérifications
npm run test:books # une ressource à la fois (authors, reviews, health, loans)
```

Chaque test correspond à un critère d'acceptation d'un ticket. Le résultat réel (pass/fail) est imprimé en une ligne JSON : c'est ce que `git-sync` lit via `.n8ntest` pour décider du passage en Done.

### Préparation avant de démarrer

- `docker compose ps` : n8n et postgres tournent.
- Le workflow est Published dans n8n et tous les nœuds Linear ont leur credential.
- Les tickets de démo (par exemple PAR-8 et PAR-9) sont en **Backlog** dans Linear.
- Trois onglets ouverts : n8n, Linear (vue board), terminal.
- `unset N8N_WEBHOOK_URL`, pour repasser sur l'URL de production.
- `./setup-demo-book-crud.sh` lancé une fois à la racine du dépôt, juste avant de commencer : il recrée les fichiers de démo non committés.
- Les branches et commits de démo sont préparés à l'avance, rien n'est tapé en direct.

### Déroulé

**1. La douleur.** On ouvre le board Linear et on pose la question : « Ce board reflète-t-il ce sur quoi on travaille ? » On laisse le silence répondre. Le ticket ne bouge pas parce que déplacer une carte n'apporte rien à celui qui le fait.

**2. La promesse.** Le board se met à jour tout seul à partir de la seule chose qu'un dev fait toujours : commiter.

**3. Démo 1, le cas simple.** Branche avec l'identifiant dans son nom :

```bash
git log --oneline -3
git-sync
```

On rafraîchit Linear : le ticket est en In Progress, avec un commentaire listant les commits. Aucune IA ici, n8n a simplement lu le nom de la branche.

**4. Démo 2, le suivi continu.** Deux ou trois commits successifs sur le même ticket, chacun suivi d'un `git-sync`. Les commentaires s'accumulent dans Linear, le statut reste en In Progress.

**5. Démo 3, le passage en Done.** On montre d'abord le commit contenant `(closes-all)`, puis :

```bash
git-sync
```

Pendant l'exécution, les tests tournent en local avant l'envoi à n8n. On rafraîchit Linear : le ticket est en Done, avec le récap des vérifications en commentaire. Le terminal affiche quand même « -> In Progress », c'est normal (voir §4).

**6. n8n en deux mots.** On ouvre le workflow dézoomé : 21 nœuds, aucune ligne de code déployée. L'onglet Executions montre le détail de chaque exécution.

**7. Ce que ça coûte** (voir §7), puis clôture.

### Rejouer la démo

Le déroulé complet, avec les commandes exactes et un pense-bête, est dans `presentation/notes-presentateur.html`. Le document `docs/06-demo.md` en donne la version générique.

---

## 7. Coûts et licence

| Poste | Coût |
|---|---|
| n8n en auto-hébergement | Gratuit et illimité pour un usage interne (licence *fair-code*, Sustainable Use License). La revente de n8n en tant que service est interdite. |
| Linear | Un compte suffit |
| API Anthropic | Optionnelle. De l'ordre du centime par rapprochement, et seulement quand la branche ne nomme pas déjà le ticket. Sinon zéro appel IA. |

---

## 8. Aller plus loin

- **Serveur partagé** : pour que tout le monde en profite, n8n peut passer sur un VPS. La procédure et la configuration de sécurité sont dans `docs/07-vps.md`.
- **Hook `pre-push`** : pour déclencher `git-sync` automatiquement à chaque push. Le `|| true` est volontaire, une panne de n8n ne doit jamais bloquer un push.
- **Maintenance** : un workflow non maintenu devient une dette. Versionner son export (`workflows/git-linear-sync.json`) évite qu'il ne vive que sur un portable.

---

## Contenu du dépôt

```
docker/docker-compose.yml        n8n + postgres
docker/.env.example              secrets à copier en .env
bin/git-sync                     le script CLI
workflows/git-linear-sync.json   export du workflow
docs/                            le pas-à-pas (01 à 07)
.n8nsync                         clé d'équipe Linear pour ce dépôt
.n8ntest                         commande de test pour le passage en Done
demo-book-crud/                  API de démonstration (Hono + TypeScript)
setup-demo-book-crud.sh          régénère demo-book-crud/
presentation/                    slides + notes présentateur
```
