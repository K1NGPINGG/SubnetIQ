#!/bin/sh
# entrypoint.sh - renders the Nginx config and starts Nginx for the bundled
# reverse proxy service (with-proxy profile).
#
# 1. Resolves SSL certificates via ssl-setup.sh (SSL_MODE: selfsigned /
#    letsencrypt / custom).
# 2. Renders nginx.conf.template into /etc/nginx/conf.d/default.conf.
# 3. In letsencrypt mode, watches for certificate changes (initial issuance or
#    renewal) and reloads Nginx so HTTPS always uses the real certificate.
# 4. Starts Nginx in the foreground.

set -e

resolve_certs() {
  PATHS="$(sh /ssl-setup.sh)"
  SSL_CERT_PATH="$(echo "$PATHS" | sed -n '1p')"
  SSL_KEY_PATH="$(echo "$PATHS" | sed -n '2p')"
  export SSL_CERT_PATH SSL_KEY_PATH
}

render_config() {
  resolve_certs
  envsubst '$APP_SERVICE $APP_SERVICE_PORT $APP_DOMAIN $SSL_CERT_PATH $SSL_KEY_PATH' \
    < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
}

render_config

# Let's Encrypt mode: reload when the managed certificate appears or changes.
if [ "${SSL_MODE:-selfsigned}" = "letsencrypt" ]; then
  (
    LE_LIVE="/etc/letsencrypt/live/${APP_DOMAIN:-localhost}"
    LAST=""
    if [ -f "$LE_LIVE/fullchain.pem" ]; then
      LAST="$(stat -c %Y "$LE_LIVE/fullchain.pem" 2>/dev/null || echo 0)"
    fi
    while :; do
      sleep 60
      CUR=""
      if [ -f "$LE_LIVE/fullchain.pem" ]; then
        CUR="$(stat -c %Y "$LE_LIVE/fullchain.pem" 2>/dev/null || echo 0)"
      fi
      if [ -n "$CUR" ] && [ "$CUR" != "$LAST" ]; then
        LAST="$CUR"
        render_config
        nginx -s reload >/dev/null 2>&1 || true
      fi
    done
  ) &
fi

echo "Starting Nginx (ssl_mode=${SSL_MODE:-selfsigned}, domain=${APP_DOMAIN:-localhost})..."
exec nginx -g 'daemon off;'
