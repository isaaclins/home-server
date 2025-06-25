#!/usr/bin/env bash

# Phase 4.1 – Usage endpoint & UI test (backend focus)
# ----------------------------------------------------
# 1. Assumes docker compose stack running
# 2. Waits for auth-service health
# 3. Obtains admin token
# 4. Calls /api/usage and expects JSON array (>0 elements)

set -euo pipefail

API_AUTH=${API_AUTH:-http://localhost:8081}

which curl >/dev/null 2>&1 || { echo "curl not installed"; exit 1; }
which jq >/dev/null 2>&1 || { echo "jq not installed"; exit 1; }

# wait for auth-service
printf "[1/3] Waiting for auth-service ..."
for i in {1..60}; do
  if curl -sf "$API_AUTH/health" >/dev/null; then break; fi
  sleep 2
  printf '.'
done || { echo "\nauth-service not healthy"; exit 1; }

echo "\n[2/3] Logging in as admin ..."
ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
if [[ -z "$ADMIN_PWD" ]]; then echo "Failed to determine admin password"; exit 1; fi

LOGIN_STATUS=$(curl -s -w '%{http_code}' -o /tmp/usage_login.out -X POST "$API_AUTH/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PWD\"}")
if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Login failed ($LOGIN_STATUS) – attempting auth-service restart to refresh password";
  docker restart auth-service >/dev/null; sleep 5;
  ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
  LOGIN_STATUS=$(curl -s -w '%{http_code}' -o /tmp/usage_login.out -X POST "$API_AUTH/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PWD\"}")
  if [[ "$LOGIN_STATUS" != "200" ]]; then echo "Second login attempt failed $LOGIN_STATUS"; cat /tmp/usage_login.out; exit 1; fi
fi
LOGIN_RESP=$(cat /tmp/usage_login.out)
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken')
MUST_CHANGE=$(echo "$LOGIN_RESP" | jq -r '.mustChangePwd')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then echo "Failed to obtain token"; exit 1; fi

if [[ "$MUST_CHANGE" == "true" ]]; then
  NEW_ADMIN_PWD="Admin$(date +%s)Pwd"
  curl -s -X POST "$API_AUTH/api/auth/password" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"oldPassword\":\"$ADMIN_PWD\",\"newPassword\":\"$NEW_ADMIN_PWD\"}" >/dev/null
  LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/usage_login2.out -X POST "$API_AUTH/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"$NEW_ADMIN_PWD\"}")
  if [[ "$LOGIN_STATUS" != "200" ]]; then echo "Login after pwd change failed $LOGIN_STATUS"; cat /tmp/usage_login2.out; exit 1; fi
  TOKEN=$(cat /tmp/usage_login2.out | jq -r '.accessToken')
fi

# trigger a request to log usage
curl -s -H "Authorization: Bearer $TOKEN" "$API_AUTH/api/users" >/dev/null || true
# give the DB a moment
sleep 2

echo "[3/3] Calling /api/usage ..."
RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_AUTH/api/usage")
COUNT=$(echo "$RESP" | jq 'length')
if [[ "$COUNT" -gt 0 ]]; then
  echo "Usage endpoint returned $COUNT rows ✅"
else
  echo "Expected >0 usage rows, got $COUNT"; echo "$RESP"; exit 1;
fi

# generate a request to create a usage record
curl -s -H "Authorization: Bearer $TOKEN" "$API_AUTH/api/users" >/dev/null || true 
