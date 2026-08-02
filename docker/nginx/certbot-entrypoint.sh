#!/bin/sh
# certbot-entrypoint.sh - obtains (if missing) and renews Let's Encrypt
# certificates for the bundled Nginx (SSL_MODE=letsencrypt, with-proxy profile).
# Uses the HTTP-01 challenge served by Nginx from /var/www/certbot.
#
# Set LETSENCRYPT_EMAIL and APP_DOMAIN in .env. Port 80 of this host must be
# reachable from the internet for issuance and renewal.

set -e

DOMAIN="${APP_DOMAIN:-localhost}"
EMAIL="${LETSENCRYPT_EMAIL:-}"
WEBROOT="/var/www/certbot"

if [ -z "$EMAIL" ]; then
  echo "Certbot: LETSENCRYPT_EMAIL is not set. Set it in .env and recreate the certbot service." >&2
  exit 1
fi

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "Certbot: obtaining certificate for '$DOMAIN'..."
  certbot certonly --webroot --webroot-path "$WEBROOT" \
    --email "$EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN" --rsa-key-size 4096
else
  echo "Certbot: certificate for '$DOMAIN' already present."
fi

echo "Certbot: entering renewal loop..."
while :; do
  certbot renew --webroot --webroot-path "$WEBROOT" --quiet
  sleep 12h
done
