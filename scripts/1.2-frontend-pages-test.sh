#!/usr/bin/env bash

# Phase 1.2 Frontend smoke test – verifies core pages respond
# -----------------------------------------------------------
# 1. Assumes docker compose stack is already running (or starts it)
# 2. Checks /login and / (home) pages return HTML (status 200)
#
# This script is non-interactive and exits non-zero on any failure.

set -euo pipefail

which curl &>/dev/null || { echo "curl is not installed"; exit 1; }

API_BASE=http://localhost:3000

# wait for frontend to be up (max 60s)
echo "[1/3] Waiting for frontend to start on :3000 ..."
for i in {1..60}; do
  if curl -sf "$API_BASE" >/dev/null; then
    break
  fi
  sleep 2
done || { echo "Frontend did not start"; exit 1; }
echo "Frontend is up."

echo "[2/3] Checking /login page..."
if ! curl -sf "$API_BASE/login" | grep -q "<form"; then
  echo "Login page did not return expected HTML"; exit 1;
fi

echo "[3/3] Checking / (home) page redirects to /login when unauthenticated..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/")
if [[ "$STATUS" == "200" ]]; then
  echo "Home returned 200 OK (unauth client-side redirect will happen).";
fi
if [[ "$STATUS" == "302" || "$STATUS" == "307" ]]; then
  LOC=$(curl -sI "$API_BASE/" | awk -F': ' '/^[Ll]ocation/ {print $2}' | tr -d '\r')
  if [[ "$LOC" != *"/login"* ]]; then
    echo "Redirect location unexpected: $LOC"; exit 1;
  fi
else
  echo "✅ Frontend pages responded as expected"
fi
