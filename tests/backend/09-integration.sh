#!/bin/bash

# Integration tests - complete user flows and cross-component interactions
# Tests full registration, authentication, user management, and monitoring workflows

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  source "$ROOT_DIR/.env"
fi
ADMIN_SECRET="${ADMIN_SECRET:-changeme}"
BASE_URL="http://localhost:8080"

log() { echo "[TEST] $*"; }

request() {
  local method=$1 url=$2 data=$3 headers=$4
  if [[ -n "$data" && -n "$headers" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" $headers -d "$data"
  elif [[ -n "$data" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
  elif [[ -n "$headers" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" $headers
  else
    curl -s -w "%{http_code}" -X "$method" "$url"
  fi
}

request_with_auth() {
  local method=$1 url=$2 token=$3 data=$4
  if [[ -n "$data" ]]; then
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data"
  else
    curl -s -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $token"
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

log "Starting comprehensive integration tests..."

TIMESTAMP=$(date +%s)
NEW_USER="integuser_${TIMESTAMP}"
NEW_EMAIL="integ_${TIMESTAMP}@example.com"
NEW_PASSWORD="integration123"
ADMIN_USER="testadmin"
ADMIN_PASSWORD="testpassword"

# Test 1: Complete registration flow
log "=== Testing complete registration flow ==="

# Step 1.1: Admin generates registration code
log "Admin generates registration code"
code_resp=$(curl -s -w "%{http_code}" -H "X-Admin-Secret: $ADMIN_SECRET" -X POST "$BASE_URL/api/admin/registration-codes/generate")
code_status="${code_resp: -3}"
code_body="${code_resp%???}"
check "$code_status" "200" "Admin generates registration code"

# Extract the code
REG_CODE=$(echo "$code_body" | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
if [[ -z "$REG_CODE" ]]; then
  log "❌ Failed to extract registration code from: $code_body"
  exit 1
fi
log "Registration code: $REG_CODE"

# Step 1.2: Admin lists active codes (should include our code)
log "Admin lists active codes"
list_resp=$(curl -s -w "%{http_code}" -H "X-Admin-Secret: $ADMIN_SECRET" -X GET "$BASE_URL/api/admin/registration-codes")
list_status="${list_resp: -3}"
list_body="${list_resp%???}"
check "$list_status" "200" "Admin lists active codes"

if echo "$list_body" | grep -q "$REG_CODE"; then
  log "✅ Registration code found in active codes list"
else
  log "❌ Registration code not found in list: $list_body"
  exit 1
fi

# Step 1.3: User registers with the code
log "User registers with valid code"
reg_payload="{\"username\":\"$NEW_USER\",\"email\":\"$NEW_EMAIL\",\"password\":\"$NEW_PASSWORD\",\"code\":\"$REG_CODE\"}"
reg_resp=$(request "POST" "$BASE_URL/api/register" "$reg_payload")
reg_status="${reg_resp: -3}"
reg_body="${reg_resp%???}"
check "$reg_status" "201" "User registration with valid code"

# Step 1.4: Verify code is consumed (should not be in active list)
log "Verify registration code is consumed"
list2_resp=$(curl -s -w "%{http_code}" -H "X-Admin-Secret: $ADMIN_SECRET" -X GET "$BASE_URL/api/admin/registration-codes")
list2_body="${list2_resp%???}"

if echo "$list2_body" | grep -q "$REG_CODE"; then
  log "❌ Registration code still active after use: $list2_body"
  exit 1
else
  log "✅ Registration code properly consumed"
fi

# Test 2: Complete authentication flow
log "=== Testing complete authentication flow ==="

# Step 2.1: User login with username
log "User login with username"
login_payload="{\"usernameOrEmail\":\"$NEW_USER\",\"password\":\"$NEW_PASSWORD\"}"
login_resp=$(request "POST" "$BASE_URL/api/login" "$login_payload")
login_status="${login_resp: -3}"
login_body="${login_resp%???}"
check "$login_status" "200" "User login with username"

# Extract user details and token
USER_TOKEN=$(echo "$login_body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$login_body" | grep -o '"id":[0-9]*' | cut -d':' -f2)
IS_ADMIN=$(echo "$login_body" | grep -o '"admin":[^,}]*' | cut -d':' -f2)

if [[ -z "$USER_TOKEN" || -z "$USER_ID" ]]; then
  log "❌ Failed to extract user token or ID from: $login_body"
  exit 1
fi

log "User logged in - ID: $USER_ID, Token: ${USER_TOKEN:0:20}..."

# Verify user is not admin
if [[ "$IS_ADMIN" == "false" ]]; then
  log "✅ User correctly identified as non-admin"
else
  log "❌ User incorrectly identified as admin: $IS_ADMIN"
  exit 1
fi

# Step 2.2: User login with email
log "User login with email"
email_login="{\"usernameOrEmail\":\"$NEW_EMAIL\",\"password\":\"$NEW_PASSWORD\"}"
email_resp=$(request "POST" "$BASE_URL/api/login" "$email_login")
email_status="${email_resp: -3}"
check "$email_status" "200" "User login with email"

# Test 3: User management flow
log "=== Testing user management flow ==="

# Step 3.1: Get user by various methods
log "Get user by ID"
user_resp=$(request "GET" "$BASE_URL/api/users/$USER_ID")
user_status="${user_resp: -3}"
user_body="${user_resp%???}"
check "$user_status" "200" "Get user by ID"

log "Get user by username"
username_resp=$(request "GET" "$BASE_URL/api/users/username/$NEW_USER")
username_status="${username_resp: -3}"
check "$username_status" "200" "Get user by username"

log "Get user by email"
email_resp=$(request "GET" "$BASE_URL/api/users/email/$NEW_EMAIL")
email_status="${email_resp: -3}"
check "$email_status" "200" "Get user by email"

# Step 3.2: Update user information
log "Update user information"
updated_user="{\"username\":\"updated_$NEW_USER\",\"email\":\"updated_$NEW_EMAIL\",\"hashedPassword\":\"$NEW_PASSWORD\"}"
update_resp=$(request "PUT" "$BASE_URL/api/users/$USER_ID" "$updated_user")
update_status="${update_resp: -3}"
check "$update_status" "200" "Update user information"

# Step 3.3: Verify updated information
log "Verify updated user information"
verify_resp=$(request "GET" "$BASE_URL/api/users/$USER_ID")
verify_body="${verify_resp%???}"

if echo "$verify_body" | grep -q "updated_$NEW_USER" && echo "$verify_body" | grep -q "updated_$NEW_EMAIL"; then
  log "✅ User information successfully updated"
else
  log "❌ User information not properly updated: $verify_body"
  exit 1
fi

# Test 4: Admin authentication and monitoring access
log "=== Testing admin authentication and monitoring ==="

# Step 4.1: Admin login
log "Admin login"
admin_login="{\"usernameOrEmail\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASSWORD\"}"
admin_resp=$(request "POST" "$BASE_URL/api/login" "$admin_login")
admin_status="${admin_resp: -3}"
admin_body="${admin_resp%???}"
check "$admin_status" "200" "Admin login"

ADMIN_TOKEN=$(echo "$admin_body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ADMIN_IS_ADMIN=$(echo "$admin_body" | grep -o '"admin":[^,}]*' | cut -d':' -f2)

if [[ -z "$ADMIN_TOKEN" ]]; then
  log "❌ Failed to extract admin token"
  exit 1
fi

# Verify admin status
if [[ "$ADMIN_IS_ADMIN" == "true" ]]; then
  log "✅ Admin correctly identified as admin"
else
  log "❌ Admin not identified as admin: $ADMIN_IS_ADMIN"
  exit 1
fi

log "Admin logged in - Token: ${ADMIN_TOKEN:0:20}..."

# Step 4.2: Admin accesses monitoring endpoints
log "Admin accesses monitoring dashboard data"
dashboard_resp=$(request_with_auth "GET" "$BASE_URL/api/monitoring/dashboard/data" "$ADMIN_TOKEN")
dashboard_status="${dashboard_resp: -3}"
dashboard_body="${dashboard_resp%???}"
check "$dashboard_status" "200" "Admin accesses monitoring dashboard"

# Verify dashboard data structure
if echo "$dashboard_body" | grep -q '"metrics24h"' && echo "$dashboard_body" | grep -q '"latestMetrics"' && echo "$dashboard_body" | grep -q '"recentRequests"'; then
  log "✅ Dashboard data contains expected fields"
else
  log "❌ Dashboard data structure invalid: $dashboard_body"
  exit 1
fi

# Step 4.3: Regular user tries to access monitoring (should fail)
log "Regular user attempts to access monitoring"
user_monitoring=$(request_with_auth "GET" "$BASE_URL/api/monitoring/dashboard/data" "$USER_TOKEN")
user_mon_status="${user_monitoring: -3}"
check "$user_mon_status" "403" "Regular user monitoring access should be denied"

# Test 5: Complete user lifecycle
log "=== Testing complete user lifecycle ==="

# Step 5.1: Create another user via API (admin function)
log "Admin creates user via API"
api_user_data="{\"username\":\"apiuser_$TIMESTAMP\",\"email\":\"apiuser_$TIMESTAMP@example.com\",\"hashedPassword\":\"apipassword123\",\"isAdmin\":false}"
create_resp=$(request "POST" "$BASE_URL/api/users" "$api_user_data")
create_status="${create_resp: -3}"
create_body="${create_resp%???}"
check "$create_status" "201" "Admin creates user via API"

API_USER_ID=$(echo "$create_body" | grep -o '"id":[0-9]*' | cut -d':' -f2)

# Step 5.2: Get all users (should include our users)
log "Get all users"
all_users_resp=$(request "GET" "$BASE_URL/api/users")
all_users_status="${all_users_resp: -3}"
all_users_body="${all_users_resp%???}"
check "$all_users_status" "200" "Get all users"

# Verify our users are in the list
if echo "$all_users_body" | grep -q "updated_$NEW_USER" && echo "$all_users_body" | grep -q "apiuser_$TIMESTAMP"; then
  log "✅ All created users found in users list"
else
  log "❌ Created users not found in users list"
  exit 1
fi

# Test 6: Error handling and edge cases in flow
log "=== Testing error handling in flows ==="

# Step 6.1: Try to register with used code (should fail)
log "Attempt registration with already used code"
duplicate_reg="{\"username\":\"duplicate_$NEW_USER\",\"email\":\"duplicate_$NEW_EMAIL\",\"password\":\"$NEW_PASSWORD\",\"code\":\"$REG_CODE\"}"
dup_resp=$(request "POST" "$BASE_URL/api/register" "$duplicate_reg")
dup_status="${dup_resp: -3}"
check "$dup_status" "400" "Registration with used code should fail"

# Step 6.2: Try to create duplicate user
log "Attempt to create duplicate user"
duplicate_user="{\"username\":\"updated_$NEW_USER\",\"email\":\"different@example.com\",\"hashedPassword\":\"password123\"}"
dup_user_resp=$(request "POST" "$BASE_URL/api/users" "$duplicate_user")
dup_user_status="${dup_user_resp: -3}"
check "$dup_user_status" "409" "Duplicate username should be rejected"

# Step 6.3: Try to login with wrong password
log "Attempt login with wrong password"
wrong_pass="{\"usernameOrEmail\":\"updated_$NEW_USER\",\"password\":\"wrongpassword\"}"
wrong_resp=$(request "POST" "$BASE_URL/api/login" "$wrong_pass")
wrong_status="${wrong_resp: -3}"
check "$wrong_status" "401" "Wrong password should be rejected"

# Test 7: Cleanup and verification
log "=== Testing cleanup and verification ==="

# Step 7.1: Delete the API-created user
log "Delete API-created user"
delete_api_resp=$(request "DELETE" "$BASE_URL/api/users/$API_USER_ID")
delete_api_status="${delete_api_resp: -3}"
check "$delete_api_status" "204" "Delete API-created user"

# Step 7.2: Verify user is deleted
log "Verify API user is deleted"
verify_del_resp=$(request "GET" "$BASE_URL/api/users/$API_USER_ID")
verify_del_status="${verify_del_resp: -3}"
check "$verify_del_status" "404" "Deleted user should not be found"

# Step 7.3: Delete the registered user
log "Delete registered user"
delete_reg_resp=$(request "DELETE" "$BASE_URL/api/users/$USER_ID")
delete_reg_status="${delete_reg_resp: -3}"
check "$delete_reg_status" "204" "Delete registered user"

# Step 7.4: Verify both users are gone from users list
log "Verify users are removed from system"
final_users_resp=$(request "GET" "$BASE_URL/api/users")
final_users_body="${final_users_resp%???}"

if echo "$final_users_body" | grep -q "updated_$NEW_USER" || echo "$final_users_body" | grep -q "apiuser_$TIMESTAMP"; then
  log "❌ Deleted users still appear in users list"
  exit 1
else
  log "✅ All test users properly removed from system"
fi

# Test 8: System health verification
log "=== Verifying system health after integration tests ==="

# Step 8.1: Health check
health_resp=$(request "GET" "$BASE_URL/actuator/health")
health_status="${health_resp: -3}"
health_body="${health_resp%???}"
check "$health_status" "200" "System health check"

if echo "$health_body" | grep -q '"status":"UP"'; then
  log "✅ System remains healthy after integration tests"
else
  log "❌ System health degraded: $health_body"
  exit 1
fi

# Step 8.2: Verify admin can still access monitoring
log "Verify admin monitoring access still works"
final_monitoring=$(request_with_auth "GET" "$BASE_URL/api/monitoring/metrics/latest" "$ADMIN_TOKEN")
final_mon_status="${final_monitoring: -3}"
check "$final_mon_status" "200" "Admin monitoring access after tests"

log "🎉 All comprehensive integration tests passed!"
log "✅ Tested: Registration flow, authentication, user management, admin functions, monitoring access, error handling, and cleanup"
exit 0 
