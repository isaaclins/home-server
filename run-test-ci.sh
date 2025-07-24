#!/bin/bash
set -uo pipefail # DO NOT CHANGE THIS LINE
# -----------------------------------------------------------------------------
# Purpose : Start the backend server directly (without Docker), execute test  
#           scripts, and stop the server again – for CI/CD environments.                               
# -----------------------------------------------------------------------------
# Behaviour can be tuned via environment variables:                              
#   STOP_ON_ERROR   – if "true" (default) abort after first failing test.       
#   SERVER_URL      – health-check endpoint (default http://localhost:8080/actuator/health).
#   MAX_WAIT_SECONDS– max seconds to wait for the server to become healthy (120). 
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# UN/COMMENT THESE VARIABLES TO CHANGE THE BEHAVIOUR
# -----------------------------------------------------------------------------
#STOP_ON_ERROR="${STOP_ON_ERROR:-false}"
STOP_ON_ERROR="${STOP_ON_ERROR:-true}"

# Resolve project root so the script can be called from anywhere
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# --------------------------------------------------------------------------------------
# Configuration (can be overridden via env-vars)
# --------------------------------------------------------------------------------------
SERVER_URL="${SERVER_URL:-http://localhost:8080/actuator/health}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-120}"  # Longer timeout for CI
MAX_SERVER_RETRIES="${MAX_SERVER_RETRIES:-3}"

# Global variables for process tracking
BACKEND_PID=""
INTERRUPTED=false

# --------------------------------------------------------------------------------------
# Helper logging function
# --------------------------------------------------------------------------------------
log() {
  echo -e "[$(date '+%H:%M:%S')] $*"
}

# --------------------------------------------------------------------------------------
# Signal handlers
# --------------------------------------------------------------------------------------
cleanup_and_exit() {
  INTERRUPTED=true
  log "Interrupt received - cleaning up..."
  
  # Stop backend server
  stop_server
  
  log "Cleanup complete - exiting"
}

# --------------------------------------------------------------------------------------
# Backend server handling (Maven/Java directly)
# --------------------------------------------------------------------------------------
start_server() {
  if [[ "$INTERRUPTED" == "true" ]]; then
    return 1
  fi
  
  log "Starting Spring Boot application directly for CI..."
  
  # Ensure we're in the backend directory
  pushd "$ROOT_DIR/backend" >/dev/null
  
  # Set env vars for initial admin user during CI
  export INITIAL_ADMIN_USERNAME="testadmin"
  export INITIAL_ADMIN_EMAIL="testadmin@example.com"
  export INITIAL_ADMIN_PASSWORD="testpassword"
  export ADMIN_SECRET="ci_admin_secret"
  
  # Start Spring Boot application in background
  log "Starting Spring Boot with Maven..."
  mvn spring-boot:run > ../backend.log 2>&1 &
  BACKEND_PID=$!
  
  popd >/dev/null
  
  log "Backend started with PID: $BACKEND_PID"
  log "Waiting for server to start at $SERVER_URL (max ${MAX_WAIT_SECONDS}s)..."
  
  local waited=0
  until curl --silent --fail "$SERVER_URL" >/dev/null 2>&1; do
    if [[ "$INTERRUPTED" == "true" ]]; then
      return 1
    fi
    
    # Check if process is still running
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      log "❌ Backend process died unexpectedly!"
      log "Last few lines of backend.log:"
      tail -20 "$ROOT_DIR/backend.log" || true
      return 1
    fi
    
    sleep 2
    ((waited += 2))
    if (( waited >= MAX_WAIT_SECONDS )); then
      log "Server failed to start within ${MAX_WAIT_SECONDS}s – aborting."
      log "Backend log contents:"
      cat "$ROOT_DIR/backend.log" || true
      return 1
    fi
    
    # Show progress every 10 seconds
    if (( waited % 10 == 0 )); then
      log "Still waiting... (${waited}s elapsed)"
    fi
  done
  
  log "✅ Server up and responding!"
}

stop_server() {
  if [[ -n "$BACKEND_PID" ]]; then
    log "Stopping backend server (PID: $BACKEND_PID)..."
    
    # Try graceful shutdown first
    kill "$BACKEND_PID" 2>/dev/null || true
    
    # Wait a few seconds for graceful shutdown
    for i in {1..10}; do
      if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        log "Backend stopped gracefully"
        BACKEND_PID=""
        return 0
      fi
      sleep 1
    done
    
    # Force kill if still running
    log "Force killing backend process..."
    kill -9 "$BACKEND_PID" 2>/dev/null || true
    BACKEND_PID=""
    log "Backend stopped"
  fi
}

# Set up signal traps
trap cleanup_and_exit EXIT INT TERM

# --------------------------------------------------------------------------------------
# Test runner
# --------------------------------------------------------------------------------------
run_tests() {
  local overall_rc=0
  local tests_passed=0
  local tests_failed=0
  local total_tests=0
  
  # Find all .sh files recursively in the tests directory
  while IFS= read -r -d '' test; do
    log "------------------------------------------------------------"
    log "Running $test"

    # Execute test in a subshell and capture its exit code
    local test_rc=0
    (bash "$test") || test_rc=$?
    ((total_tests++))

    if [[ $test_rc -ne 0 ]]; then
      log "🚫 TEST FAILED: $test (exit code $test_rc)"
      ((tests_failed++))
      overall_rc=$test_rc  # Remember that at least one test failed
      if [[ "$STOP_ON_ERROR" == "true" ]]; then
        return $test_rc
      fi
    else
      log "✅ TEST PASSED: $test"
      ((tests_passed++))
    fi
    log "------------------------------------------------------------"

  done < <(find "$ROOT_DIR/tests" -name "*.sh" -type f -print0 | sort -z)
  
  # Calculate percentage
  local percentage=0
  if [[ $total_tests -gt 0 ]]; then
    percentage=$((tests_passed * 100 / total_tests))
  fi
  
  # Print summary
  log "============================================================"
  log "CI TEST SUMMARY:"
  log "TESTS PASSED: $tests_passed"
  log "TESTS FAILED: $tests_failed"
  log "TOTAL TESTS:  $total_tests"
  log "PERCENTILE:   ${percentage}%"
  log "============================================================"
  
  return $overall_rc
}

# --------------------------------------------------------------------------------------
# Main control flow
# --------------------------------------------------------------------------------------
main() {
  log "🚀 Starting CI test pipeline..."
  log "Environment: CI=${CI_ENVIRONMENT:-false}"
  log "Java version: $(java -version 2>&1 | head -1)"
  log "Maven version: $(mvn --version 2>&1 | head -1)"
  
  if [[ "$STOP_ON_ERROR" == "true" ]]; then
    # STOP_ON_ERROR=true: Run tests once, stop on first failure
    local server_retries=0
    
    # Try to start server with retry limit
    while ! start_server; do
      if [[ "$INTERRUPTED" == "true" ]]; then
        return 1
      fi
      ((server_retries++))
      if (( server_retries >= MAX_SERVER_RETRIES )); then
        log "Server failed to start after $MAX_SERVER_RETRIES attempts – giving up."
        return 1
      fi
      log "Server failed to start – retrying in 5s ... (attempt $server_retries/$MAX_SERVER_RETRIES)"
      stop_server  # Clean up before retry
      sleep 5
    done
    
    # Server started successfully, run tests once and stop on first failure
    run_tests
    local test_rc=$?
    stop_server
    return $test_rc
  else
    # STOP_ON_ERROR=false: Run tests once, continue through all failures, always return 0
    local server_retries=0
    
    # Try to start server with retry limit
    while ! start_server; do
      if [[ "$INTERRUPTED" == "true" ]]; then
        return 1
      fi
      ((server_retries++))
      if (( server_retries >= MAX_SERVER_RETRIES )); then
        log "Server failed to start after $MAX_SERVER_RETRIES attempts – giving up."
        return 1
      fi
      log "Server failed to start – retrying in 5s ... (attempt $server_retries/$MAX_SERVER_RETRIES)"
      stop_server  # Clean up before retry
      sleep 5
    done
    
    # Server started successfully, run all tests once
    run_tests  # Don't care about exit code when STOP_ON_ERROR=false
    local test_rc=$?
    stop_server
    
    # When STOP_ON_ERROR=false, always return 0 (success) for CI
    log "STOP_ON_ERROR=false: Completed all tests regardless of individual failures."
    return 0
  fi
}

main "$@" 
