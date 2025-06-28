#!/bin/bash

# Registration flow tests
# Resolve repository root (two levels up from this script dir)
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
# Source generated .env if present to pick up ADMIN_SECRET
if [[ -f "$ROOT_DIR/.env" ]]; then
  source "$ROOT_DIR/.env"
fi
# Fallback to changeme if not set
ADMIN_SECRET="${ADMIN_SECRET:-changeme}"
BASE_URL="http://localhost:8080"

TIMESTAMP=$(date +%s)
USERNAME="reguser_${TIMESTAMP}"
EMAIL="reg_${TIMESTAMP}@example.com"
PASSWORD="password123"

log() { echo "[TEST] $*"; }

request() {
  local method=$1 url=$2 data=$3
  if [[ -n "$data" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
  else
    curl -s -w "%{http_code}" -X "$method" "$url"
  fi
}

check() {
  local status=$1 expected=$2 desc=$3
  if [[ "$status" == "$expected" ]]; then
    log "✅ $desc (status $status)"
  else
    log "❌ $desc – expected $expected, got $status"; exit 1;
  fi
}

log "Generating registration code"
# Split HTTP status code from body
resp=$(curl -s -w "%{http_code}" -H "X-Admin-Secret: $ADMIN_SECRET" -X POST "$BASE_URL/api/admin/registration-codes/generate")
code_status="${resp: -3}"
code_body="${resp%???}"
# Extract just the code value from the JSON (expects {"code":"123456", ...})
code_value=$(echo "$code_body" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
check "$code_status" "200" "Generate code"
if [[ -z "$code_value" ]]; then log "❌ Empty code extracted"; echo "Body was: $code_body"; exit 1; fi
log "Received code: $code_value"

log "Registering new user with valid code"
reg_payload="{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"code\":\"$code_value\"}"
reg_resp=$(request "POST" "$BASE_URL/api/register" "$reg_payload")
reg_status="${reg_resp: -3}"
check "$reg_status" "201" "Register user"

log "Attempt duplicate username (should conflict)"
# Need a fresh code because the previous one was consumed
dup_code_resp=$(curl -s -w "%{http_code}" -H "X-Admin-Secret: $ADMIN_SECRET" -X POST "$BASE_URL/api/admin/registration-codes/generate")
dup_status="${dup_code_resp: -3}"
# extract code from JSON body
dup_code_body="${dup_code_resp%???}"
dup_code=$(echo "$dup_code_body" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
check "$dup_status" "200" "Generate code for duplicate username"

dup_payload="{\"username\":\"$USERNAME\",\"email\":\"dup_${EMAIL}\",\"password\":\"$PASSWORD\",\"code\":\"$dup_code\"}"
conf_resp=$(request "POST" "$BASE_URL/api/register" "$dup_payload")
check "${conf_resp: -3}" "409" "Duplicate username"

log "Generate new code, wait for expiry, attempt register (should fail)"
exp_resp=$(curl -s -w "%{http_code}" -H "X-Admin-Secret: $ADMIN_SECRET" -X POST "$BASE_URL/api/admin/registration-codes/generate")
exp_status="${exp_resp: -3}"
exp_body="${exp_resp%???}"
exp_code=$(echo "$exp_body" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
check "$exp_status" "200" "Generate second code"
log "Sleeping 65 seconds to let code expire..."
sleep 65
exp_payload="{\"username\":\"exp_$USERNAME\",\"email\":\"exp_$EMAIL\",\"password\":\"$PASSWORD\",\"code\":\"$exp_code\"}"
exp_reg=$(request "POST" "$BASE_URL/api/register" "$exp_payload")
check "${exp_reg: -3}" "400" "Expired code should fail"

log "🎉 Registration tests passed"
exit 0 
