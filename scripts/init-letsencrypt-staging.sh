#!/usr/bin/env bash
#
# Bootstrap Let's Encrypt certificates for Routsky staging (routsky.com).
#
# The staging compose exposes the SSL proxy on ports 8080 (HTTP) and 8443
# (HTTPS) so it can coexist with the production stack on the same server.
#
# Usage:
#   1. Copy .env.staging.example → .env.staging and fill in values
#   2. Ensure DNS A records for routsky.com & api.routsky.com point to this server
#   3. Run: bash scripts/init-letsencrypt-staging.sh

set -euo pipefail

COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.staging.example and fill in values."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "${DOMAIN:-}" ] || [ -z "${API_DOMAIN:-}" ] || [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "ERROR: DOMAIN, API_DOMAIN, and CERTBOT_EMAIL must be set in $ENV_FILE"
  exit 1
fi

echo "==> Domains: $DOMAIN, $API_DOMAIN"
echo "==> Email:   $CERTBOT_EMAIL"
echo ""

# ── Step 1: Create dummy certificate so Nginx can start ──
echo "==> Creating temporary self-signed certificate..."
docker compose -f "$COMPOSE_FILE" --profile ssl run --rm --entrypoint "" certbot sh -c "\
  mkdir -p /etc/letsencrypt/live/$DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'"

# ── Step 2: Start Nginx with the dummy cert ──
echo "==> Starting nginx-proxy with temporary certificate..."
docker compose -f "$COMPOSE_FILE" --profile ssl up -d nginx-proxy

echo "==> Waiting for Nginx to become ready..."
sleep 5

# ── Step 3: Remove dummy cert and request real ones ──
echo "==> Removing temporary certificate..."
docker compose -f "$COMPOSE_FILE" --profile ssl run --rm --entrypoint "" certbot sh -c "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf"

echo "==> Requesting Let's Encrypt certificate for $DOMAIN and $API_DOMAIN..."
docker compose -f "$COMPOSE_FILE" --profile ssl run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "$API_DOMAIN"

# ── Step 4: Reload Nginx with the real certificate ──
echo "==> Reloading Nginx with staging certificate..."
docker compose -f "$COMPOSE_FILE" --profile ssl exec nginx-proxy nginx -s reload

echo ""
echo "==> SSL certificates installed successfully for staging!"
echo "==> Start the full staging stack with:"
echo "    docker compose -f $COMPOSE_FILE --profile ssl up -d"
echo ""
echo "==> Or without SSL (direct port access):"
echo "    docker compose -f $COMPOSE_FILE up -d"
