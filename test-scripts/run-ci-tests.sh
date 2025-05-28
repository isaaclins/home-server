#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Start the main application setup in the background
echo "Starting application via run-setup.sh in background..."
# Ensure run-setup.sh is found relative to the WORKDIR /app in the Docker image
bash /app/docker-data/run-setup.sh &
RUN_SETUP_PID=$!
echo "run-setup.sh started with PID $RUN_SETUP_PID"

# Function to clean up background processes
cleanup() {
    echo "Cleaning up background processes..."
    if ps -p $RUN_SETUP_PID > /dev/null; then
        echo "Attempting to stop run-setup.sh (PID $RUN_SETUP_PID) and its children..."
        # Sending SIGTERM to run-setup.sh. Its own trap should handle children.
        kill -TERM $RUN_SETUP_PID
        
        # Wait a bit for graceful shutdown
        if wait $RUN_SETUP_PID 2>/dev/null; then
            echo "run-setup.sh (PID $RUN_SETUP_PID) and its children terminated gracefully."
        else
            echo "run-setup.sh (PID $RUN_SETUP_PID) did not terminate gracefully or was already stopped. Forcing kill if necessary."
            # If run-setup.sh's trap did not kill all children (e.g. ollama, npm),
            # we might need more specific cleanup here, but run-setup.sh's trap is preferred.
            # As a fallback, try to kill the process group if it exists and is different from PID
            if kill -0 -$RUN_SETUP_PID 2>/dev/null && [ $RUN_SETUP_PID -ne -$RUN_SETUP_PID ]; then
                 kill -KILL -$RUN_SETUP_PID 2>/dev/null
            else # else, just kill the PID
                 kill -KILL $RUN_SETUP_PID 2>/dev/null
            fi
        fi
    else
        echo "run-setup.sh (PID $RUN_SETUP_PID) already exited or was not found."
    fi

    # Additional check for Ollama as run-setup.sh might not always clean it perfectly on forceful exit
    OLLAMA_PID=$(pgrep -f "ollama serve")
    if [ -n "$OLLAMA_PID" ]; then
        echo "Ensuring Ollama (PIDs $OLLAMA_PID) is stopped..."
        kill -TERM $OLLAMA_PID || kill -KILL $OLLAMA_PID
        sleep 2 # Give it a moment
        if pgrep -f "ollama serve" > /dev/null; then
            echo "Ollama did not stop with TERM, sending KILL."
            kill -KILL $(pgrep -f "ollama serve")
        fi
    fi
    echo "Cleanup finished."
}

# Ensure cleanup is called on exit (EXIT), interrupt (INT), or termination (TERM)
trap cleanup EXIT INT TERM

# Wait for services to start up
echo "Waiting for services to start..."
MAX_ATTEMPTS_BACKEND=45 # Increased attempts, e.g. 45 attempts * 5s = 225s max
MAX_ATTEMPTS_FRONTEND=30 # Increased attempts, e.g., 30 attempts * 5s = 150s max
SLEEP_DURATION=5
SUCCESS_BACKEND=false
SUCCESS_FRONTEND=false

# Wait for backend service (port 3002)
echo "Waiting for backend service (port 3002) to respond..."
for i in $(seq 1 $MAX_ATTEMPTS_BACKEND); do
  if ! ps -p $RUN_SETUP_PID > /dev/null; then
      echo "run-setup.sh (PID $RUN_SETUP_PID) exited prematurely. Aborting tests."
      exit 1
  fi
  if curl --output /dev/null --silent --head http://localhost:3002/; then # Using --head for lighter check
    echo "Backend service responded."
    SUCCESS_BACKEND=true
    break
  else
    CURL_EXIT_CODE=$?
    if [ $CURL_EXIT_CODE -eq 7 ]; then # Connection refused
      echo "Attempt $i/$MAX_ATTEMPTS_BACKEND: Backend (3002) connection refused. Retrying in $SLEEP_DURATION seconds..."
    elif [ $CURL_EXIT_CODE -eq 28 ]; then # Timeout
      echo "Attempt $i/$MAX_ATTEMPTS_BACKEND: Backend (3002) connection timed out. Retrying in $SLEEP_DURATION seconds..."
    else
      echo "Attempt $i/$MAX_ATTEMPTS_BACKEND: Backend (3002) not fully responsive (curl exit $CURL_EXIT_CODE). Retrying in $SLEEP_DURATION seconds..."
    fi
  fi
  sleep $SLEEP_DURATION
done

if [ "$SUCCESS_BACKEND" = "false" ]; then
  echo "Backend service (port 3002) failed to respond after $MAX_ATTEMPTS_BACKEND attempts."
  exit 1
fi

# Wait for frontend service (port 3000)
echo "Waiting for frontend service (port 3000) to respond..."
for i in $(seq 1 $MAX_ATTEMPTS_FRONTEND); do
  if ! ps -p $RUN_SETUP_PID > /dev/null; then
      echo "run-setup.sh (PID $RUN_SETUP_PID) exited prematurely. Aborting tests."
      exit 1
  fi
  if curl --output /dev/null --silent --head --fail http://localhost:3000/; then
    echo "Frontend service responded successfully."
    SUCCESS_FRONTEND=true
    break
  else
    CURL_EXIT_CODE=$?
    if [ $CURL_EXIT_CODE -eq 7 ]; then # Connection refused
       echo "Attempt $i/$MAX_ATTEMPTS_FRONTEND: Frontend (3000) connection refused. Retrying in $SLEEP_DURATION seconds..."
    elif [ $CURL_EXIT_CODE -eq 28 ]; then # Timeout
       echo "Attempt $i/$MAX_ATTEMPTS_FRONTEND: Frontend (3000) connection timed out. Retrying in $SLEEP_DURATION seconds..."
    else
       echo "Attempt $i/$MAX_ATTEMPTS_FRONTEND: Frontend (3000) not ready or returned error (curl exit $CURL_EXIT_CODE). Retrying in $SLEEP_DURATION seconds..."
    fi
  fi
  sleep $SLEEP_DURATION
done

if [ "$SUCCESS_FRONTEND" = "false" ]; then
  echo "Frontend service (port 3000) failed to respond successfully after $MAX_ATTEMPTS_FRONTEND attempts."
  exit 1
fi

echo "Services are up. Running application tests..."

# Check Frontend Homepage
echo "Checking Frontend Homepage (http://localhost:3000/)..."
curl --fail --silent --show-error http://localhost:3000/ # Removed | cat, --show-error is good
echo "" # Newline for clarity
echo "Frontend Homepage check PASSED."

# Check Frontend Login Page
echo "Checking Frontend Login Page (http://localhost:3000/login)..."
curl --fail --silent --show-error http://localhost:3000/login # Removed | cat
echo "" # Newline for clarity
echo "Frontend Login Page check PASSED."

# Check Backend Health and Authenticated Route
echo "Checking Backend Health and Authenticated Routes..."
echo "Attempting login to backend..."
LOGIN_RESPONSE=$(curl --silent --show-error -X POST -H "Content-Type: application/json" \
  -d "{\"username\":\"${INITIAL_ADMIN_USER:-testadmin}\",\"password\":\"${INITIAL_ADMIN_PASSWORD:-password}\"}" \
  http://localhost:3002/api/auth/login)
echo "Login response: $LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//') # More robust token parsing

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then # Check for null token as well
  echo "Login failed or token not found/null in response."
  exit 1
else
  echo "Token acquired."
  echo "Checking /api/users (authenticated route)..."
  curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/users # Removed | cat
  echo "" # Newline for clarity
  echo "/api/users check PASSED."
  
  echo "Checking /api/logs (authenticated admin route)..."
  curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/logs # Removed | cat
  echo "" # Newline for clarity
  echo "/api/logs check PASSED."
fi
echo "Backend Health and Authenticated Routes check PASSED."

# Check Ollama Chat Page
echo "Checking Ollama Chat Page (http://localhost:3000/ollama-chat)..."
curl --fail --silent --show-error http://localhost:3000/ollama-chat # Removed | cat
echo "" # Newline for clarity
echo "Ollama Chat Page check PASSED."

echo "All application tests PASSED!"
# The trap will handle cleanup
exit 0 
