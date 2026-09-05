#!/usr/bin/env bash
#
# setup.sh - amene le projet de "tout ecrit, rien branche" a "stack debout".
#
# Idempotent : relancable sans casse. Ne reecrit jamais docker/.env.
#
# Usage :
#   ./setup.sh              installation complete
#   ./setup.sh --no-start   prepare .env et le symlink, sans demarrer Docker

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$HERE/docker"
ENV_FILE="$DOCKER_DIR/.env"
BIN_TARGET="$HOME/.local/bin/git-sync"
N8N_URL="http://localhost:5678"
NO_START=0

[ "${1:-}" = "--no-start" ] && NO_START=1

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '\033[32mok\033[0m   %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m    %s\n' "$*"; }
step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die()  { printf '\033[31mx\033[0m    %s\n' "$*" >&2; exit 1; }

# --- Etape 1 : preflight ---------------------------------------------------
step "1/5  Verification des prerequis"

for tool in docker jq curl openssl; do
  command -v "$tool" >/dev/null || die "$tool est introuvable. Installe-le : brew install $tool"
done
ok "docker, jq, curl, openssl presents"

docker compose version >/dev/null 2>&1 || die "Le plugin 'docker compose' est introuvable. Mets Docker Desktop a jour."
ok "docker compose disponible"

docker info >/dev/null 2>&1 || die "Le demon Docker ne repond pas. Ouvre Docker Desktop et attends que la baleine soit stable."
ok "demon Docker demarre"

[ -f "$DOCKER_DIR/docker-compose.yml" ] || die "docker/docker-compose.yml introuvable. Lance ce script depuis la racine du depot."
[ -f "$HERE/bin/git-sync" ]             || die "bin/git-sync introuvable."
[ -f "$HERE/workflows/git-linear-sync.json" ] || die "workflows/git-linear-sync.json introuvable."
ok "fichiers du depot en place"

# --- Etape 2 : secrets -----------------------------------------------------
step "2/5  Fichier de secrets docker/.env"

if [ -f "$ENV_FILE" ]; then
  warn "docker/.env existe deja, il n'est pas touche."
  warn "N8N_ENCRYPTION_KEY ne doit JAMAIS changer apres un premier demarrage :"
  warn "cela rendrait illisibles tous les identifiants stockes dans n8n."
else
  PG_PASS="$(openssl rand -hex 16)"
  ENC_KEY="$(openssl rand -hex 32)"

  cat > "$ENV_FILE" << ENDOFFILE_1
# Genere par setup.sh le $(date '+%Y-%m-%d %H:%M').
# Ce fichier n'est pas versionne (voir .gitignore).

POSTGRES_USER=n8n
POSTGRES_PASSWORD=$PG_PASS
POSTGRES_DB=n8n

# Sans cette cle, tous les identifiants stockes dans n8n deviennent illisibles.
# Ne la change jamais apres le premier demarrage. Ne la commite jamais.
N8N_ENCRYPTION_KEY=$ENC_KEY

GENERIC_TIMEZONE=Africa/Porto-Novo
ENDOFFILE_1

  chmod 600 "$ENV_FILE"
  ok "docker/.env cree, droits 600"
  bold ""
  bold "  Copie cette cle dans ton gestionnaire de mots de passe MAINTENANT :"
  bold "  N8N_ENCRYPTION_KEY=$ENC_KEY"
  bold ""
fi

# --- Etape 3 : demarrage ---------------------------------------------------
if [ "$NO_START" -eq 1 ]; then
  step "3/5  Demarrage ignore (--no-start)"
else
  step "3/5  Demarrage des conteneurs"

  cd "$DOCKER_DIR"

  # Si aucun conteneur n8n n'existe encore, le port doit etre libre.
  if [ -z "$(docker compose ps -q n8n 2>/dev/null || true)" ]; then
    if lsof -nP -iTCP:5678 -sTCP:LISTEN >/dev/null 2>&1; then
      die "Le port 5678 est deja occupe par un autre processus. Libere-le, ou change la ligne 'ports' du docker-compose.yml en \"5679:5678\"."
    fi
  fi

  docker compose up -d
  ok "docker compose up -d lance"

  printf '     attente de postgres (healthy)'
  PG_CID="$(docker compose ps -q postgres)"
  for i in $(seq 1 60); do
    STATUS="$(docker inspect --format '{{.State.Health.Status}}' "$PG_CID" 2>/dev/null || echo unknown)"
    [ "$STATUS" = "healthy" ] && break
    printf '.'
    sleep 2
  done
  printf '\n'
  [ "$STATUS" = "healthy" ] || {
    docker compose logs --tail 40 postgres
    die "postgres n'est pas passe healthy en 120 s. Verifie docker/.env (pas d'espace autour du =, pas de guillemets)."
  }
  ok "postgres healthy"

  printf '     attente de n8n (%s)' "$N8N_URL"
  N8N_UP=0
  for i in $(seq 1 60); do
    CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$N8N_URL/healthz" 2>/dev/null || echo 000)"
    if [ "$CODE" != "000" ]; then N8N_UP=1; break; fi
    printf '.'
    sleep 2
  done
  printf '\n'
  [ "$N8N_UP" -eq 1 ] || {
    docker compose logs --tail 40 n8n
    die "n8n ne repond pas apres 120 s. Les logs ci-dessus donnent la raison."
  }
  ok "n8n repond sur $N8N_URL"

  cd "$HERE"
fi

# --- Etape 4 : installation du CLI -----------------------------------------
step "4/5  Installation de git-sync"

chmod +x "$HERE/bin/git-sync"
mkdir -p "$HOME/.local/bin"
ln -sfn "$HERE/bin/git-sync" "$BIN_TARGET"
ok "symlink $BIN_TARGET -> bin/git-sync"

if command -v git-sync >/dev/null 2>&1; then
  ok "git-sync est appelable depuis n'importe quel depot"
else
  warn "~/.local/bin n'est pas dans ton PATH pour ce shell."
  warn "Ajoute a ~/.zshrc :  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# --- Etape 5 : recapitulatif ----------------------------------------------
step "5/5  Ce qu'il reste a faire a la main"

cat << 'ENDOFFILE_2'

Ces quatre gestes ne sont pas scriptables : ils passent par l'interface n8n,
qui chiffre tes cles avec N8N_ENCRYPTION_KEY.

  1. Compte proprietaire
     Ouvre http://localhost:5678 et cree le compte. Il est local a ta machine,
     il n'a rien a voir avec n8n Cloud.
     Detail : docs/01-installation.md, section 1.4

  2. Les deux identifiants
     - Linear API      (Settings > Security & access > Personal API keys)
     - Header Auth     nom d'en-tete "x-api-key", valeur = ta cle Anthropic
     Detail : docs/02-credentials.md

  3. Import du workflow
     Workflows > menu "..." > Import from File
     Choisis workflows/git-linear-sync.json

     L'export ne contient pas les identifiants. Rattache-les aux 7 noeuds :
       Linear API   -> Linear - Ticket par reference
       Linear API   -> Linear - Contexte equipe
       Linear API   -> Linear - Creer le ticket
       Linear API   -> Linear - Etat In Progress
       Linear API   -> Linear - Passer en In Progress
       Linear API   -> Linear - Ajouter le commentaire
       Header Auth  -> Claude - Rapprochement

     Puis active le workflow (interrupteur en haut a droite). Sans activation,
     l'URL /webhook/git-sync repond 404.

  4. Les tests
     Depuis un depot de travail, sur une branche nommee comme un ticket :
       git-sync --dry-run     affiche la charge utile sans rien envoyer
       git-sync               envoie pour de vrai
     Les 4 scenarios : docs/05-tests.md

Commandes utiles (depuis docker/) :
  docker compose logs -f n8n     suivre les logs
  docker compose stop            arreter
  docker compose down            arreter et supprimer les conteneurs (volumes gardes)

ENDOFFILE_2

bold "Stack prete."
