#!/bin/bash

# Test script for backend CRUD operations
# Tests all user management endpoints

BASE_URL="http://localhost:8080"

# Generate unique identifiers to avoid conflicts
TIMESTAMP=$(date +%s)
UNIQUE_USER="testuser_${TIMESTAMP}"
UNIQUE_EMAIL="test_${TIMESTAMP}@example.com"

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
log "Starting CRUD API tests with unique data..."
log "Using username: $UNIQUE_USER, email: $UNIQUE_EMAIL"

# Test 1: Health check
test_request "GET" "$BASE_URL/actuator/health" "" "200" "Health check"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 2: Get all users
test_request "GET" "$BASE_URL/api/users" "" "200" "Get all users"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 3: Create a new user with unique data
user_data="{\"username\":\"$UNIQUE_USER\",\"email\":\"$UNIQUE_EMAIL\",\"hashedPassword\":\"password123\"}"
test_request "POST" "$BASE_URL/api/users" "$user_data" "201" "Create new user"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 4: Get all users (should have more users now)
test_request "GET" "$BASE_URL/api/users" "" "200" "Get all users (with data)"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 5: Get the created user by username
test_request "GET" "$BASE_URL/api/users/username/$UNIQUE_USER" "" "200" "Get user by username"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 6: Get user by email
test_request "GET" "$BASE_URL/api/users/email/$UNIQUE_EMAIL" "" "200" "Get user by email"
if [[ $? -ne 0 ]]; then exit 1; fi

# Extract user ID from the response to use in subsequent tests
user_response=$(curl -s "$BASE_URL/api/users/username/$UNIQUE_USER")
USER_ID=$(echo "$user_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [[ -z "$USER_ID" ]]; then
  log "❌ Could not extract user ID from response"
  exit 1
fi

log "Extracted user ID: $USER_ID"

# Test 7: Get user by ID
test_request "GET" "$BASE_URL/api/users/$USER_ID" "" "200" "Get user by ID"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 8: Update user
updated_user_data="{\"username\":\"updated_${UNIQUE_USER}\",\"email\":\"updated_${UNIQUE_EMAIL}\",\"hashedPassword\":\"newpassword123\"}"
test_request "PUT" "$BASE_URL/api/users/$USER_ID" "$updated_user_data" "200" "Update user"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 9: Try to create duplicate user (should fail with 409)
duplicate_user_data="{\"username\":\"updated_${UNIQUE_USER}\",\"email\":\"different_${UNIQUE_EMAIL}\",\"hashedPassword\":\"password123\"}"
test_request "POST" "$BASE_URL/api/users" "$duplicate_user_data" "409" "Create duplicate username (should fail)"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 10: Try to create user with duplicate email (should fail with 409)
duplicate_email_data="{\"username\":\"different_${UNIQUE_USER}\",\"email\":\"updated_${UNIQUE_EMAIL}\",\"hashedPassword\":\"password123\"}"
test_request "POST" "$BASE_URL/api/users" "$duplicate_email_data" "409" "Create duplicate email (should fail)"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 11: Try to get non-existent user (should return 404)
test_request "GET" "$BASE_URL/api/users/999999" "" "404" "Get non-existent user (should fail)"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 12: Delete user
test_request "DELETE" "$BASE_URL/api/users/$USER_ID" "" "204" "Delete user"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 13: Try to get deleted user (should return 404)
test_request "GET" "$BASE_URL/api/users/$USER_ID" "" "404" "Get deleted user (should fail)"
if [[ $? -ne 0 ]]; then exit 1; fi

# Test 14: Try to delete non-existent user (should return 404)
test_request "DELETE" "$BASE_URL/api/users/999999" "" "404" "Delete non-existent user (should fail)"
if [[ $? -ne 0 ]]; then exit 1; fi

log "🎉 All CRUD API tests passed!"
exit 0
