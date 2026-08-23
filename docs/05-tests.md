# 05 — Valider avant de présenter

Quatre scénarios. Passe-les tous : ce sont exactement les chemins que tu montreras.

Prépare un dépôt jetable :

```bash
mkdir -p ~/demo-git-sync && cd ~/demo-git-sync
git init -b main
git commit --allow-empty -m "chore: init"
echo "ALO" > .n8nsync        # remplace par ta cle d equipe
```

Et pointe le script vers l'URL de test :

```bash
export N8N_WEBHOOK_URL="http://localhost:5678/webhook-test/git-sync"
```

Dans n8n, clique sur **Listen for test event** avant chaque exécution : tu vois alors
les données circuler nœud par nœud, ce qui rend le diagnostic immédiat.

---

## Test 1 — Le ticket est nommé dans la branche

Crée un ticket dans Linear, note son identifiant (par exemple `ALO-42`).

```bash
git checkout -b feat/ALO-42-relance-paiement
echo "relance" > relance.ts
git add . && git commit -m "feat(paiement): premiere version de la relance"
git-sync
```

**Attendu** : le chemin du haut s'allume (nœuds 3 → 4 → 11 → …), aucun appel à Claude,
`ALO-42` passe en In Progress avec un commentaire listant le commit.

Ce cas est instantané et gratuit — c'est celui à montrer en premier.

---

## Test 2 — Aucune référence, mais un ticket existe

Crée dans Linear un ticket ouvert intitulé par exemple « Ajouter l'export CSV des
chantiers ». Puis :

```bash
git checkout main && git checkout -b feature/export
echo "csv" > export.ts
git add . && git commit -m "feat(export): generer le fichier CSV des chantiers"
git-sync
```

**Attendu** : le chemin du bas, Claude retrouve le ticket, la confiance dépasse 0,7, le
ticket passe en In Progress. Le commentaire mentionne le rapprochement automatique et sa
justification.

Ouvre le nœud `Claude · Rapprochement` et regarde la réponse : c'est le moment le plus
intéressant à montrer.

---

## Test 3 — Aucun ticket ne correspond

```bash
git checkout main && git checkout -b chore/renommer-variables
echo "x" > divers.ts
git add . && git commit -m "chore: renommer trois variables internes"
git-sync
```

**Attendu** : la confiance reste sous 0,7, un ticket est créé avec un titre et une
description rédigés par Claude, puis passé en In Progress.

Vérifie la qualité du titre généré. S'il est mauvais, c'est le prompt du nœud 6 qu'il
faut ajuster, pas le modèle.

---

## Test 4 — L'idempotence

Relance immédiatement la même commande :

```bash
git-sync
```

**Attendu** : `Rien a synchroniser`. Aucun appel à n8n, aucun commentaire en double.

Puis force :

```bash
git-sync --all
```

**Attendu** : les commits repartent, un nouveau commentaire est ajouté. C'est voulu —
`--all` est une commande explicite.

---

## Tableau de diagnostic

| Symptôme | Cause probable |
|---|---|
| `Appel a n8n impossible` | conteneur arrêté, ou tu utilises l'URL de test sans avoir cliqué sur *Listen* |
| n8n répond `404` | le workflow n'est pas activé, ou le chemin du webhook diffère |
| `Reponse IA illisible` | la clé Anthropic est absente ou l'en-tête `anthropic-version` manque au nœud 7 |
| `Aucun ticket resolu` | la requête Linear n'a rien trouvé : mauvaise clé d'équipe, ou ticket inexistant |
| Erreur GraphQL `Argument Validation Error` | une variable est `null` — regarde la sortie du nœud précédent |
| Le statut ne bouge pas | l'équipe n'a aucun état de type `started` ; vérifie ses statuts dans Linear |

Pour voir le détail d'une erreur : onglet **Executions** du workflow, clique sur
l'exécution en rouge, puis sur le nœud fautif.

---

## Avant de fermer

- [ ] Les quatre tests passent
- [ ] Le workflow est **activé** (interrupteur en haut à droite)
- [ ] `unset N8N_WEBHOOK_URL` — tu repasses sur l'URL de production
- [ ] Un dernier `git-sync` sur un vrai cas fonctionne sans mode test
- [ ] Les tickets de démo sont remis en `Todo` dans Linear

---

Suite : [06 — Dérouler la présentation](06-demo.md)
