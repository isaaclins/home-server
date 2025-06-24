#!/usr/bin/env bash

# Phase 3.2 – Chat persistence integration test
# ---------------------------------------------
# Preconditions:
#   • docker compose stack running (mysql, auth-service, chat-service)
#   • jq, curl available on host
# Steps:
#   1. Wait for chat-service to be healthy
#   2. Obtain (or refresh) admin token (handles mustChangePwd)
#   3. POST /api/ollama/chat and capture sessionId
#   4. Assert at least two chat_message rows exist for the session (user + assistant)
# Exits non-zero on failure.

set -euo pipefail

API_CHAT=${API_CHAT:-http://localhost:8082}
API_AUTH=${API_AUTH:-http://localhost:8081}
MYSQL_CONTAINER=mysql
MYSQL_CMD=(docker exec -i "$MYSQL_CONTAINER" mysql -uroot -proot -N -e)

which curl >/dev/null 2>&1 || { echo "curl not installed"; exit 1; }
which jq >/dev/null 2>&1 || { echo "jq not installed"; exit 1; }

# 1. Wait for chat-service
echo "[1/5] Waiting for chat-service ..."
for i in {1..60}; do
  if curl -sf "$API_CHAT/health" >/dev/null; then break; fi
  sleep 2
done || { echo "chat-service not healthy"; exit 1; }

# 2. Obtain admin token
ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
if [[ -z "$ADMIN_PWD" ]]; then
  echo "Failed to determine admin password"; exit 1;
fi

echo "[2/5] Logging in as admin ..."
LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/login.out -X POST "$API_AUTH/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PWD\"}")
if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Login failed with HTTP $LOGIN_STATUS, attempting to restart auth-service to refresh admin password..."
  docker restart auth-service >/dev/null
  sleep 5
  ADMIN_PWD=$(docker logs auth-service 2>&1 | grep -E "Temporary Password:" | tail -1 | awk '{print $NF}')
  echo "New admin password: $ADMIN_PWD"
  LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/login.out -X POST "$API_AUTH/api/auth/login" \
      -H 'Content-Type: application/json' \
      -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PWD\"}")
  if [[ "$LOGIN_STATUS" != "200" ]]; then
     echo "Second login attempt failed ($LOGIN_STATUS). Proceeding without auth header."; TOKEN="";
  else
     LOGIN_RESP=$(cat /tmp/login.out)
     TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken')
     MUST_CHANGE=$(echo "$LOGIN_RESP" | jq -r '.mustChangePwd')

     if [[ "$MUST_CHANGE" == "true" ]]; then
       NEW_ADMIN_PWD="Admin$(date +%s)Pwd"
       curl -s -X POST "$API_AUTH/api/auth/password" \
         -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
         -d "{\"oldPassword\":\"$ADMIN_PWD\",\"newPassword\":\"$NEW_ADMIN_PWD\"}" >/dev/null
       # login again with new password to refresh token
       LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /tmp/login2.out -X POST "$API_AUTH/api/auth/login" \
           -H 'Content-Type: application/json' \
           -d "{\"username\":\"admin\",\"password\":\"$NEW_ADMIN_PWD\"}")
       if [[ "$LOGIN_STATUS" != "200" ]]; then
          echo "Login after password change failed $LOGIN_STATUS"; cat /tmp/login2.out; exit 1;
       fi
       TOKEN=$(cat /tmp/login2.out | jq -r '.accessToken')
     fi
  fi
fi

# final auth header
if [[ -n "$TOKEN" && "$TOKEN" != "null" ]]; then
  HDR="Authorization: Bearer $TOKEN"
else
  HDR=""
fi

# 3. Send chat request
PROMPT="Hello $(date +%s)"
CHAT_STATUS=$(curl -s -w "%{http_code}" -o /tmp/chat.out -X POST "$API_CHAT/api/ollama/chat" \
    ${HDR:+-H "$HDR"} -H 'Content-Type: application/json' \
    -d "{\"model\":\"tinyllama\",\"prompt\":\"$PROMPT\"}")
if [[ "$CHAT_STATUS" != "200" ]]; then
   echo "Chat HTTP $CHAT_STATUS"; cat /tmp/chat.out; exit 1;
fi

RESPONSE=$(cat /tmp/chat.out)
SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')
ASSIST=$(echo "$RESPONSE" | jq -r '.reply')
if [[ "$SESSION_ID" == "null" || -z "$SESSION_ID" ]]; then
  echo "Chat endpoint did not return sessionId"; exit 1;
fi
if [[ -z "$ASSIST" || "$ASSIST" == "null" ]]; then
  echo "Chat endpoint did not return reply"; exit 1;
fi

echo "[3/5] Chat session $SESSION_ID created"

# wait briefly for DB commit
sleep 2

# 4. Verify DB rows
COUNT=$(${MYSQL_CMD[@]} "USE home_server; SELECT COUNT(*) FROM chat_message WHERE session_id=$SESSION_ID;")
if [[ "$COUNT" -lt 2 ]]; then
  echo "Expected >=2 messages in DB, found $COUNT"; exit 1;
fi

echo "[4/5] Found $COUNT messages persisted for session $SESSION_ID"

echo "[5/5] Chat persistence test passed ✅" 
