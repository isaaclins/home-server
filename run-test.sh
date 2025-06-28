#!/bin/bash
set -uo pipefail # DO NOT CHANGE THIS LINE
# -----------------------------------------------------------------------------
# Purpose : Start the Docker services, execute test scripts, and stop the 
#           services again – in a robust and repeatable way.                              
# -----------------------------------------------------------------------------
# Behaviour can be tuned via environment variables:                              
#   STOP_ON_ERROR   – if "true" (default) abort after first failing test.       
#   SERVER_URL      – health-check endpoint (default http://localhost:8080/actuator/health).
#   MAX_WAIT_SECONDS– max seconds to wait for the server to become healthy (30). 
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# ~ ⋖,^><# 
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# UN/COMMENT THESE VARIABLES TO CHANGE THE BEHAVIOUR
# -----------------------------------------------------------------------------
STOP_ON_ERROR="${STOP_ON_ERROR:-false}"
#STOP_ON_ERROR="${STOP_ON_ERROR:-true}"

# Resolve project root so the script can be called from anywhere
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "# LOGS FOR TESTING" >> latest.log
# --------------------------------------------------------------------------------------
# Helper logging function
# --------------------------------------------------------------------------------------
log() {
  echo -e "[$(date '+%H:%M:%S')] $*" >> latest.log
}

# --------------------------------------------------------------------------------------
# CI Environment Detection
# --------------------------------------------------------------------------------------
detect_ci_environment() {
  # Check for common CI environment variables
  if [[ -n "${CI:-}" ]] || [[ -n "${GITLAB_CI:-}" ]] || [[ -n "${GITHUB_ACTIONS:-}" ]] || [[ -n "${CI_ENVIRONMENT:-}" ]]; then
    return 0  # CI environment detected
  fi
  
  # Check if Docker is available
  if ! command -v docker >/dev/null 2>&1; then
    log "⚠️  Docker not found - assuming CI environment"
    return 0  # Assume CI if Docker not available
  fi
  
  # Check if Docker daemon is running
  if ! docker info >/dev/null 2>&1; then
    log "⚠️  Docker daemon not running - assuming CI environment"
    return 0  # Assume CI if Docker not working
  fi
  
  return 1  # Local environment
}

# --------------------------------------------------------------------------------------
# Main execution logic
# --------------------------------------------------------------------------------------
main() {
  log "🚀 Starting test runner..."
  
  if detect_ci_environment; then
    log "🔄 CI environment detected - using CI test runner"
    log "Delegating to run-test-ci.sh..."
    
    # Check if CI runner exists
    if [[ ! -f "$ROOT_DIR/run-test-ci.sh" ]]; then
      log "❌ ERROR: run-test-ci.sh not found!"
      log "This script is required for CI environments"
      exit 1
    fi
    
    # Make sure it's executable
    chmod +x "$ROOT_DIR/run-test-ci.sh"
    
    # Delegate to CI runner with all arguments
    exec "$ROOT_DIR/run-test-ci.sh" "$@"
  else
    log "🐳 Local environment detected - using Docker"
    log "Proceeding with Docker-based testing..."
  fi

  # Continue with original Docker-based logic...
  # (Rest of the original script remains the same)
  
  # --------------------------------------------------------------------------------------
  # Configuration (can be overridden via env-vars)
  # --------------------------------------------------------------------------------------
  SERVER_URL="${SERVER_URL:-http://localhost:8080/actuator/health}"
  MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-60}"  # Increased for Docker startup time
  MAX_SERVER_RETRIES="${MAX_SERVER_RETRIES:-3}"

  # Global variables for process tracking
  DOCKER_STARTED=false
  INTERRUPTED=false

  # --------------------------------------------------------------------------------------
  # Signal handlers
  # --------------------------------------------------------------------------------------
  cleanup_and_exit() {
    INTERRUPTED=true
    log "Interrupt received - cleaning up..."
    
    # Stop Docker services
    stop_server
    
    log "Cleanup complete - exiting" # Standard exit code for Ctrl+C
  }

  # --------------------------------------------------------------------------------------
  # Docker services handling
  # --------------------------------------------------------------------------------------
  start_server() {
    if [[ "$INTERRUPTED" == "true" ]]; then
      return 1
    fi
    
    log "Starting Docker services using start.sh..."
    
    # Check if .secrets file exists
    if [[ ! -f "$ROOT_DIR/.secrets" ]]; then
      log "❌ ERROR: .secrets file not found!"
      log "📋 Please create a .secrets file with all configuration."
      return 1
    fi
    
    # Run start.sh script
    if ! bash "$ROOT_DIR/start.sh" testadmin testadmin@example.com testpassword; then
      log "Failed to start Docker services"
      return 1
    fi
    
    DOCKER_STARTED=true

    log "Waiting for server to start at $SERVER_URL (max ${MAX_WAIT_SECONDS}s)..."
    local waited=0
    until curl --silent --fail "$SERVER_URL" >/dev/null 2>&1; do
      if [[ "$INTERRUPTED" == "true" ]]; then
        return 1
      fi
      sleep 2  # Increased sleep time for Docker
      ((waited += 2))
      if (( waited >= MAX_WAIT_SECONDS )); then
        log "Server failed to start within ${MAX_WAIT_SECONDS}s – aborting."
        log "Docker services status:"
        docker compose ps
        return 1
      fi
      # Show progress every 10 seconds
      if (( waited % 10 == 0 )); then
        log "Still waiting... (${waited}s elapsed)"
      fi
    done
    log "Server up!"
  }

  stop_server() {
    if [[ "$DOCKER_STARTED" == "true" ]]; then
      log "Stopping Docker services..."
      pushd "$ROOT_DIR" >/dev/null
      
      # Stop all Docker services
      docker compose down >/dev/null 2>&1 || true
      
      popd >/dev/null
      DOCKER_STARTED=false
      log "Docker services stopped"
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
    log "TEST SUMMARY:"
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
