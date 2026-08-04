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

# Write a running progress snapshot (0-100) with a human-readable step label.
set_progress() {
  PROGRESS="$1"
  STEP="$2"
  set_state "{\"status\":\"running\",\"tag\":\"$TAG\",\"started_at\":\"$STARTED\",\"progress\":$PROGRESS,\"step\":\"$STEP\"}"
}

fail_update() {
  set_state "{\"status\":\"failed\",\"tag\":\"$TAG\",\"started_at\":\"$STARTED\",\"finished_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"progress\":${PROGRESS_CUR:-50},\"step\":\"Update failed\"}"
}

run_update() {
  TAG="$1"
  cd "$STACK"

  STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  PROGRESS_CUR=0
  # Capture the original stack owner so we can restore it after git operations
  # (the updater container runs as root and would otherwise create root-owned
  # objects that block the host user from later git operations).
  STACK_OWNER="$(stat -c '%u:%g' "$STACK" 2>/dev/null || echo 1000:1000)"
  log "update to $TAG requested"
  set_progress 0 "Starting update"

  # Convert stack directory into a git repo on first run if needed.
  if [ ! -d .git ]; then
    log "initializing git repository"
    git init -q
    git remote add origin "$REMOTE"
  fi

  set_progress 5 "Fetching repository"
  git fetch --tags --force origin || { log "git fetch failed"; fail_update; return 1; }

  set_progress 15 "Checking out $TAG"
  git checkout --force "$TAG" || { log "git checkout $TAG failed"; fail_update; return 1; }

  # Restore ownership so the host user can manage the stack after the update.
  chown -R "$STACK_OWNER" "$STACK" 2>/dev/null || true

  set_progress 30 "Building backend image"
  PROGRESS_CUR=30
  docker compose build backend || { log "docker compose build backend failed"; fail_update; return 1; }

  set_progress 50 "Building frontend image"
  PROGRESS_CUR=50
  docker compose build subnetiq-app || { log "docker compose build frontend failed"; fail_update; return 1; }

  set_progress 75 "Restarting services"
  PROGRESS_CUR=75
  docker compose up -d --no-deps --force-recreate subnetiq-app backend celery-worker || { log "docker compose up failed"; fail_update; return 1; }

  log "update to $TAG succeeded"
  set_state "{\"status\":\"success\",\"tag\":\"$TAG\",\"started_at\":\"$STARTED\",\"finished_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"progress\":100,\"step\":\"Update complete\"}"
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
        log "update to $TAG failed (state updated by updater)"
      fi
    else
      log "trigger without a valid tag ignored"
    fi
  fi
  sleep 5
done
