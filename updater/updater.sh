#!/bin/sh
# SubnetIQ updater - polls for update triggers and applies release tags.
# Runs inside a docker:git container with access to the host docker socket
# and the stack directory (mounted at the same path as on the host).

set -e
umask 022

STACK="${UPDATE_STACK_DIR:-/home/ipam/GG_IPAM}"
REMOTE="${UPDATE_REMOTE:-https://github.com/K1NGPINGG/SubnetIQ.git}"
UPDATES="${UPDATE_DATA_DIR:-/updates}"

mkdir -p "$UPDATES"
chmod 777 "$UPDATES"

git config --global --add safe.directory "$STACK" || true
git config --global --add safe.directory /updates || true

log() {
  echo "[updater] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$UPDATES/update.log"
  chmod 644 "$UPDATES/update.log"
}

set_state() {
  echo "$1" > "$UPDATES/state.json"
  chmod 644 "$UPDATES/state.json"
}

run_update() {
  TAG="$1"
  cd "$STACK"

  log "update to $TAG requested"
  set_state "{\"status\":\"running\",\"tag\":\"$TAG\",\"started_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

  # Convert stack directory into a git repo on first run if needed.
  if [ ! -d .git ]; then
    log "initializing git repository"
    git init -q
    git remote add origin "$REMOTE"
  fi

  git fetch --tags --force origin || { log "git fetch failed"; return 1; }
  git checkout --force "$TAG" || { log "git checkout $TAG failed"; return 1; }

  docker compose build subnetiq-app backend || { log "docker compose build failed"; return 1; }
  docker compose up -d --no-deps --force-recreate subnetiq-app backend celery-worker || { log "docker compose up failed"; return 1; }

  log "update to $TAG succeeded"
  set_state "{\"status\":\"success\",\"tag\":\"$TAG\",\"finished_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
  return 0
}

log "updater started (stack=$STACK)"

while true; do
  if [ -f "$UPDATES/trigger.json" ]; then
    TAG=$(sed -n 's/.*"tag"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$UPDATES/trigger.json" | head -n1)
    rm -f "$UPDATES/trigger.json"
    if [ -n "$TAG" ]; then
      if run_update "$TAG"; then
        :
      else
        log "update to $TAG failed"
        set_state "{\"status\":\"failed\",\"tag\":\"$TAG\",\"finished_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
      fi
    else
      log "trigger without a valid tag ignored"
    fi
  fi
  sleep 5
done
