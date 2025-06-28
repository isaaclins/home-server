#!/bin/bash

# Health and utility endpoints tests
# Tests root endpoint, simple health endpoint, and Spring actuator health

BASE_URL="http://localhost:8080"

log() { echo "[TEST] $*"; }

request() {
  local method=$1 url=$2
  curl -s -w "%{http_code}" -X "$method" "$url"
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

log "Testing health and utility endpoints..."

# Test 1: Root endpoint
log "Testing root endpoint"
resp=$(request "GET" "$BASE_URL/")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Root endpoint should return 200"

# Verify root endpoint response structure
if echo "$body" | grep -q '"message"' && echo "$body" | grep -q '"timestamp"' && echo "$body" | grep -q '"endpoints"'; then
  log "✅ Root endpoint contains expected fields"
else
  log "❌ Root endpoint missing expected fields: $body"
  exit 1
fi

# Verify specific endpoints are listed
if echo "$body" | grep -q '"users"' && echo "$body" | grep -q '"health"'; then
  log "✅ Root endpoint lists expected API endpoints"
else
  log "❌ Root endpoint missing expected API endpoints: $body"
  exit 1
fi

# Test 2: Simple health endpoint
log "Testing simple health endpoint"
resp=$(request "GET" "$BASE_URL/health")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Simple health endpoint should return 200"

# Verify simple health response structure
if echo "$body" | grep -q '"status"' && echo "$body" | grep -q '"timestamp"'; then
  log "✅ Simple health endpoint contains expected fields"
else
  log "❌ Simple health endpoint missing expected fields: $body"
  exit 1
fi

# Verify health status is UP
if echo "$body" | grep -q '"status":"UP"'; then
  log "✅ Simple health endpoint reports UP status"
else
  log "❌ Simple health endpoint does not report UP status: $body"
  exit 1
fi

# Test 3: Spring Actuator health endpoint
log "Testing Spring Actuator health endpoint"
resp=$(request "GET" "$BASE_URL/actuator/health")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Actuator health endpoint should return 200"

# Verify actuator health response structure
if echo "$body" | grep -q '"status"' && echo "$body" | grep -q '"components"'; then
  log "✅ Actuator health endpoint contains expected fields"
else
  log "❌ Actuator health endpoint missing expected fields: $body"
  exit 1
fi

# Verify overall status is UP
if echo "$body" | grep -q '"status":"UP"'; then
  log "✅ Actuator health endpoint reports UP status"
else
  log "❌ Actuator health endpoint does not report UP status: $body"
  exit 1
fi

# Verify expected components are present
if echo "$body" | grep -q '"db"' && echo "$body" | grep -q '"diskSpace"' && echo "$body" | grep -q '"ping"'; then
  log "✅ Actuator health endpoint contains expected components"
else
  log "❌ Actuator health endpoint missing expected components: $body"
  exit 1
fi

# Test 4: Health endpoints with different HTTP methods
log "Testing health endpoints with different HTTP methods"

# HEAD request to root
resp=$(request "HEAD" "$BASE_URL/")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "405" ]]; then
  log "✅ HEAD request to root handled appropriately (status $status)"
else
  log "❌ Unexpected response to HEAD request on root: $status"
  exit 1
fi

# OPTIONS request to health endpoint
resp=$(request "OPTIONS" "$BASE_URL/health")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "405" ]]; then
  log "✅ OPTIONS request to health handled appropriately (status $status)"
else
  log "❌ Unexpected response to OPTIONS request on health: $status"
  exit 1
fi

# POST request to health endpoint (should not be allowed)
resp=$(request "POST" "$BASE_URL/health")
status="${resp: -3}"
check "$status" "405" "POST request to health should return 405"

# Test 5: Test with trailing slashes
log "Testing endpoints with trailing slashes"

resp=$(request "GET" "$BASE_URL/health/")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "404" ]]; then
  log "✅ Health endpoint with trailing slash handled appropriately (status $status)"
else
  log "❌ Unexpected response to health endpoint with trailing slash: $status"
  exit 1
fi

# Test 6: Case sensitivity
log "Testing case sensitivity"

resp=$(request "GET" "$BASE_URL/HEALTH")
status="${resp: -3}"
check "$status" "404" "Uppercase health endpoint should return 404"

resp=$(request "GET" "$BASE_URL/Health")
status="${resp: -3}"
check "$status" "404" "Mixed case health endpoint should return 404"

# Test 7: Non-existent endpoints
log "Testing non-existent endpoints"

resp=$(request "GET" "$BASE_URL/nonexistent")
status="${resp: -3}"
check "$status" "404" "Non-existent endpoint should return 404"

resp=$(request "GET" "$BASE_URL/api/nonexistent")
status="${resp: -3}"
check "$status" "404" "Non-existent API endpoint should return 404"

# Test 8: Malformed URLs
log "Testing malformed URLs"

resp=$(request "GET" "$BASE_URL//")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "404" ]]; then
  log "✅ Double slash URL handled appropriately (status $status)"
else
  log "❌ Unexpected response to double slash URL: $status"
  exit 1
fi

resp=$(request "GET" "$BASE_URL/./health")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "404" ]]; then
  log "✅ URL with dot handled appropriately (status $status)"
else
  log "❌ Unexpected response to URL with dot: $status"
  exit 1
fi

# Test 9: Response headers
log "Testing response headers"

headers=$(curl -s -I "$BASE_URL/health" | tr '\r' '\n')
if echo "$headers" | grep -qi "content-type"; then
  log "✅ Health endpoint returns Content-Type header"
else
  log "❌ Health endpoint missing Content-Type header"
  exit 1
fi

# Test 10: Response time (basic performance test)
log "Testing response time"

start_time=$(date +%s.%N)
resp=$(request "GET" "$BASE_URL/health")
end_time=$(date +%s.%N)
status="${resp: -3}"

response_time=$(echo "$end_time - $start_time" | bc)
response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)

check "$status" "200" "Health endpoint performance test"

if [[ $response_time_ms -lt 5000 ]]; then  # Less than 5 seconds
  log "✅ Health endpoint responds within acceptable time (${response_time_ms}ms)"
else
  log "⚠️  Health endpoint response time is slow (${response_time_ms}ms)"
fi

log "🎉 All health and utility endpoint tests passed!"
exit 0 
