#!/usr/bin/env bash

# Phase 2 – Admin User Management API test
# ---------------------------------------
# 1. Assumes docker compose stack is running.
# 2. Retrieves the auto-generated admin password from container logs.
# 3. Logs in, exercises user CRUD endpoints.
# 4. Exits non-zero on failure.

set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8081}

# tooling checks
which curl >/dev/null 2>&1 || { echo "curl not installed"; exit 1; }
which jq >/dev/null 2>&1 || { echo "jq not installed"; exit 1; }

# wait for auth-service health
echo "[1/6] Waiting for auth-service to accept connections ..."
for i in {1..60}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/auth/login" || true)
  if [[ "$STATUS" != "000" ]]; then
    break
  fi
  sleep 2
done || { echo "auth-service did not become reachable"; exit 1; }

# extract admin password
ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
if [[ -z "$ADMIN_PWD" ]]; then
  echo "Could not determine admin temporary password from logs"; exit 1;
fi

# login
echo "[2/7] Logging in as admin ..."
LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/um_login.out -X POST "${API_BASE}/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PWD}\"}")
if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Login failed ($LOGIN_STATUS) – attempting auth-service restart to refresh password";
  docker restart auth-service >/dev/null; sleep 5;
  ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
  LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/um_login.out -X POST "${API_BASE}/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PWD}\"}")
  if [[ "$LOGIN_STATUS" != "200" ]]; then echo "Second login attempt failed $LOGIN_STATUS"; cat /tmp/um_login.out; exit 1; fi
fi
LOGIN_RESP=$(cat /tmp/um_login.out)
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken')
MUST_CHANGE=$(echo "$LOGIN_RESP" | jq -r '.mustChangePwd')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then echo "Failed to obtain admin token"; exit 1; fi

# handle password change
if [[ "$MUST_CHANGE" == "true" ]]; then
  echo "[3/7] Changing admin temporary password ..."
  NEW_ADMIN_PWD="Admin$(date +%s)Pwd"
  curl -s -X POST "${API_BASE}/api/auth/password" -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOKEN}" -d "{\"oldPassword\":\"${ADMIN_PWD}\",\"newPassword\":\"${NEW_ADMIN_PWD}\"}" >/dev/null
  # login again with new password
  LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/um_login2.out -X POST "${API_BASE}/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"${NEW_ADMIN_PWD}\"}")
  if [[ "$LOGIN_STATUS" != "200" ]]; then echo "Login after pwd change failed $LOGIN_STATUS"; cat /tmp/um_login2.out; exit 1; fi
  TOKEN=$(cat /tmp/um_login2.out | jq -r '.accessToken')
fi

HDR="Authorization: Bearer ${TOKEN}"

# create user
RAND=$RANDOM
NEW_USER="test${RAND}"
NEW_PWD="Pwd${RAND}!"

echo "[4/7] Creating user ${NEW_USER} ..."
RESP=$(curl -s -w '%{http_code}' -o /tmp/create_user.out -X POST "${API_BASE}/api/users" \
  -H 'Content-Type: application/json' -H "$HDR" \
  -d "{\"username\":\"${NEW_USER}\",\"password\":\"${NEW_PWD}\"}")
if [[ "$RESP" != "200" ]]; then
  cat /tmp/create_user.out; echo; echo "Create user failed with status $RESP"; exit 1;
fi
USER_ID=$(jq -r '.id' /tmp/create_user.out)

# list users verify
echo "[5/7] Verifying user appears in list ..."
if ! curl -s -H "$HDR" "${API_BASE}/api/users" | jq -e --arg u "$NEW_USER" '.[] | select(.username==$u)' >/dev/null; then
  echo "User not found in list"; exit 1;
fi

# disable user
echo "[6/7] Disabling user ..."
RESP=$(curl -s -w '%{http_code}' -o /tmp/disable.out -X PATCH "${API_BASE}/api/users/${USER_ID}/enabled" \
  -H 'Content-Type: application/json' -H "$HDR" \
  -d '{"enabled":false}')
if [[ "$RESP" != "200" ]]; then
  cat /tmp/disable.out; echo; echo "Disable user failed with status $RESP"; exit 1;
fi
if [[ $(jq -r '.enabled' /tmp/disable.out) != "false" ]]; then
  echo "User still enabled after disable call"; exit 1;
fi

echo "[7/7] All checks passed"
echo "✅ Phase 2 user management API test passed" 
