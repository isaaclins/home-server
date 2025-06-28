#!/bin/bash

BASE_URL="http://localhost:8080"
ADMIN_USER="testadmin"
ADMIN_PW="testpassword"

log(){ echo "[TEST] $*"; }

request(){
  local method=$1 url=$2 data=$3
  if [[ -n "$data" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
  else
    curl -s -w "%{http_code}" -X "$method" "$url"
  fi
}

check(){
  local status=$1 expected=$2 msg=$3
  [[ "$status" == "$expected" ]] && log "✅ $msg" || { log "❌ $msg expected $expected got $status"; exit 1; }
}

log "Login happy path"
login_payload="{\"usernameOrEmail\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PW\"}"
login_resp=$(request "POST" "$BASE_URL/api/login" "$login_payload")
status="${login_resp: -3}"
body="${login_resp%???}"
check "$status" "200" "Login success"
TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [[ -z "$TOKEN" ]]; then log "❌ No token returned"; exit 1; fi
log "Token received: ${TOKEN:0:20}..."

log "Bad credentials should fail"
bad_payload="{\"usernameOrEmail\":\"baduser\",\"password\":\"badpw\"}"
bad_resp=$(request "POST" "$BASE_URL/api/login" "$bad_payload")
check "${bad_resp: -3}" "401" "Login failure"

log "🎉 Auth tests passed"
exit 0 
