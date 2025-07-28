#!/bin/bash

# Test script for backend edge cases and error handling
# Tests malformed requests, invalid data, and error scenarios

BASE_URL="http://localhost:8080"

# Helper function for logging
log() {
  echo "[TEST] $*"
}

# Helper function for making HTTP requests and checking response
test_request() {
  local method=$1
  local url=$2
  local data=$3
  local expected_status=$4
  local description=$5
  
  log "Testing $description"
  
  if [[ -n "$data" ]]; then
    response=$(curl -s -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    response=$(curl -s -w "%{http_code}" -X "$method" "$url")
  fi
  
  # Extract status code (last 3 characters)
  status_code="${response: -3}"
  # Extract response body (everything except last 3 characters)
  body="${response%???}"
  
  if [[ "$status_code" == "$expected_status" ]]; then
    log "✅ $description - Status: $status_code"
    return 0
  else
    log "❌ $description - Expected: $expected_status, Got: $status_code"
    log "Response body: $body"
    return 1
  fi
}

# Start testing
log "Starting edge case tests..."

# Test 1: Malformed JSON in request body
test_request "POST" "$BASE_URL/api/users" "invalid json" "400" "Malformed JSON request"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 2: Missing required fields
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"test\"}" "400" "Missing required fields"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 3: Invalid email format
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"testuser\",\"email\":\"invalid-email\",\"hashedPassword\":\"password123\"}" "400" "Invalid email format"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 4: Empty username
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"\",\"email\":\"test@example.com\",\"hashedPassword\":\"password123\"}" "400" "Empty username"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 5: Username with special characters (should be allowed but test edge case)
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"test@user#123\",\"email\":\"test@example.com\",\"hashedPassword\":\"password123\"}" "201" "Username with special characters"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 6: Very long username (test limits)
long_username=$(printf 'a%.0s' {1..100})
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"$long_username\",\"email\":\"long@example.com\",\"hashedPassword\":\"password123\"}" "400" "Very long username"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 7: Very long email (test limits)
long_email="$(printf 'a%.0s' {1..200})@example.com"
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"testuser2\",\"email\":\"$long_email\",\"hashedPassword\":\"password123\"}" "400" "Very long email"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 8: SQL injection attempt (should be sanitized)
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"test'; DROP TABLE users; --\",\"email\":\"sql@example.com\",\"hashedPassword\":\"password123\"}" "201" "SQL injection attempt in username"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 9: XSS attempt (should be sanitized)
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"<script>alert('xss')</script>\",\"email\":\"xss@example.com\",\"hashedPassword\":\"password123\"}" "201" "XSS attempt in username"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 10: Invalid HTTP method
test_request "PATCH" "$BASE_URL/api/users" "" "405" "Invalid HTTP method"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 11: Non-existent endpoint
test_request "GET" "$BASE_URL/api/nonexistent" "" "404" "Non-existent endpoint"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 12: Invalid user ID format
test_request "GET" "$BASE_URL/api/users/invalid-id" "" "400" "Invalid user ID format"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 13: Negative user ID
test_request "GET" "$BASE_URL/api/users/-1" "" "400" "Negative user ID"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 14: Very large user ID
test_request "GET" "$BASE_URL/api/users/999999999999999999" "" "404" "Very large user ID"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 15: Empty request body for POST
test_request "POST" "$BASE_URL/api/users" "" "400" "Empty request body"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 16: Null values in JSON
test_request "POST" "$BASE_URL/api/users" "{\"username\":null,\"email\":null,\"hashedPassword\":null}" "400" "Null values in JSON"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 17: Unicode characters in username
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"测试用户\",\"email\":\"unicode@example.com\",\"hashedPassword\":\"password123\"}" "201" "Unicode characters in username"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 18: Unicode characters in email
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"testuser3\",\"email\":\"测试@example.com\",\"hashedPassword\":\"password123\"}" "400" "Unicode characters in email (should fail)"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 19: Whitespace-only username
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"   \",\"email\":\"whitespace@example.com\",\"hashedPassword\":\"password123\"}" "400" "Whitespace-only username"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 20: Whitespace-only email
test_request "POST" "$BASE_URL/api/users" "{\"username\":\"testuser4\",\"email\":\"   \",\"hashedPassword\":\"password123\"}" "400" "Whitespace-only email"
if [[ $? -ne 0 ]]; then exit 1; fi

log "🎉 All edge case tests passed!"
exit 0 