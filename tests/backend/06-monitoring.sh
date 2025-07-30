#!/bin/bash

# Monitoring API endpoints tests
# Tests all monitoring endpoints with proper admin authentication

BASE_URL="http://localhost:8080"
ADMIN_USER="testadmin"
ADMIN_PW="testpassword"

log() { echo "[TEST] $*"; }

request_with_auth() {
  local method=$1 url=$2 token=$3
  if [[ -n "$token" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $token"
  else
    curl -s -w "%{http_code}" -X "$method" "$url"
  fi
}

request() {
  local method=$1 url=$2 data=$3
  if [[ -n "$data" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
  else
    curl -s -w "%{http_code}" -X "$method" "$url"
  fi
}

check() {
  local status=$1 expected=$2 msg=$3
  if [[ "$status" == "$expected" ]]; then
    log "✅ $msg (status $status)"
  else
    log "❌ $msg - expected $expected, got $status"
    exit 1
  fi
}

# Get admin token
log "Getting admin token"
login_payload="{\"usernameOrEmail\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PW\"}"
login_resp=$(request "POST" "$BASE_URL/api/login" "$login_payload")
status="${login_resp: -3}"
body="${login_resp%???}"
check "$status" "200" "Admin login"
TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [[ -z "$TOKEN" ]]; then
  log "❌ No admin token received"
  exit 1
fi
log "Admin token received: ${TOKEN:0:20}..."

# Test 1: Dashboard data endpoint
log "Testing dashboard data endpoint"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/dashboard/data" "$TOKEN")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Get dashboard data"

# Verify response contains expected fields
if echo "$body" | grep -q '"metrics24h"' && echo "$body" | grep -q '"latestMetrics"' && echo "$body" | grep -q '"recentRequests"'; then
  log "✅ Dashboard data contains expected fields"
else
  log "❌ Dashboard data missing expected fields: $body"
  exit 1
fi

# Test 2: 24h metrics endpoint
log "Testing 24h metrics endpoint"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/metrics/24h" "$TOKEN")
status="${resp: -3}"
check "$status" "200" "Get 24h metrics"

# Test 3: Latest metrics endpoint
log "Testing latest metrics endpoint"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/metrics/latest" "$TOKEN")
status="${resp: -3}"
check "$status" "200" "Get latest metrics"

# Test 4: Recent requests endpoint
log "Testing recent requests endpoint"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/requests/recent" "$TOKEN")
status="${resp: -3}"
check "$status" "200" "Get recent requests"

# Test 5: Recent requests with limit parameter
log "Testing recent requests with limit parameter"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/requests/recent?limit=10" "$TOKEN")
status="${resp: -3}"
check "$status" "200" "Get recent requests with limit"

# Test 6: Requests since timestamp
log "Testing requests since timestamp"
# Use cross-platform date command (works on both macOS and Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS/BSD date syntax
    since_time=$(date -u -v-1H +"%Y-%m-%dT%H:%M:%S")
else
    # Linux GNU date syntax
    since_time=$(date -u -d "1 hour ago" +"%Y-%m-%dT%H:%M:%S")
fi
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/requests/since?since=${since_time}" "$TOKEN")
status="${resp: -3}"
check "$status" "200" "Get requests since timestamp"

# Test 7: No authorization header (should fail)
log "Testing monitoring endpoints without authorization"
resp=$(request "GET" "$BASE_URL/api/monitoring/dashboard/data" "")
status="${resp: -3}"
check "$status" "403" "Dashboard data without auth should fail"

resp=$(request "GET" "$BASE_URL/api/monitoring/metrics/24h" "")
status="${resp: -3}"
check "$status" "403" "24h metrics without auth should fail"

resp=$(request "GET" "$BASE_URL/api/monitoring/metrics/latest" "")
status="${resp: -3}"
check "$status" "403" "Latest metrics without auth should fail"

resp=$(request "GET" "$BASE_URL/api/monitoring/requests/recent" "")
status="${resp: -3}"
check "$status" "403" "Recent requests without auth should fail"

# Test 8: Invalid authorization header
log "Testing monitoring endpoints with invalid authorization"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/dashboard/data" "invalid_token")
status="${resp: -3}"
check "$status" "403" "Dashboard data with invalid token should fail"

# Test 9: Non-admin user access (create regular user first)
log "Creating regular user for non-admin test"
TIMESTAMP=$(date +%s)
REGULAR_USER="regularuser_${TIMESTAMP}"
REGULAR_EMAIL="regular_${TIMESTAMP}@example.com"
REGULAR_PW="password123"

user_data="{\"username\":\"$REGULAR_USER\",\"email\":\"$REGULAR_EMAIL\",\"hashedPassword\":\"$REGULAR_PW\",\"isAdmin\":false}"
create_resp=$(request "POST" "$BASE_URL/api/users" "$user_data")
create_status="${create_resp: -3}"
check "$create_status" "201" "Create regular user"

# Login as regular user
regular_login="{\"usernameOrEmail\":\"$REGULAR_USER\",\"password\":\"$REGULAR_PW\"}"
regular_resp=$(request "POST" "$BASE_URL/api/login" "$regular_login")
regular_status="${regular_resp: -3}"
regular_body="${regular_resp%???}"
check "$regular_status" "200" "Regular user login"
REGULAR_TOKEN=$(echo "$regular_body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test regular user access to monitoring (should fail)
log "Testing monitoring endpoints with regular user token"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/dashboard/data" "$REGULAR_TOKEN")
status="${resp: -3}"
check "$status" "403" "Regular user access to dashboard data should fail"

resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/metrics/24h" "$REGULAR_TOKEN")
status="${resp: -3}"
check "$status" "403" "Regular user access to 24h metrics should fail"

# Test 10: Invalid timestamp format for requests/since
log "Testing requests since with invalid timestamp"
resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/requests/since?since=invalid_timestamp" "$TOKEN")
status="${resp: -3}"
check "$status" "500" "Invalid timestamp should return error"

# Cleanup: Delete the regular user
log "Cleaning up regular user"
user_response=$(curl -s "$BASE_URL/api/users/username/$REGULAR_USER")
USER_ID=$(echo "$user_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
if [[ -n "$USER_ID" ]]; then
  delete_resp=$(request "DELETE" "$BASE_URL/api/users/$USER_ID" "")
  delete_status="${delete_resp: -3}"
  check "$delete_status" "204" "Cleanup regular user"
fi

log "🎉 All monitoring API tests passed!"
exit 0 
