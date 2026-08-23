# 07 — Passer sur un serveur, plus tard

Ce document n'est pas à exécuter avant la présentation. Il sert de réponse chiffrée à la
question « et si on le mettait vraiment en place ? ».

---

## Quand le local ne suffit plus

- plusieurs personnes doivent utiliser le workflow
- des déclencheurs planifiés sont nécessaires (un rapport à 8 h 30 ne part pas si ton
  portable est fermé)
- des webhooks entrants viennent de GitHub, Linear ou Sentry

Tant qu'aucun de ces trois cas ne se présente, le local est le bon choix.

---

## Ce que ça coûte

| Poste | Montant |
|---|---|
| VPS (Hetzner CX22, 2 vCPU / 4 Go) | ~4 €/mois |
| Nom de domaine | ~10 €/an |
| API Anthropic | quelques euros/mois pour une équipe de cinq |
| Mise en place | une demi-journée |

OVH convient également si tu y as déjà des ressources ; le rapport performance/prix de
Hetzner est meilleur sur cette gamme.

---

## Ce qui change par rapport au local

Le fichier `docker-compose.yml` reste presque identique. Trois modifications :

1. **Ne plus exposer le port 5678 publiquement.** Retire le bloc `ports` et place n8n
   derrière un reverse proxy (Caddy fait le TLS tout seul).
2. **Passer les variables en HTTPS** : `N8N_HOST=n8n.tondomaine.fr`,
   `N8N_PROTOCOL=https`, `WEBHOOK_URL=https://n8n.tondomaine.fr/`, et retirer
   `N8N_SECURE_COOKIE: "false"`.
3. **Ajouter un secret sur le webhook** : un en-tête que le script envoie et que le nœud
   Webhook exige (Authentication → Header Auth). Sans ça, n'importe qui connaissant
   l'URL peut déclencher le workflow.

Exemple de service Caddy à ajouter :

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
```

Avec un `Caddyfile` de trois lignes :

```
n8n.tondomaine.fr {
    reverse_proxy n8n:5678
}
```

---

## La liste de sécurité, sans négociation possible

- [ ] SSH par clé uniquement, `PasswordAuthentication no`
- [ ] Pare-feu : seuls 22, 80 et 443 ouverts (`ufw allow 22,80,443/tcp`)
- [ ] Mot de passe fort sur le compte propriétaire n8n, et 2FA activée
- [ ] Secret d'authentification sur le nœud Webhook
- [ ] `N8N_ENCRYPTION_KEY` sauvegardée hors du serveur
- [ ] Sauvegarde quotidienne de Postgres, restauration testée au moins une fois
- [ ] Mises à jour suivies (`docker compose pull` régulier) — n8n a déjà eu des CVE

Le risque le plus probable n'est pas l'intrusion : c'est la perte de
`N8N_ENCRYPTION_KEY`. Sans elle, une sauvegarde de la base ne sert à rien, tous les
identifiants sont illisibles.

---

## Migrer depuis le local

```bash
# Sur ta machine
cd ~/Documents/www/n8n-git-linear-sync/docker
docker compose exec postgres pg_dump -U n8n n8n > n8n-export.sql
scp n8n-export.sql user@serveur:~/

# Sur le serveur, avec la MEME N8N_ENCRYPTION_KEY dans le .env
docker compose up -d postgres
cat n8n-export.sql | docker compose exec -T postgres psql -U n8n n8n
docker compose up -d n8n
```

Alternative plus simple si tu n'as qu'un workflow : exporte-le en JSON depuis
l'interface et réimporte-le sur le serveur. Les identifiants sont à ressaisir à la main —
ils ne voyagent jamais dans l'export.
