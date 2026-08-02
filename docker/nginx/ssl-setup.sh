#!/bin/sh
# ssl-setup.sh - resolves and prepares SSL certificates for the bundled Nginx.
#
# Modes (SSL_MODE):
#   selfsigned  (default) - generate RSA 2048 self-signed certs into
#                           ./certs/selfsigned/ if none exist (Mode A).
#   letsencrypt           - use Let's Encrypt certs from ./certbot/conf (Mode B).
#                           A self-signed bootstrap cert is generated until the
#                           real certificate is issued by the certbot service.
#   custom                - use certs the user placed in ./certs/custom/
#                           (fullchain.pem + privkey.pem) (Mode C).
#
# Prints the resolved certificate path on stdout line 1 and the key path on
# stdout line 2. All informational output goes to stderr.

set -e

MODE="${SSL_MODE:-selfsigned}"
DOMAIN="${APP_DOMAIN:-localhost}"
CERTS_DIR="/etc/nginx/certs"
SELF_DIR="$CERTS_DIR/selfsigned"
CUSTOM_DIR="$CERTS_DIR/custom"
BOOTSTRAP_DIR="$CERTS_DIR/letsencrypt-bootstrap"
LE_LIVE="/etc/letsencrypt/live/$DOMAIN"

mkdir -p "$SELF_DIR" "$CUSTOM_DIR" "$BOOTSTRAP_DIR" /var/www/certbot

gen_selfsigned() {
  echo "SSL: generating RSA 2048 self-signed certificate for '$DOMAIN'" >&2
  openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 825 \
    -keyout "$1" -out "$2" \
    -subj "/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN" >/dev/null 2>&1
}

case "$MODE" in
  custom)
    if [ -f "$CUSTOM_DIR/fullchain.pem" ] && [ -f "$CUSTOM_DIR/privkey.pem" ]; then
      echo "SSL: using custom certificates from $CUSTOM_DIR" >&2
      echo "$CUSTOM_DIR/fullchain.pem"
      echo "$CUSTOM_DIR/privkey.pem"
    else
      echo "SSL: SSL_MODE=custom but $CUSTOM_DIR/fullchain.pem and/or privkey.pem are missing." >&2
      echo "     Place your certificate chain and private key in ./certs/custom/ (see README)." >&2
      exit 1
    fi
    ;;
  letsencrypt)
    if [ -f "$LE_LIVE/fullchain.pem" ]; then
      echo "SSL: using Let's Encrypt certificate for '$DOMAIN'" >&2
      echo "$LE_LIVE/fullchain.pem"
      echo "$LE_LIVE/privkey.pem"
    else
      echo "SSL: no Let's Encrypt certificate for '$DOMAIN' yet - using a self-signed" >&2
      echo "     bootstrap cert so Nginx can serve the ACME challenge. The certbot" >&2
      echo "     service will issue the real certificate." >&2
      if [ ! -f "$BOOTSTRAP_DIR/fullchain.pem" ] || [ ! -f "$BOOTSTRAP_DIR/privkey.pem" ]; then
        gen_selfsigned "$BOOTSTRAP_DIR/privkey.pem" "$BOOTSTRAP_DIR/fullchain.pem"
      fi
      echo "$BOOTSTRAP_DIR/fullchain.pem"
      echo "$BOOTSTRAP_DIR/privkey.pem"
    fi
    ;;
  selfsigned|*)
    if [ ! -f "$SELF_DIR/fullchain.pem" ] || [ ! -f "$SELF_DIR/privkey.pem" ]; then
      gen_selfsigned "$SELF_DIR/privkey.pem" "$SELF_DIR/fullchain.pem"
    else
      echo "SSL: existing self-signed certificate found in $SELF_DIR" >&2
    fi
    echo "$SELF_DIR/fullchain.pem"
    echo "$SELF_DIR/privkey.pem"
    ;;
esac
