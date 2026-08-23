# 04 — Le script `git-sync`

Le script vit dans `bin/git-sync`. Il ne fait rien d'intelligent : il collecte ce que git
sait déjà, l'envoie à n8n, et affiche la réponse.

---

## 4.1 Le rendre disponible partout

```bash
ln -sf ~/Documents/www/n8n-git-linear-sync/bin/git-sync /usr/local/bin/git-sync
```

Si `/usr/local/bin` n'est pas dans ton `PATH` (Mac Apple Silicon) :

```bash
ln -sf ~/Documents/www/n8n-git-linear-sync/bin/git-sync /opt/homebrew/bin/git-sync
```

Vérifie :

```bash
which git-sync && git-sync --help
```

---

## 4.2 Configurer la clé d'équipe

Trois niveaux, du plus spécifique au plus général :

```bash
git-sync --team ALO                 # ponctuel
echo "ALO" > .n8nsync               # par depot, a la racine
export LINEAR_TEAM_KEY=ALO          # global, dans ~/.zshrc
```

Sans aucun des trois, le workflow retombe sur la constante `DEFAULT_TEAM_KEY` du nœud 2.

---

## 4.3 Ce que fait le script, étape par étape

**Il vérifie l'environnement.** `git`, `jq` et `curl` doivent être présents, et le
dossier courant doit être un dépôt git. Il s'arrête avec un message clair sinon.

**Il détermine quels commits envoyer.** Quatre stratégies, dans l'ordre :

| Situation | Plage retenue |
|---|---|
| Une synchro précédente a laissé un marqueur | depuis ce commit |
| La branche suit une branche distante | les commits non poussés |
| `origin/main` existe | l'écart avec `origin/main` |
| Rien de tout ça | les 3 derniers commits |

Le marqueur est un fichier dans `.git/n8n-last-sync`. Il n'est écrit **qu'après** une
réponse réussie de n8n : si l'appel échoue, la prochaine tentative renvoie les mêmes
commits. C'est ce qui rend le script relançable sans créer de commentaires en double.

**Il construit la charge utile** avec `jq` — jamais par concaténation de chaînes. Un
message de commit contenant un guillemet ou un retour à la ligne casserait un JSON
assemblé à la main.

**Il appelle n8n** et distingue trois cas : n8n injoignable, n8n répond une erreur HTTP,
n8n répond 200. Seul le dernier cas met à jour le marqueur.

---

## 4.4 Les options

```bash
git-sync                # usage normal
git-sync --dry-run      # affiche la charge utile, n appelle pas n8n
git-sync --all          # ignore le marqueur, renvoie toute la branche
git-sync --team WEB     # force la cle d equipe
```

`--dry-run` est l'option à connaître : elle permet de vérifier ce que le script voit
sans rien déclencher.

---

## 4.5 Pointer vers l'URL de test

Pendant la mise au point du workflow, tu veux l'URL de test (celle qui n'est active que
quand tu cliques sur *Listen for test event*) :

```bash
export N8N_WEBHOOK_URL="http://localhost:5678/webhook-test/git-sync"
git-sync
```

Une fois le workflow activé, reviens à l'URL de production en fermant ce terminal ou
avec :

```bash
unset N8N_WEBHOOK_URL
```

---

## 4.6 En option — déclencher au push

Si tu veux t'en servir vraiment après la présentation, un hook `pre-push` évite d'y
penser :

```bash
cat > .git/hooks/pre-push << 'HOOK'
#!/usr/bin/env bash
git-sync || true
HOOK
chmod +x .git/hooks/pre-push
```

Le `|| true` est délibéré : une panne de n8n ne doit jamais empêcher un push.

Garde ce hook pour plus tard — pendant la démo, la commande explicite est bien plus
lisible pour la salle.

---

Suite : [05 — Tests](05-tests.md)
