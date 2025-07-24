#!/bin/bash
set -uo pipefail # DO NOT CHANGE THIS LINE
# -----------------------------------------------------------------------------
# Purpose : CI-specific test runner that starts Spring Boot with Maven 
#           directly and runs tests against external MySQL service.
# -----------------------------------------------------------------------------
# Optimized for CI/CD environments where MySQL runs as a service container
# and we don't need Docker Compose.
# -----------------------------------------------------------------------------

# Resolve project root so the script can be called from anywhere
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "# LOGS FOR CI TESTING" >> latest.log
# --------------------------------------------------------------------------------------
# Helper logging function
# --------------------------------------------------------------------------------------
log() {
  echo -e "[$(date '+%H:%M:%S')] $*" >> latest.log
}

# --------------------------------------------------------------------------------------
# Configuration (can be overridden via env-vars)
# --------------------------------------------------------------------------------------
SERVER_URL="${SERVER_URL:-http://localhost:8080/actuator/health}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-120}"
STOP_ON_ERROR="${STOP_ON_ERROR:-true}"

# Global variables for process tracking
MAVEN_PID=""
INTERRUPTED=false

# --------------------------------------------------------------------------------------
# Signal handlers
# --------------------------------------------------------------------------------------
cleanup_and_exit() {
  INTERRUPTED=true
  log "Interrupt received - cleaning up..."
  
  # Stop Spring Boot process
  stop_server
  
  log "Cleanup complete - exiting"
}

# --------------------------------------------------------------------------------------
# Spring Boot application handling
# --------------------------------------------------------------------------------------
start_server() {
  if [[ "$INTERRUPTED" == "true" ]]; then
    return 1
  fi
  
  log "🚀 Starting CI test pipeline..."
  log "Environment: CI=${CI:-false}, GITHUB_ACTIONS=${GITHUB_ACTIONS:-false}"
  
  # Check Java version
  log "Java version: $(java -version 2>&1 | head -n 1)"
  
  # Check Maven version  
  log "Maven version: $(mvn --version | head -n 1)"
  
  # Change to backend directory
  pushd "$ROOT_DIR/backend" >/dev/null
  
  log "Starting Spring Boot application directly for CI..."
  
  # Start Spring Boot in background and capture PID
  mvn spring-boot:run > ../backend.log 2>&1 &
  MAVEN_PID=$!
  
  popd >/dev/null
  
  log "Spring Boot started with PID: $MAVEN_PID"
  log "Waiting for server to start at $SERVER_URL (max ${MAX_WAIT_SECONDS}s)..."
  
  local waited=0
  until curl --silent --fail "$SERVER_URL" >/dev/null 2>&1; do
    if [[ "$INTERRUPTED" == "true" ]]; then
      return 1
    fi
    
    # Check if Maven process is still running
    if ! kill -0 "$MAVEN_PID" 2>/dev/null; then
      log "❌ Spring Boot process died unexpectedly"
      log "Backend logs:"
      tail -20 "$ROOT_DIR/backend.log" | while read line; do log "  $line"; done
      return 1
    fi
    
    sleep 2
    ((waited += 2))
    if (( waited >= MAX_WAIT_SECONDS )); then
      log "❌ Server failed to start within ${MAX_WAIT_SECONDS}s – aborting."
      log "Backend logs:"
      tail -20 "$ROOT_DIR/backend.log" | while read line; do log "  $line"; done
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
  if [[ -n "$MAVEN_PID" ]]; then
    log "Stopping Spring Boot application (PID: $MAVEN_PID)..."
    
    # Send SIGTERM first
    kill "$MAVEN_PID" 2>/dev/null || true
    
    # Wait up to 10 seconds for graceful shutdown
    local waited=0
    while kill -0 "$MAVEN_PID" 2>/dev/null && (( waited < 10 )); do
      sleep 1
      ((waited++))
    done
    
    # Force kill if still running
    if kill -0 "$MAVEN_PID" 2>/dev/null; then
      log "Force killing Spring Boot application..."
      kill -9 "$MAVEN_PID" 2>/dev/null || true
    fi
    
    MAVEN_PID=""
    log "Spring Boot application stopped"
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
  
  log "🧪 Running tests..."
  
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
  log "TEST SUMMARY:"
  log "TESTS PASSED: $tests_passed"
  log "TESTS FAILED: $tests_failed"
  log "TOTAL TESTS:  $total_tests"
  log "PERCENTILE:   ${percentage}%"
  log "============================================================"
  
  return $overall_rc
}

# --------------------------------------------------------------------------------------
# Main execution logic
# --------------------------------------------------------------------------------------
main() {
  # Start the server
  if ! start_server; then
    log "❌ Failed to start server"
    return 1
  fi
  
  # Run tests
  local test_rc=0
  run_tests || test_rc=$?
  
  # Stop the server
  stop_server
  
  if [[ $test_rc -eq 0 ]]; then
    log "🎉 All tests passed!"
  else
    log "❌ Some tests failed (exit code: $test_rc)"
  fi
  
  return $test_rc
}

main "$@"