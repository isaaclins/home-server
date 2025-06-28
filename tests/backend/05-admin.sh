#!/bin/bash

# Admin endpoints tests (registration code generation & listing)
# Similar style to existing test scripts

# Resolve repository root to source .env for ADMIN_SECRET if present
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  source "$ROOT_DIR/.env"
fi
ADMIN_SECRET="${ADMIN_SECRET:-changeme}"
BASE_URL="http://localhost:8080"

log(){ echo "[TEST] $*"; }

request(){
  local method=$1 url=$2 secret=$3
  curl -s -w "%{http_code}" -X "$method" "$url" -H "X-Admin-Secret: $secret"
}

check(){
  local status=$1 expected=$2 desc=$3
  if [[ "$status" == "$expected" ]]; then
    log "✅ $desc (status $status)"
  else
    log "❌ $desc – expected $expected got $status"; exit 1;
  fi
}

BAD_SECRET="wrongsecret"

log "Generate code with bad secret should fail"
resp=$(request "POST" "$BASE_URL/api/admin/registration-codes/generate" "$BAD_SECRET")
status="${resp: -3}"
check "$status" "403" "POST with bad secret"

log "List codes with bad secret should fail"
resp=$(request "GET" "$BASE_URL/api/admin/registration-codes" "$BAD_SECRET")
status="${resp: -3}"
check "$status" "403" "GET with bad secret"

log "Generate code with valid secret"
resp=$(request "POST" "$BASE_URL/api/admin/registration-codes/generate" "$ADMIN_SECRET")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Generate code with valid secret"
# Parse JSON to extract code and expiresAt
CODE=$(echo "$body" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
EXPIRES=$(echo "$body" | grep -o '"expiresAt":"[^"]*"' | cut -d'"' -f4)
if [[ -z "$CODE" || -z "$EXPIRES" ]]; then
  log "❌ Failed to parse code or expiresAt from JSON: $body"; exit 1;
fi
log "Got code $CODE expiring at $EXPIRES"

log "Listing active codes should include the generated one"
list_resp=$(request "GET" "$BASE_URL/api/admin/registration-codes" "$ADMIN_SECRET")
list_status="${list_resp: -3}"
list_body="${list_resp%???}"
check "$list_status" "200" "List active codes"
# Expect body to contain the code
if echo "$list_body" | grep -q "$CODE"; then
  log "✅ Code present in list"
else
  log "❌ Code $CODE not found in list response: $list_body"; exit 1;
fi

log "🎉 Admin endpoint tests passed"
exit 0 
