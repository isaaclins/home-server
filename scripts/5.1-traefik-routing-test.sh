#!/usr/bin/env bash

# Phase 5.1 – Traefik Reverse Proxy basic routing test
# ---------------------------------------------------
# 1. Assumes docker compose stack is already running (e.g. started by a prior test)
# 2. Waits for Traefik to become reachable on :80
# 3. Verifies routing:
#    • Host api.server.local  → gateway /health returns HTTP 200
#    • Host app.server.local  → frontend root returns HTTP 200 or 304
#
# Requires: curl

set -euo pipefail

which curl >/dev/null 2>&1 || { echo "curl not installed"; exit 1; }

API_HOST=api.server.local
APP_HOST=app.server.local

# Wait for Traefik port 80 open
printf "[1/3] Waiting for Traefik to listen on port 80 ..."
for i in {1..60}; do
  if curl -sf http://localhost --max-time 2 >/dev/null; then
    break
  fi
  sleep 2
  printf '.'
done
printf '\n'

echo "[2/3] Verifying API routing (Host: $API_HOST /health) ..."
STATUS_API=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $API_HOST" http://localhost/health || true)
if [[ "$STATUS_API" != "200" ]]; then
  echo "Expected 200 from API health, got $STATUS_API"; exit 1;
fi

echo "[3/3] Verifying Frontend routing (Host: $APP_HOST /) ..."
STATUS_APP=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $APP_HOST" http://localhost/ || true)
case "$STATUS_APP" in
  200|304|307|308)
    ;; # acceptable codes (Next.js may redirect)
  *)
    echo "Expected 200/304/307/308 from frontend root, got $STATUS_APP"; exit 1;
    ;;
esac

echo "✅ Traefik routing test passed" 
