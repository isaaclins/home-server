#!/usr/bin/env bash

# Phase 3.1 – Chat-service basic endpoint test
# -------------------------------------------
# 1. Assumes docker compose stack running.
# 2. Waits for chat-service health on :8082
# 3. Calls /api/ollama/models, expects HTTP 200.

set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8082}

# tooling
which curl >/dev/null 2>&1 || { echo "curl not installed"; exit 1; }

# wait up to 60 seconds for chat-service
echo "[1/3] Waiting for chat-service ..."
for i in {1..60}; do
  if curl -sf "${API_BASE}/health" >/dev/null; then
    break
  fi
  sleep 2
  printf '.'
done || { echo "chat-service did not become healthy"; exit 1; }

echo "[2/3] Waiting for /api/ollama/models to return 200 ..."
for i in {1..60}; do
  STATUS=$(curl --max-time 5 -s -o /tmp/models.out -w "%{http_code}" "${API_BASE}/api/ollama/models" || true)
  if [[ "$STATUS" == "200" ]]; then
     break
  fi
  printf '.'
  sleep 2
done

if [[ "$STATUS" != "200" ]]; then
  echo "\nmodels endpoint did not become ready (last status $STATUS)"; cat /tmp/models.out; exit 1;
fi

echo "\n[3/3] chat-service basic endpoint test passed ✅" 
