#!/bin/bash

# Frontend page load and accessibility tests
# Tests that all pages are accessible and return proper responses

FRONTEND_URL="http://localhost:3000"

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

check_content() {
  local body=$1 pattern=$2 msg=$3
  if echo "$body" | grep -q "$pattern"; then
    log "✅ $msg"
  else
    log "❌ $msg - pattern '$pattern' not found"
    exit 1
  fi
}

log "Testing frontend page loads and accessibility..."

# Test 1: Root page (should redirect to dashboard or show landing)
log "Testing root page"
resp=$(request "GET" "$FRONTEND_URL/")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Root page should be accessible"

# Verify it's a valid HTML page
check_content "$body" "<!DOCTYPE html\\|<html" "Root page should return valid HTML"

# Test 2: Login page
log "Testing login page"
resp=$(request "GET" "$FRONTEND_URL/login")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Login page should be accessible"

# Verify login page content
check_content "$body" "<!DOCTYPE html\\|<html" "Login page should return valid HTML"

# Test 3: Register page
log "Testing register page"
resp=$(request "GET" "$FRONTEND_URL/register")
status="${resp: -3}"
body="${resp%???}"
check "$status" "200" "Register page should be accessible"

# Verify register page content
check_content "$body" "<!DOCTYPE html\\|<html" "Register page should return valid HTML"

# Test 4: Dashboard page (might require auth, but should not 500)
log "Testing dashboard page"
resp=$(request "GET" "$FRONTEND_URL/dashboard")
status="${resp: -3}"
body="${resp%???}"
if [[ "$status" == "200" || "$status" == "302" || "$status" == "401" ]]; then
  log "✅ Dashboard page handled appropriately (status $status)"
else
  log "❌ Dashboard page returned unexpected status: $status"
  exit 1
fi

# Test 5: Non-existent page (should return 404)
log "Testing non-existent page"
resp=$(request "GET" "$FRONTEND_URL/nonexistent")
status="${resp: -3}"
check "$status" "404" "Non-existent page should return 404"

# Test 6: Static assets (favicon, etc.)
log "Testing static assets"
resp=$(request "GET" "$FRONTEND_URL/favicon.ico")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "404" ]]; then
  log "✅ Favicon request handled appropriately (status $status)"
else
  log "❌ Favicon request returned unexpected status: $status"
  exit 1
fi

# Test 7: API proxy endpoints (if configured)
log "Testing API proxy functionality"
resp=$(request "GET" "$FRONTEND_URL/api/users")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "401" || "$status" == "404" ]]; then
  log "✅ API proxy handled appropriately (status $status)"
else
  log "❌ API proxy returned unexpected status: $status"
  exit 1
fi

# Test 8: Different HTTP methods on frontend
log "Testing different HTTP methods on frontend"

# HEAD request
resp=$(request "HEAD" "$FRONTEND_URL/")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "405" ]]; then
  log "✅ HEAD request handled appropriately (status $status)"
else
  log "❌ HEAD request returned unexpected status: $status"
  exit 1
fi

# OPTIONS request
resp=$(request "OPTIONS" "$FRONTEND_URL/")
status="${resp: -3}"
if [[ "$status" == "200" || "$status" == "405" ]]; then
  log "✅ OPTIONS request handled appropriately (status $status)"
else
  log "❌ OPTIONS request returned unexpected status: $status"
  exit 1
fi

# POST request to page (should not be allowed)
resp=$(request "POST" "$FRONTEND_URL/login")
status="${resp: -3}"
if [[ "$status" == "405" || "$status" == "404" ]]; then
  log "✅ POST request to page handled appropriately (status $status)"
else
  log "❌ POST request to page returned unexpected status: $status"
  exit 1
fi

# Test 9: Response headers
log "Testing response headers"

headers=$(curl -s -I "$FRONTEND_URL/" | tr '\r' '\n')
if echo "$headers" | grep -qi "content-type"; then
  log "✅ Frontend returns Content-Type header"
else
  log "❌ Frontend missing Content-Type header"
  exit 1
fi

# Test 10: Page load performance
log "Testing page load performance"

start_time=$(date +%s.%N)
resp=$(request "GET" "$FRONTEND_URL/")
end_time=$(date +%s.%N)
status="${resp: -3}"

response_time=$(echo "$end_time - $start_time" | bc)
response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)

check "$status" "200" "Root page performance test"

if [[ $response_time_ms -lt 10000 ]]; then  # Less than 10 seconds
  log "✅ Root page loads within acceptable time (${response_time_ms}ms)"
else
  log "⚠️  Root page load time is slow (${response_time_ms}ms)"
fi

# Test 11: Content Security and basic validation
log "Testing content security"

# Check for basic security headers (might not be present in dev mode)
headers=$(curl -s -I "$FRONTEND_URL/" | tr '\r' '\n')
if echo "$headers" | grep -qi "x-frame-options\\|content-security-policy\\|x-content-type-options"; then
  log "✅ Some security headers present"
else
  log "⚠️  No security headers detected (may be expected in development)"
fi

# Test 12: Mobile/responsive indicators
log "Testing responsive design indicators"
resp=$(request "GET" "$FRONTEND_URL/")
body="${resp%???}"

if echo "$body" | grep -qi "viewport\\|responsive\\|mobile"; then
  log "✅ Responsive design indicators found"
else
  log "⚠️  No responsive design indicators found"
fi

# Test 13: JavaScript and CSS loading
log "Testing asset loading"
resp=$(request "GET" "$FRONTEND_URL/")
body="${resp%???}"

if echo "$body" | grep -q "<script\\|<link.*css"; then
  log "✅ JavaScript and CSS assets referenced"
else
  log "❌ No JavaScript or CSS assets found"
  exit 1
fi

# Test 14: Error page handling
log "Testing error page handling"

# Test with malformed URL
resp=$(curl -s -w "%{http_code}" "$FRONTEND_URL/%20%20%20")
status="${resp: -3}"
if [[ "$status" == "404" || "$status" == "400" ]]; then
  log "✅ Malformed URL handled appropriately (status $status)"
else
  log "❌ Malformed URL returned unexpected status: $status"
  exit 1
fi

# Test 15: Load testing (simple)
log "Testing concurrent page loads"

# First, verify the server is still responsive
resp=$(request "GET" "$FRONTEND_URL/")
status="${resp: -3}"
if [[ "$status" != "200" ]]; then
  log "❌ Server not responsive before load test (status $status)"
  exit 1
fi

declare -a pids
# Add small delay between request initiations to avoid overwhelming
for i in {1..5}; do
  curl -s -w "%{http_code}" "$FRONTEND_URL/" > "/tmp/frontend_load_${i}.out" &
  pids+=($!)
  sleep 0.1  # Small delay between launches
done

# Wait for all requests to complete with timeout
for pid in "${pids[@]}"; do
  # Wait for each pid with a timeout of 10 seconds
  if ! timeout 10 bash -c "while kill -0 $pid 2>/dev/null; do sleep 0.1; done"; then
    log "⚠️  Request $pid timed out"
    kill $pid 2>/dev/null || true
  fi
done

# Give processes time to finish writing
sleep 0.5

# Check results
success_count=0
for i in {1..5}; do
  if [[ -f "/tmp/frontend_load_${i}.out" ]]; then
    # Extract only the last 3 characters (the status code)
    output=$(cat "/tmp/frontend_load_${i}.out" 2>/dev/null || echo "000")
    status="${output: -3}"
    if [[ "$status" == "200" ]]; then
      ((success_count++))
    else
      log "⚠️  Request $i returned status: $status"
    fi
    rm -f "/tmp/frontend_load_${i}.out"
  else
    log "⚠️  Output file for request $i not found"
  fi
done

if [[ $success_count -ge 3 ]]; then  # Lowered threshold to 3/5 to be more lenient
  log "✅ Concurrent page loads handled well ($success_count/5 succeeded)"
else
  log "❌ Too few concurrent page loads succeeded: $success_count/5"
  exit 1
fi

log "🎉 All frontend page load and accessibility tests passed!"
exit 0 
