#!/usr/bin/env bash

# Phase 1.2 end-to-end smoke test for Authentication MVP
# ------------------------------------------------------
# 1. Builds & starts docker-compose stack
# 2. Extracts temporary admin password from auth-service logs
# 3. Logs in, retrieves JWT, forces password change
# 4. Verifies login works with new password
#
# Prerequisites: docker, docker-compose, curl, jq (for JSON parsing)

set -euo pipefail

which docker &>/dev/null || { echo "docker is not installed"; exit 1; }
which curl &>/dev/null || { echo "curl is not installed"; exit 1; }
which jq &>/dev/null || { echo "jq is not installed (brew install jq)"; exit 1; }

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
REPO_ROOT=$(dirname "$SCRIPT_DIR")
cd "$REPO_ROOT/infra"

STACK_NAME=home_server_mvp

DOCKER_COMPOSE="docker compose"

echo "[0/6] Shutting down any existing stack and removing volumes..."
$DOCKER_COMPOSE down -v || true

echo "[1/6] Building and starting docker-compose stack..."
$DOCKER_COMPOSE up -d --build

echo "[2/6] Waiting for gateway health endpoint..."
until curl -sf http://localhost:8080/health >/dev/null; do
  printf '.'
  sleep 2
done
printf '\nGateway is healthy.\n'

echo "[3/6] Waiting for auth-service to emit temporary admin password..."
PASS=""
for i in {1..90}; do
  PASS=$($DOCKER_COMPOSE logs auth-service 2>&1 | grep 'Temporary Password:' | tail -1 | awk '{print $NF}' || true)
  if [[ -n "$PASS" ]]; then
    break
  fi
  sleep 2
  printf '.'
done
if [[ -z "$PASS" ]]; then
  echo "\nTimeout waiting for temporary password in logs"; exit 1;
fi
printf "\n   ↳ Temp password detected: %s\n" "$PASS"

AUTH_URL=http://localhost:8081/api/auth

echo "[4/6] Logging in with temporary password..."
LOGIN_JSON=$(curl -sf -X POST "$AUTH_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN_JSON" | jq -r '.accessToken')
REQUIRES_CHANGE=$(echo "$LOGIN_JSON" | jq -r '.mustChangePwd')
if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
  echo "Login failed"; exit 1;
fi
printf '   ↳ Received JWT. mustChangePwd=%s\n' "$REQUIRES_CHANGE"

NEWPASS=Admin123!

if [[ "$REQUIRES_CHANGE" == "true" ]]; then
  echo "[5/6] Changing password to '$NEWPASS'..."
  curl -sf -X POST "$AUTH_URL/password" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"oldPassword\":\"$PASS\",\"newPassword\":\"$NEWPASS\"}" >/dev/null
else
  echo "[5/6] Skipping password change (flag false)";
fi

# Verify new login works
TOKEN2=$(curl -sf -X POST "$AUTH_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"$NEWPASS\"}" | jq -r '.accessToken')

if [[ "$TOKEN2" == "null" || -z "$TOKEN2" ]]; then
  echo "Password change verification failed"; exit 1;
fi

echo "✅ End-to-end auth flow succeeded. JWT: $TOKEN2" 
