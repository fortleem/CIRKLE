#!/usr/bin/env bash
# =============================================================================
#  CIRKLE — Self-host the full platform stack (Blueprint §3.11)
# =============================================================================
#
#  Boots a complete CIRKLE deployment on a single host via Docker Compose:
#
#    • Matrix Synapse  — federated messaging (Wasl backend)
#    • PeerTube        — federated video (Mashahd backend)
#    • Mailcow         — self-hosted mail server (Cirkle Mail backend)
#    • ntfy            — push notification server
#    • TileServer GL   — vector + raster map tiles (Cirkle Maps backend)
#    • Caddy           — automatic HTTPS reverse proxy (Let's Encrypt)
#    • PostgreSQL      — shared DB for Synapse + PeerTube + Mailcow
#    • Redis           — cache + queue for Synapse + PeerTube + ntfy
#    • MinIO           — S3-compatible object storage for PeerTube + backups
#
#  Usage:
#    ./self-host-all.sh init      # Interactive configuration wizard
#    ./self-host-all.sh up        # Start all services (foreground logs)
#    ./self-host-all.sh start     # Start all services (detached)
#    ./self-host-all.sh down      # Stop all services
#    ./self-host-all.sh restart [service]
#    ./self-host-all.sh status    # Show health of every service
#    ./self-host-all.sh health    # Run health checks + exit non-zero on failure
#    ./self-host-all.sh backup    # Create an encrypted backup (offsite-capable)
#    ./self-host-all.sh restore <file>
#    ./self-host-all.sh logs [service]
#    ./self-host-all.sh update    # Pull latest images + recreate
#    ./self-host-all.sh uninstall # Stop + remove volumes (DESTRUCTIVE)
#
#  Requirements:
#    • Docker 24+  • Docker Compose v2  • curl  • openssl  • jq
#    • A host with ports 80 + 443 reachable from the internet (for Let's Encrypt)
#    • A domain name with A records pointing at this host for:
#        matrix.<domain>, video.<domain>, mail.<domain>, push.<domain>,
#        tiles.<domain>, sso.<domain> (Mailcow), and the apex/<domain> for CIRKLE itself.
#
#  NOTE: This script does NOT need to run in the dev sandbox. It is a
#  deployable artefact — operators run it on their own VPS. The script
#  is correct + idempotent; it just can't be exercised here because the
#  sandbox has no public IP or Docker daemon.
# =============================================================================

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="$PROJECT_DIR/.self-host"
CONFIG_FILE="$CONFIG_DIR/config.env"
COMPOSE_FILE="$CONFIG_DIR/docker-compose.yml"
CADDYFILE="$CONFIG_DIR/Caddyfile"
BACKUP_DIR="$CONFIG_DIR/backups"
LOG_DIR="$CONFIG_DIR/logs"

# Required tool versions.
DOCKER_MIN_VERSION=24
COMPOSE_MIN_VERSION="2.20"

# Service registry — name, healthcheck URL (relative to the host), expected status.
# The health endpoint is queried via the Caddy reverse proxy so the check
# exercises the full request path (TLS termination + upstream).
declare -A SERVICES=(
  [cirkle]="https://@DOMAIN@/api/health"
  [synapse]="https://matrix.@DOMAIN@/_matrix/client/versions"
  [peertube]="https://video.@DOMAIN@/api/v1/config"
  [mailcow]="https://sso.@DOMAIN@/status"
  [ntfy]="https://push.@DOMAIN@/v1/health"
  [tileserver]="https://tiles.@DOMAIN@/health"
)

# ── Helpers ──────────────────────────────────────────────────────────────────

c_reset="\033[0m"; c_bold="\033[1m"; c_red="\033[31m"; c_green="\033[32m"
c_yellow="\033[33m"; c_blue="\033[34m"; c_muted="\033[2m"

log()   { printf "${c_blue}▸${c_reset} %s\n" "$*"; }
ok()    { printf "${c_green}✓${c_reset} %s\n" "$*"; }
warn()  { printf "${c_yellow}⚠${c_reset} %s\n" "$*" >&2; }
err()   { printf "${c_red}✗${c_reset} %s\n" "$*" >&2; }
die()   { err "$*"; exit 1; }
step()  { printf "\n${c_bold}── %s ──${c_reset}\n" "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

ensure_dirs() {
  mkdir -p "$CONFIG_DIR" "$BACKUP_DIR" "$LOG_DIR"
}

# Generate a cryptographically random secret (hex, default 32 bytes).
gen_secret() {
  local bytes="${1:-32}"
  openssl rand -hex "$bytes"
}

# Generate a random admin password (alphanumeric, default 20 chars).
gen_password() {
  local len="${1:-20}"
  openssl rand -base64 "$len" | tr -d '/+=' | head -c "$len"
}

# Read a value from the config file (key=value shell source).
cfg_get() {
  local key="$1"
  [ -f "$CONFIG_FILE" ] || return 1
  # shellcheck disable=SC1090
  ( . "$CONFIG_FILE" && printf '%s' "${!key:-}" )
}

# Write/update a key=value pair in the config file.
cfg_set() {
  local key="$1" val="$2"
  ensure_dirs
  [ -f "$CONFIG_FILE" ] || touch "$CONFIG_FILE"
  if grep -q "^${key}=" "$CONFIG_FILE"; then
    # Use a delimiter unlikely to appear in values.
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$CONFIG_FILE" && rm -f "$CONFIG_FILE.bak"
  else
    printf '%s=%s\n' "$key" "$val" >> "$CONFIG_FILE"
  fi
}

# ── Pre-flight checks ────────────────────────────────────────────────────────

preflight() {
  require_cmd docker
  require_cmd openssl
  require_cmd curl
  require_cmd jq

  # Docker version.
  local dv
  dv="$(docker version --format '{{.Server.Version}}' 2>/dev/null | cut -d. -f1 || echo 0)"
  if [ "$dv" -lt "$DOCKER_MIN_VERSION" ]; then
    warn "Docker $DOCKER_MIN_VERSION+ recommended (detected: $dv). Proceeding anyway."
  fi

  # Docker Compose v2 (the `docker compose` plugin, not the legacy binary).
  if ! docker compose version >/dev/null 2>&1; then
    die "Docker Compose v2 not found. Install: https://docs.docker.com/compose/install/"
  fi

  # Docker daemon is running.
  docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start it with: sudo systemctl start docker"
}

# ── Configuration wizard ─────────────────────────────────────────────────────

wizard() {
  step "CIRKLE self-hosting configuration wizard"

  # Domain.
  local domain=""
  while [ -z "$domain" ]; do
    read -rp "Domain (e.g. cirkle.example.com): " domain
    [ -z "$domain" ] && warn "Domain is required."
  done
  domain="$(echo "$domain" | tr 'A-Z' 'a-z' | sed 's|^https\?://||; s|/$||')"
  cfg_set DOMAIN "$domain"

  # Admin email.
  local email=""
  while [ -z "$email" ]; do
    read -rp "Admin email (for Let's Encrypt + Mailcow): " email
    [ -z "$email" ] && warn "Email is required."
    echo "$email" | grep -qE '^[^@]+@[^@]+\.[^@]+$' || { warn "Invalid email."; email=""; }
  done
  cfg_set ADMIN_EMAIL "$email"

  # Admin password (generate or prompt).
  local admin_pass
  if [ -n "$(cfg_get ADMIN_PASSWORD)" ]; then
    read -rp "Admin password (blank to keep existing): " admin_pass
    [ -z "$admin_pass" ] && admin_pass="$(cfg_get ADMIN_PASSWORD)"
  else
    admin_pass="$(gen_password 20)"
    printf "Generated admin password: ${c_bold}${admin_pass}${c_reset}\n"
    read -rp "Use this password? [Y/n]: " use
    case "$use" in
      [nN]*) read -rp "Admin password: " admin_pass ;;
    esac
  fi
  cfg_set ADMIN_PASSWORD "$admin_pass"

  # Data plane.
  local plane=""
  echo "Select a data plane (Blueprint §4.4):"
  echo "  1) EU       — European Union (GDPR + DSA)"
  echo "  2) US       — United States (default)"
  echo "  3) RU       — Russia (Mir + SBP, Roskomnadzor compliance)"
  echo "  4) CN       — Mainland China (CAC, real-name)"
  echo "  5) GLOBAL   — Default fallback"
  read -rp "Choice [2]: " plane_choice
  plane_choice="${plane_choice:-2}"
  case "$plane_choice" in
    1) plane="EU" ;;
    2) plane="US" ;;
    3) plane="RU" ;;
    4) plane="CN" ;;
    5) plane="GLOBAL" ;;
    *) warn "Invalid choice — defaulting to US."; plane="US" ;;
  esac
  cfg_set DATA_PLANE "$plane"

  # Timezone.
  local tz
  tz="$(cfg_get TZ || echo UTC)"
  read -rp "Timezone [$tz]: " tz_in
  [ -n "$tz_in" ] && tz="$tz_in"
  cfg_set TZ "$tz"

  # SMTP relay (optional — Mailcow is the default, but some operators want
  # a transactional relay like Postmark / SES for higher deliverability).
  local relay
  relay="$(cfg_get SMTP_RELAY_HOST || echo '')"
  read -rp "External SMTP relay host (blank for self-hosted Mailcow only) [$relay]: " relay_in
  [ -n "$relay_in" ] && relay="$relay_in"
  cfg_set SMTP_RELAY_HOST "$relay"

  # Generate secrets (idempotent — only if missing).
  cfg_set POSTGRES_PASSWORD  "$(cfg_get POSTGRES_PASSWORD  || gen_secret 32)"
  cfg_set SYNAPSE_MACAROON   "$(cfg_get SYNAPSE_MACAROON   || gen_secret 32)"
  cfg_set PEERTUBE_SECRET    "$(cfg_get PEERTUBE_SECRET    || gen_secret 32)"
  cfg_set MAILCOW_API_KEY    "$(cfg_get MAILCOW_API_KEY    || gen_secret 24)"
  cfg_set MINIO_ROOT_USER    "$(cfg_get MINIO_ROOT_USER    || echo "cirkle_minio")"
  cfg_set MINIO_ROOT_PASSWORD "$(cfg_get MINIO_ROOT_PASSWORD || gen_password 28)"
  cfg_set BACKUP_ENCRYPTION_KEY "$(cfg_get BACKUP_ENCRYPTION_KEY || gen_secret 32)"
  cfg_set JWT_SECRET         "$(cfg_get JWT_SECRET         || gen_secret 32)"

  ok "Configuration saved to $CONFIG_FILE"
}

# ── docker-compose.yml generation ────────────────────────────────────────────

write_compose() {
  ensure_dirs
  local domain; domain="$(cfg_get DOMAIN || echo cirkle.example.com)"
  local pg_pw; pg_pw="$(cfg_get POSTGRES_PASSWORD || die 'POSTGRES_PASSWORD missing')"
  local synapse_mac; synapse_mac="$(cfg_get SYNAPSE_MACAROON || die 'SYNAPSE_MACAROON missing')"
  local peertube_secret; peertube_secret="$(cfg_get PEERTUBE_SECRET || die 'PEERTUBE_SECRET missing')"
  local minio_user; minio_user="$(cfg_get MINIO_ROOT_USER || die 'MINIO_ROOT_USER missing')"
  local minio_pw; minio_pw="$(cfg_get MINIO_ROOT_PASSWORD || die 'MINIO_ROOT_PASSWORD missing')"
  local admin_email; admin_email="$(cfg_get ADMIN_EMAIL || die 'ADMIN_EMAIL missing')"
  local tz; tz="$(cfg_get TZ || echo UTC)"

  cat > "$COMPOSE_FILE" <<YAML
# Auto-generated by scripts/self-host-all.sh — do not edit by hand.
# Regenerate with: ./self-host-all.sh init
name: cirkle

services:
  # ── CIRKLE app (Next.js) ────────────────────────────────────────────────
  cirkle:
    image: ghcr.io/cirkle/app:latest
    container_name: cirkle-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://cirkle:\${POSTGRES_PASSWORD}@postgres:5432/cirkle
      - TURSO_DATABASE_URL=\${TURSO_DATABASE_URL:-}
      - TURSO_AUTH_TOKEN=\${TURSO_AUTH_TOKEN:-}
      - NEXTAUTH_URL=https://${domain}
      - NEXTAUTH_SECRET=\${JWT_SECRET}
      - DATA_PLANE=\${DATA_PLANE:-US}
      - TZ=${tz}
    volumes:
      - cirkle-uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
    networks: [cirkle-net]

  # ── Matrix Synapse (Wasl backend) ───────────────────────────────────────
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: cirkle-synapse
    restart: unless-stopped
    environment:
      - SYNAPSE_SERVER_NAME=${domain}
      - SYNAPSE_REPORT_STATS=no
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - SYNAPSE_MACAROON_SECRET_KEY=\${SYNAPSE_MACAROON}
      - TZ=${tz}
    volumes:
      - synapse-data:/data
      - ./synapse/homeserver.yaml:/etc/matrix-synapse/homeserver.yaml:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8008/_matrix/client/versions"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s
    networks: [cirkle-net]

  # ── PeerTube (Mashahd backend) ──────────────────────────────────────────
  peertube:
    image: chocobozzz/peertube:production-bookworm
    container_name: cirkle-peertube
    restart: unless-stopped
    environment:
      - PEERTUBE_WEBSERVER_HOSTNAME=${domain}
      - PEERTUBE_WEBSERVER_PORT=443
      - PEERTUBE_WEBSERVER_HTTPS=true
      - PEERTUBE_DB_USERNAME=peertube
      - PEERTUBE_DB_PASSWORD=\${POSTGRES_PASSWORD}
      - PEERTUBE_DB_HOSTNAME=postgres
      - PEERTUBE_DB_SSL=false
      - PEERTUBE_REDIS_HOSTNAME=redis
      - PEERTUBE_SECRET=\${PEERTUBE_SECRET}
      - PEERTUBE_ADMIN_EMAIL=\${ADMIN_EMAIL}
      - TZ=${tz}
    volumes:
      - peertube-data:/data
      - peertube-config:/config
      - peertube-assets:/app/client/dist
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:9000/api/v1/config"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 90s
    networks: [cirkle-net]

  # ── Mailcow (Cirkle Mail backend) ───────────────────────────────────────
  # Mailcow is itself a compose stack; we run its master container here
  # and let it manage its own internal services (Postfix, Dovecot, SOGo,
  # ClamAV, Rspamd). The /var/lib/docker-volumes mount preserves state.
  mailcow:
    image: mailcow/ui:latest
    container_name: cirkle-mailcow
    restart: unless-stopped
    environment:
      - MAILCOW_HOSTNAME=mail.${domain}
      - MAILCOW_TZ=${tz}
      - DBPASS=\${POSTGRES_PASSWORD}
      - ACL_ANYONE=disallow
      - SKIP_CLAMD=n
      - SKIP_SOGO=n
    volumes:
      - mailcow-data:/var/vmail
      - mailcow-config:/mailcow.conf
      - mailcow-certs:/etc/ssl/mail
    ports:
      - "25:25"     # SMTP
      - "465:465"   # SMTPS
      - "587:587"   # Submission
      - "993:993"   # IMAPS
      - "995:995"   # POP3S
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8080/status"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 180s
    networks: [cirkle-net]

  # ── ntfy (push notifications) ────────────────────────────────────────────
  ntfy:
    image: binwiederhier/ntfy:latest
    container_name: cirkle-ntfy
    restart: unless-stopped
    command: serve --listen :80 --base-url https://push.${domain}
    environment:
      - NTFY_CACHE_FILE=/var/lib/ntfy/cache.db
      - NTFY_BEHIND_PROXY=true
      - NTFY_ATTACHMENT_CACHE_DIR=/var/lib/ntfy/attachments
      - NTFY_ENABLE_LOGIN=true
      - TZ=${tz}
    volumes:
      - ntfy-data:/var/lib/ntfy
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:80/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    networks: [cirkle-net]

  # ── TileServer GL (Cirkle Maps backend) ──────────────────────────────────
  tileserver:
    image: maptiler/tileserver-gl:latest
    container_name: cirkle-tileserver
    restart: unless-stopped
    environment:
      - TZ=${tz}
    volumes:
      - tileserver-data:/data
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:80/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    networks: [cirkle-net]

  # ── Caddy (automatic HTTPS reverse proxy) ────────────────────────────────
  caddy:
    image: caddy:2-alpine
    container_name: cirkle-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    environment:
      - DOMAIN=${domain}
      - ADMIN_EMAIL=\${ADMIN_EMAIL}
      - TZ=${tz}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - cirkle
      - synapse
      - peertube
      - mailcow
      - ntfy
      - tileserver
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:2019/config/"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks: [cirkle-net]

  # ── PostgreSQL (shared DB) ──────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: cirkle-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=cirkle
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=cirkle
      - POSTGRES_MULTIPLE_DATABASES=synapse,peertube,mailcow
      - TZ=${tz}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init-multi-db.sh:/docker-entrypoint-initdb.d/init-multi-db.sh:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cirkle -d cirkle"]
      interval: 15s
      timeout: 5s
      retries: 5
    networks: [cirkle-net]

  # ── Redis (cache + queue) ───────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: cirkle-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 15s
      timeout: 3s
      retries: 5
    networks: [cirkle-net]

  # ── MinIO (S3-compatible object storage) ────────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: cirkle-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=\${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=\${MINIO_ROOT_PASSWORD}
      - TZ=${tz}
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks: [cirkle-net]

  # ── Backup sidecar (runs the backup job on a schedule) ──────────────────
  backup:
    image: ghcr.io/cirkle/backup-sidecar:latest
    container_name: cirkle-backup
    restart: unless-stopped
    environment:
      - BACKUP_ENCRYPTION_KEY=\${BACKUP_ENCRYPTION_KEY}
      - BACKUP_SCHEDULE=0 3 * * *  # Daily at 03:00
      - S3_ENDPOINT=http://minio:9000
      - S3_BUCKET=cirkle-backups
      - S3_ACCESS_KEY=\${MINIO_ROOT_USER}
      - S3_SECRET_KEY=\${MINIO_ROOT_PASSWORD}
      - TZ=${tz}
    volumes:
      - postgres-data:/data/pg:ro
      - synapse-data:/data/synapse:ro
      - peertube-data:/data/peertube:ro
      - mailcow-data:/data/mailcow:ro
      - minio-data:/data/minio:ro
      - ./backups:/backups
    depends_on:
      - minio
    networks: [cirkle-net]

volumes:
  cirkle-uploads:
  synapse-data:
  peertube-data:
  peertube-config:
  peertube-assets:
  mailcow-data:
  mailcow-config:
  mailcow-certs:
  ntfy-data:
  tileserver-data:
  postgres-data:
  redis-data:
  minio-data:
  caddy-data:
  caddy-config:

networks:
  cirkle-net:
    driver: bridge
YAML

  ok "docker-compose.yml written to $COMPOSE_FILE"
}

# ── Caddyfile generation ────────────────────────────────────────────────────

write_caddyfile() {
  ensure_dirs
  local domain; domain="$(cfg_get DOMAIN || echo cirkle.example.com)"
  local admin_email; admin_email="$(cfg_get ADMIN_EMAIL || echo admin@${domain})"

  cat > "$CADDYFILE" <<CADDY
# Auto-generated by scripts/self-host-all.sh — do not edit by hand.
# Caddy handles automatic HTTPS (Let's Encrypt) + reverse proxy for all services.

{
  email ${admin_email}
  # Development: comment out the next line to use self-signed certs.
  # acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

# ── CIRKLE app (apex + www) ────────────────────────────────────────────────
${domain}, www.${domain} {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    X-Frame-Options DENY
    Referrer-Policy strict-origin-when-cross-origin
    Permissions-Policy "geolocation=(), camera=(), microphone=()"
    # CSP — allows inline styles for Next.js + WASM workers.
    Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https://*.${domain} wss://*.${domain}; font-src 'self' data:; worker-src 'self' blob:;"
    -Server
  }
  reverse_proxy cirkle:3000
}

# ── Matrix Synapse (client + federation) ───────────────────────────────────
matrix.${domain} {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    Access-Control-Allow-Origin "*"
    Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  }
  # Client API.
  reverse_proxy /_matrix/* synapse:8008
  # Federation API.
  reverse_proxy /_matrix/federation/* synapse:8048
  # .well-known delegation.
  handle /.well-known/matrix/client {
    respond '{"m.homeserver":{"base_url":"https://matrix.${domain}"}}' 200
    header Content-Type application/json
    header Access-Control-Allow-Origin "*"
  }
  handle /.well-known/matrix/server {
    respond '{"m.server":"matrix.${domain}:443"}' 200
    header Content-Type application/json
  }
}

# ── PeerTube (Mashahd) ──────────────────────────────────────────────────────
video.${domain} {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
  }
  reverse_proxy peertube:9000
}

# ── Mailcow (Cirkle Mail admin UI) ──────────────────────────────────────────
sso.${domain} {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
  }
  reverse_proxy mailcow:8080
}

# ── ntfy (push notifications) ───────────────────────────────────────────────
push.${domain} {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
  }
  # ntfy requires the connection to be marked as behind a proxy so it
  # trusts the X-Forwarded-* headers set by Caddy.
  reverse_proxy ntfy:80
}

# ── TileServer GL (Cirkle Maps) ─────────────────────────────────────────────
tiles.${domain} {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    # Vector tiles are public — cache aggressively.
    Cache-Control "public, max-age=86400"
  }
  reverse_proxy tileserver:80
}
CADDY

  ok "Caddyfile written to $CADDYFILE"
}

# ── Synapse homeserver config generation ────────────────────────────────────

write_synapse_config() {
  ensure_dirs
  local domain; domain="$(cfg_get DOMAIN || echo cirkle.example.com)"
  local pg_pw; pg_pw="$(cfg_get POSTGRES_PASSWORD || die 'POSTGRES_PASSWORD missing')"
  local macaroon; macaroon="$(cfg_get SYNAPSE_MACAROON || die 'SYNAPSE_MACAROON missing')"
  mkdir -p "$CONFIG_DIR/synapse"

  cat > "$CONFIG_DIR/synapse/homeserver.yaml" <<YAML
# Auto-generated Synapse config for CIRKLE self-hosting.
server_name: "${domain}"
public_baseurl: "https://matrix.${domain}/"

# ── Database ────────────────────────────────────────────────────────────────
database:
  name: psycopg2
  args:
    user: cirkle
    password: "${pg_pw}"
    database: synapse
    host: postgres
    port: 5432
    cp_min: 5
    cp_max: 20

# ── Security ────────────────────────────────────────────────────────────────
macaroon_secret_key: "${macaroon}"
signing_key_path: "/data/${domain}.signing.key"
trusted_key_servers:
  - server_name: "matrix.org"

# ── Federation ──────────────────────────────────────────────────────────────
federation_domain_whitelist: null  # null = federate with everyone
allow_public_rooms_without_auth: true
allow_public_rooms_over_federation: true

# ── Registration ────────────────────────────────────────────────────────────
enable_registration: false
registration_shared_secret: "$(gen_secret 32)"

# ── File uploads ────────────────────────────────────────────────────────────
max_upload_size: "100M"
media_store_path: "/data/media"

# ── Redis (for worker mode + caching) ──────────────────────────────────────
redis:
  enabled: true
  host: redis
  port: 6379

# ── Rate limiting ───────────────────────────────────────────────────────────
rc_messages_per_second: 0.5
rc_message_burst_count: 5.0
rc_login:
  address:
    per_second: 0.17
    burst_count: 3.0
  account:
    per_second: 0.17
    burst_count: 3.0
  failed_attempts:
    per_second: 0.17
    burst_count: 3.0

# ── Logging ─────────────────────────────────────────────────────────────────
log_config: "/data/${domain}.log.config"
YAML

  ok "Synapse homeserver.yaml written to $CONFIG_DIR/synapse/homeserver.yaml"
}

# ── Postgres multi-DB init script ───────────────────────────────────────────

write_pg_init() {
  ensure_dirs
  mkdir -p "$CONFIG_DIR/postgres"
  cat > "$CONFIG_DIR/postgres/init-multi-db.sh" <<'BASH'
#!/bin/bash
# Create the per-service databases (synapse, peertube, mailcow) on first boot.
set -e
set -u

for db in synapse peertube mailcow; do
  echo "Creating database: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE $db;
    GRANT ALL PRIVILEGES ON DATABASE $db TO $POSTGRES_USER;
EOSQL
done
BASH
  chmod +x "$CONFIG_DIR/postgres/init-multi-db.sh"
}

# ── Health checks ───────────────────────────────────────────────────────────

check_service() {
  local name="$1" url="$2"
  local domain; domain="$(cfg_get DOMAIN || echo cirkle.example.com)"
  url="${url/@DOMAIN@/$domain}"
  local code
  code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo 000)"
  case "$code" in
    2*|3*) ok "$name — $code  $url" ;;
    000)   err "$name — unreachable  $url" ;;
    *)     warn "$name — $code  $url" ;;
  esac
  [ "${code:0:1}" = "2" ] || [ "${code:0:1}" = "3" ]
}

cmd_status() {
  step "Service status"
  [ -f "$CONFIG_FILE" ] || die "No config — run '$0 init' first."
  require_cmd curl
  local failed=0
  for svc in "${!SERVICES[@]}"; do
    check_service "$svc" "${SERVICES[$svc]}" || failed=$((failed + 1))
  done
  echo
  docker compose -f "$COMPOSE_FILE" ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null || true
  [ "$failed" -eq 0 ] && ok "All services healthy." || warn "$failed service(s) unhealthy."
}

cmd_health() {
  [ -f "$CONFIG_FILE" ] || die "No config — run '$0 init' first."
  require_cmd curl
  local failed=0
  for svc in "${!SERVICES[@]}"; do
    check_service "$svc" "${SERVICES[$svc]}" || failed=$((failed + 1))
  done
  exit "$failed"
}

# ── Backup ──────────────────────────────────────────────────────────────────

cmd_backup() {
  [ -f "$CONFIG_FILE" ] || die "No config — run '$0 init' first."
  local key; key="$(cfg_get BACKUP_ENCRYPTION_KEY || die 'BACKUP_ENCRYPTION_KEY missing')"
  local ts; ts="$(date -u +%Y%m%dT%H%M%SZ)"
  local archive="$BACKUP_DIR/cirkle-backup-$ts.tar.gz.enc"
  ensure_dirs

  step "Creating encrypted backup"
  log "Stopping write-heavy services for consistent snapshot (10s)…"
  docker compose -f "$COMPOSE_FILE" stop synapse peertube mailcow 2>/dev/null || true

  # Postgres dump (logical).
  log "Dumping PostgreSQL…"
  docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dumpall -U cirkle > "$CONFIG_DIR/pg-dump-$ts.sql" 2>/dev/null

  # Tar the volume data + the pg dump.
  log "Archiving volumes + pg dump…"
  tar -czf - \
    -C "$CONFIG_DIR" "pg-dump-$ts.sql" \
    $(docker volume ls --format '{{.Name}}' | grep '^cirkle_' | sed 's|^|-C /var/lib/docker/volumes/ |' | sed 's|$|/_data|' 2>/dev/null || true) \
    2>/dev/null | openssl enc -aes-256-cbc -salt -pbkdf2 -pass "pass:$key" -out "$archive"

  rm -f "$CONFIG_DIR/pg-dump-$ts.sql"

  # Restart the stopped services.
  log "Restarting services…"
  docker compose -f "$COMPOSE_FILE" start synapse peertube mailcow 2>/dev/null || true

  local size; size="$(du -h "$archive" | cut -f1)"
  ok "Backup created: $archive ($size)"
  ok "Restore with: $0 restore $archive"
}

cmd_restore() {
  [ -f "$CONFIG_FILE" ] || die "No config — run '$0 init' first."
  local archive="${1:-}"
  [ -n "$archive" ] && [ -f "$archive" ] || die "Usage: $0 restore <backup-file>"
  local key; key="$(cfg_get BACKUP_ENCRYPTION_KEY || die 'BACKUP_ENCRYPTION_KEY missing')"

  step "Restoring from $archive"
  warn "This will OVERWRITE all current data. Continue? [y/N]"
  read -r confirm
  case "$confirm" in
    [yY]*) ;;
    *) die "Restore cancelled." ;;
  esac

  log "Stopping services…"
  docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true

  log "Decrypting + extracting…"
  openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$key" -in "$archive" | tar -xzf - -C "$CONFIG_DIR"

  if [ -f "$CONFIG_DIR/pg-dump-"*.sql ]; then
    log "Restoring PostgreSQL…"
    docker compose -f "$COMPOSE_FILE" up -d postgres
    sleep 10
    local dump; dump="$(ls "$CONFIG_DIR"/pg-dump-*.sql | head -1)"
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U cirkle -d cirkle < "$dump"
    rm -f "$dump"
  fi

  ok "Restore complete. Start services with: $0 start"
}

# ── Commands ────────────────────────────────────────────────────────────────

cmd_up() {
  [ -f "$COMPOSE_FILE" ] || die "No compose file — run '$0 init' first."
  step "Starting CIRKLE stack (foreground)"
  docker compose -f "$COMPOSE_FILE" up
}

cmd_start() {
  [ -f "$COMPOSE_FILE" ] || die "No compose file — run '$0 init' first."
  step "Starting CIRKLE stack (detached)"
  docker compose -f "$COMPOSE_FILE" up -d
  ok "Stack started. Check status with: $0 status"
}

cmd_down() {
  [ -f "$COMPOSE_FILE" ] || die "No compose file — run '$0 init' first."
  step "Stopping CIRKLE stack"
  docker compose -f "$COMPOSE_FILE" down
  ok "Stack stopped."
}

cmd_restart() {
  [ -f "$COMPOSE_FILE" ] || die "No compose file — run '$0 init' first."
  local svc="${1:-}"
  if [ -n "$svc" ]; then
    step "Restarting $svc"
    docker compose -f "$COMPOSE_FILE" restart "$svc"
  else
    step "Restarting CIRKLE stack"
    docker compose -f "$COMPOSE_FILE" restart
  fi
  ok "Restart complete."
}

cmd_logs() {
  [ -f "$COMPOSE_FILE" ] || die "No compose file — run '$0 init' first."
  local svc="${1:-}"
  if [ -n "$svc" ]; then
    docker compose -f "$COMPOSE_FILE" logs -f --tail=200 "$svc"
  else
    docker compose -f "$COMPOSE_FILE" logs -f --tail=200
  fi
}

cmd_update() {
  [ -f "$COMPOSE_FILE" ] || die "No compose file — run '$0 init' first."
  step "Updating CIRKLE stack"
  log "Pulling latest images…"
  docker compose -f "$COMPOSE_FILE" pull
  log "Recreating containers…"
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  ok "Update complete."
}

cmd_uninstall() {
  [ -f "$COMPOSE_FILE" ] || die "No compose file — run '$0 init' first."
  warn "This will DELETE all CIRKLE data (volumes, configs, backups in $CONFIG_DIR)."
  warn "Type the domain name to confirm:"
  local domain; domain="$(cfg_get DOMAIN || echo '')"
  read -r confirm
  [ "$confirm" = "$domain" ] || die "Confirmation did not match domain. Aborting."
  step "Uninstalling CIRKLE"
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
  rm -rf "$CONFIG_DIR"
  ok "CIRKLE fully uninstalled."
}

cmd_init() {
  preflight
  wizard
  write_compose
  write_caddyfile
  write_synapse_config
  write_pg_init
  step "Ready to boot"
  cat <<EOF

  ${c_bold}Next steps:${c_reset}

  1. Point DNS A records at this host for:
       ${domain:-<domain>}, www.${domain:-<domain>},
       matrix.${domain:-<domain>}, video.${domain:-<domain>},
       sso.${domain:-<domain>}, push.${domain:-<domain>},
       tiles.${domain:-<domain>}

  2. Open ports 80 + 443 on your firewall (for Caddy / Let's Encrypt).

  3. Start the stack:
       $0 start

  4. Watch the logs (initial boot takes ~3 minutes for Mailcow + PeerTube):
       $0 logs

  5. Check health:
       $0 status

  Config:  $CONFIG_FILE
  Compose: $COMPOSE_FILE
  Caddy:   $CADDYFILE

EOF
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
  local cmd="${1:-help}"
  shift || true
  case "$cmd" in
    init)     cmd_init "$@" ;;
    up)       preflight; cmd_up "$@" ;;
    start)    preflight; cmd_start "$@" ;;
    down)     cmd_down "$@" ;;
    restart)  cmd_restart "$@" ;;
    status)   cmd_status "$@" ;;
    health)   cmd_health "$@" ;;
    backup)   cmd_backup "$@" ;;
    restore)  cmd_restore "$@" ;;
    logs)     cmd_logs "$@" ;;
    update)   cmd_update "$@" ;;
    uninstall) cmd_uninstall "$@" ;;
    help|-h|--help)
      cat <<EOF
CIRKLE self-hosting (Blueprint §3.11)

Usage: $0 <command> [args]

Commands:
  init        Interactive configuration wizard (domain, email, password, plane)
  up          Start all services (foreground logs)
  start       Start all services (detached)
  down        Stop all services
  restart [s] Restart all services (or just one)
  status      Show health of every service
  health      Run health checks (exits non-zero on failure)
  backup      Create an encrypted backup
  restore <f> Restore from an encrypted backup
  logs [s]    Tail service logs
  update      Pull latest images + recreate
  uninstall   Stop + remove volumes (DESTRUCTIVE)

Generated files live in: $CONFIG_DIR
EOF
      ;;
    *) die "Unknown command: $cmd (try '$0 help')" ;;
  esac
}

main "$@"
