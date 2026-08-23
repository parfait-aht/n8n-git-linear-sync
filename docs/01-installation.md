# 01 — Installation de n8n en local

Objectif : deux conteneurs Docker qui tournent sur ta machine, `n8n` et `postgres`.
Rien n'est exposé sur Internet.

Durée : environ 10 minutes.

---

## 1.1 Vérifier les prérequis

```bash
docker --version
docker compose version
docker info > /dev/null && echo "démon Docker démarré"
jq --version
```

Si `jq` manque :

```bash
brew install jq
```

Si le démon Docker ne répond pas, ouvre l'application Docker Desktop et attends que la
baleine soit stable dans la barre de menu.

---

## 1.2 Créer le fichier de secrets

Le fichier `.env` n'est jamais versionné (il est listé dans `.gitignore`).

```bash
cd ~/Documents/www/n8n-git-linear-sync/docker
cp .env.example .env
```

Génère les deux valeurs :

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)"
```

Ouvre `.env` et remplace les deux `REMPLACE_MOI` par ces valeurs.

> **La clé de chiffrement est le point critique.** n8n s'en sert pour chiffrer les
> identifiants qu'il stocke (ta clé Linear, ta clé Anthropic). Si tu la perds ou la
> modifies après le premier démarrage, ces identifiants deviennent illisibles — y
> compris dans une sauvegarde de la base. Garde-la dans ton gestionnaire de mots de passe.

---

## 1.3 Démarrer

```bash
cd ~/Documents/www/n8n-git-linear-sync/docker
docker compose up -d
```

Le premier lancement télécharge les images, compte deux à trois minutes.

Suis le démarrage :

```bash
docker compose logs -f n8n
```

Tu attends la ligne :

```
Editor is now accessible via:
http://localhost:5678
```

`Ctrl+C` pour quitter les logs — les conteneurs continuent de tourner.

---

## 1.4 Créer le compte propriétaire

Ouvre <http://localhost:5678>.

n8n demande de créer un compte à la première visite. Ce compte est **local à ta
machine**, il n'a rien à voir avec n8n Cloud. Utilise une vraie adresse et un mot de
passe que tu retrouveras.

n8n propose ensuite une clé de licence communautaire gratuite, envoyée par email. Elle
n'est pas obligatoire ; elle débloque quelques conforts (dossiers, recherche dans les
exécutions). Tu peux l'activer ou passer.

---

## 1.5 Vérifier que tout tient

```bash
docker compose ps
```

Les deux services doivent être `running`, et `postgres` doit afficher `(healthy)`.

Test de bout en bout — la base est bien branchée si les workflows persistent après un
redémarrage :

```bash
docker compose restart n8n
```

Recharge la page : tu dois toujours être connecté.

---

## 1.6 Commandes à connaître

| Besoin | Commande (depuis `docker/`) |
|---|---|
| Démarrer | `docker compose up -d` |
| Arrêter | `docker compose stop` |
| Arrêter et supprimer les conteneurs | `docker compose down` |
| Voir les logs | `docker compose logs -f n8n` |
| Mettre à jour n8n | `docker compose pull && docker compose up -d` |
| Sauvegarder la base | `docker compose exec postgres pg_dump -U n8n n8n > ~/n8n-backup.sql` |

> `docker compose down` supprime les conteneurs mais **pas** les volumes : tes workflows
> survivent. Pour tout effacer, il faut `docker compose down -v` — à n'utiliser que si tu
> veux vraiment repartir de zéro.

---

## Problèmes fréquents

**Le port 5678 est déjà pris.** Change la ligne `ports` du `docker-compose.yml` en
`"5679:5678"`, puis adapte `N8N_WEBHOOK_URL` quand tu utiliseras le script.

**`postgres` reste en `starting`.** Regarde `docker compose logs postgres` : le plus
souvent, un `.env` mal formé (espace autour du `=`, guillemets superflus).

**Avertissement sur les permissions du fichier de config.** n8n durcit les droits du
fichier `config` dans son volume. Sans effet sur le fonctionnement.

---

Suite : [02 — Identifiants](02-credentials.md)
