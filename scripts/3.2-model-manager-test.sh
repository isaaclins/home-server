#!/usr/bin/env bash

# Phase 3.2 – Model Manager API test
# ----------------------------------
# Ensures admin-only delete endpoint is protected and functional.
# Steps:
#   1. Wait for chat-service health
#   2. Call /api/ollama/ WITHOUT token – expect 403
#   3. Obtain admin JWT token
#   4. Call /api/ollama/models/delete WITH token – expect HTTP 200
#
# Exits non-zero on failure.

set -euo pipefail

API_CHAT=${API_CHAT:-http://localhost:8082}
API_AUTH=${API_AUTH:-http://localhost:8081}

which curl >/dev/null 2>&1 || { echo "curl not installed"; exit 1; }
which jq >/dev/null 2>&1 || { echo "jq not installed"; exit 1; }

printf "[1/4] Waiting for chat-service ..."
for i in {1..60}; do
  if curl -sf "$API_CHAT/health" >/dev/null; then break; fi
  sleep 2
  printf '.'
done || { echo "\nchat-service not healthy"; exit 1; }

printf "\n[1b] Waiting for auth-service ..."
for i in {1..60}; do
  if curl -sf "$API_AUTH/" >/dev/null; then break; fi
  sleep 2
  printf '.'
done || { echo "\nauth-service not healthy"; exit 1; }

echo "\n[2/4] Verifying unauthenticated delete is rejected ..."
STATUS=$(curl -s -o /tmp/mm.out -w "%{http_code}" -X POST "$API_CHAT/api/ollama/models/delete" -H 'Content-Type: application/json' -d '{"name":"nonexistent"}')
if [[ "$STATUS" != "403" && "$STATUS" != "401" ]]; then
  echo "Expected 403/401, got $STATUS"; cat /tmp/mm.out; exit 1;
fi

echo "\n[3/4] Logging in as admin ..."
ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
if [[ -z "$ADMIN_PWD" ]]; then echo "Failed to determine admin password"; exit 1; fi

LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/mm_login.out -X POST "$API_AUTH/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PWD\"}")
if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Login failed ($LOGIN_STATUS), attempting refresh ...";
  docker restart auth-service >/dev/null; sleep 5;
  ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
  LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/mm_login.out -X POST "$API_AUTH/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PWD\"}")
  if [[ "$LOGIN_STATUS" != "200" ]]; then echo "Second login attempt failed ($LOGIN_STATUS)"; cat /tmp/mm_login.out; exit 1; fi
fi
LOGIN_RESP=$(cat /tmp/mm_login.out)
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken')
MUST_CHANGE=$(echo "$LOGIN_RESP" | jq -r '.mustChangePwd')

if [[ "$MUST_CHANGE" == "true" ]]; then
  NEW_ADMIN_PWD="Admin$(date +%s)Pwd"
  curl -s -X POST "$API_AUTH/api/auth/password" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"oldPassword\":\"$ADMIN_PWD\",\"newPassword\":\"$NEW_ADMIN_PWD\"}" >/dev/null
  LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/mm_login2.out -X POST "$API_AUTH/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"$NEW_ADMIN_PWD\"}")
  if [[ "$LOGIN_STATUS" != "200" ]]; then echo "Login after pwd change failed $LOGIN_STATUS"; cat /tmp/mm_login2.out; exit 1; fi
  TOKEN=$(cat /tmp/mm_login2.out | jq -r '.accessToken')
fi

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then echo "Failed to obtain token"; exit 1; fi

echo "[4/4] Attempting delete with admin token ..."
STATUS=$(curl -s -o /tmp/mm2.out -w "%{http_code}" -X POST "$API_CHAT/api/ollama/models/delete" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"nonexistent"}')
if [[ "$STATUS" != "200" ]]; then
  echo "Expected 200, got $STATUS"; cat /tmp/mm2.out; exit 1;
fi

echo "Model Manager API test passed ✅"
