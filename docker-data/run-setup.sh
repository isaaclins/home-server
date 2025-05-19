#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
# Determine the script's own directory to make paths absolute or correctly relative
# This assumes the script itself is in /app/docker-data when running inside Docker.
SCRIPT_DIR="/app/docker-data" # Hardcoding for Docker context as BASH_SOURCE might be tricky in all exec environments
DATA_DIR_NAME="data"
DATA_DIR="${SCRIPT_DIR}/${DATA_DIR_NAME}"
DB_NAME="${DATA_DIR}/home_server.db"

# Application directory where package.json (for npm run dev) is located
APP_DIR="${SCRIPT_DIR}"

# --- Helper Functions ---
ensure_dir_exists() {
    local directory_path="$1"
    mkdir -p "$directory_path"
    echo "Directory '$directory_path' checked/created." > /dev/null
}

hash_password() {
    local password="$1"
    # sha256sum is standard in Linux containers.
    echo -n "$password" | sha256sum | awk '{print $1}'
}

create_data_dir_and_db_tables() {
    ensure_dir_exists "$DATA_DIR"
    
    sqlite3 "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    hashed_password TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
EOF
    echo "Data directory and database tables checked/created at '$DB_NAME'." > /dev/null
}

admin_user_exists_in_db() {
    local count
    # Check if the users table exists first, then query count.
    table_exists=$(sqlite3 "$DB_NAME" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null)

    if [ -z "$table_exists" ]; then
        echo "Users table does not exist. Assuming no admin user."
        return 1 # False, table doesn't exist
    fi

    count=$(sqlite3 "$DB_NAME" "SELECT COUNT(*) FROM users WHERE is_admin = 1;" 2>/dev/null)
    
    if [[ $? -eq 0 && "$count" =~ ^[0-9]+$ ]]; then
        if [ "$count" -gt 0 ]; then
            return 0 # True, admin user(s) exist
        else
            return 1 # False, no admin users
        fi
    else
        echo "Warning: Could not query admin user status from DB. Assuming no admin exists."
        return 1 # False, cannot confirm
    fi
}

add_admin_user_to_db() {
    local username="$1"
    local password="$2"
    local email="$3"
    local hashed_pass
    local output
    local insert_status

    hashed_pass=$(hash_password "$password")
    output=$(sqlite3 "$DB_NAME" "INSERT INTO users (username, email, hashed_password, is_admin) VALUES ('$username', '$email', '$hashed_pass', 1);" 2>&1)
    insert_status=$?

    if [ $insert_status -eq 0 ]; then
        echo "Admin user '$username' created successfully with email '$email'."
        return 0 # Success
    else
        if [[ "$output" == *"UNIQUE constraint failed: users.username"* || "$output" == *"UNIQUE constraint failed: users.email"* ]]; then
             echo "Error adding admin: Username '$username' or email '$email' already exists (UNIQUE constraint)."
        else
            echo "Failed to add admin user '$username' due to an unexpected SQLite error (code: $insert_status). Details: $output."
        fi
        return 1 # Failure
    fi
}

perform_interactive_admin_setup() {
    clear
    echo "--- Initial Admin User Setup ---"    
    local admin_username
    local admin_email
    local admin_password
    local admin_password_confirm

    while true; do
        read -r -p "Enter desired admin username: " admin_username
        if [ -z "$admin_username" ]; then
            echo "Username cannot be empty. Please try again."
            continue
        fi
        break
    done
    
    while true; do
        read -r -p "Enter admin email address: " admin_email
        if [[ "$admin_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            break
        else
            echo "Invalid email format. Please try again."
        fi
    done

    while true; do
        read -r -s -p "Enter admin password: " admin_password
        echo 
        if [ -z "$admin_password" ]; then
            echo "Password cannot be empty. Please try again."
            continue
        fi
        read -r -s -p "Confirm admin password: " admin_password_confirm
        echo 
        if [ "$admin_password" == "$admin_password_confirm" ]; then
            break
        else
            echo "Passwords do not match. Please try again."
        fi
    done

    if add_admin_user_to_db "$admin_username" "$admin_password" "$admin_email"; then
        echo "--- Initial Admin User Setup Complete ---"
    else
        echo "--- Initial Admin User Setup Failed ---"
        # Optionally exit if admin setup is critical and fails
        # exit 1
    fi
}

# --- Main Execution ---

echo "=== Starting Application Setup and Run ==="

# 1. Database and Admin User Setup
echo "[Phase 1/2] Initializing database and admin user..."
create_data_dir_and_db_tables

if ! admin_user_exists_in_db; then
    # Check for environment variables for non-interactive setup
    if [ -n "$INITIAL_ADMIN_USER" ] && [ -n "$INITIAL_ADMIN_EMAIL" ] && [ -n "$INITIAL_ADMIN_PASSWORD" ]; then
        echo "Environment variables for initial admin found. Attempting non-interactive setup..." > /dev/null
        if add_admin_user_to_db "$INITIAL_ADMIN_USER" "$INITIAL_ADMIN_PASSWORD" "$INITIAL_ADMIN_EMAIL"; then
             echo "--- Initial Admin User Setup Complete (Non-Interactive) ---"
        else
             echo "--- Initial Admin User Setup Failed (Non-Interactive) ---"
             # Decide if you want to exit or fall back to interactive
             # exit 1 
        fi
    else
        echo "No admin user found and no environment variables set. Proceeding with interactive admin setup."
        perform_interactive_admin_setup
    fi
else
    echo "Admin user already exists in the database. Skipping admin setup."
fi

if [ ! -d "$APP_DIR" ]; then
    echo "Error: Application directory '$APP_DIR' not found. Cannot start servers."
    exit 1
fi

cd "$APP_DIR"

# Start Ollama service in the background
ollama serve &
OLLAMA_PID=$!

# Start Gitea service in the background
GITEA_DATA_DIR="${SCRIPT_DIR}/gitea-data"
GITEA_PORT=3003
GITEA_LOG="${GITEA_DATA_DIR}/gitea.log"

# Ensure Gitea data directory exists
ensure_dir_exists "$GITEA_DATA_DIR"

# Start Gitea (web UI on 3003)
sudo -u gitea /usr/local/bin/gitea web --port $GITEA_PORT --work-path "$GITEA_DATA_DIR" --custom-path "$GITEA_DATA_DIR" --config "$GITEA_DATA_DIR/app.ini" > "$GITEA_LOG" 2>&1 &
GITEA_PID=$!
echo "Started Gitea (PID $GITEA_PID) on port $GITEA_PORT. Logs: $GITEA_LOG"

# Give Ollama and Gitea a moment to start up (optional, adjust as needed)
sleep 5 

# Start the application (e.g., using concurrently via npm script) in the background
npm run dev &
NPM_DEV_PID=$!

bash


# Send SIGTERM first, then wait, then SIGKILL if necessary (more graceful)
echo "Attempting to gracefully stop main application (npm run dev - PID $NPM_DEV_PID)..."
kill $NPM_DEV_PID 2>/dev/null
if wait $NPM_DEV_PID 2>/dev/null; then
    echo "Main application stopped gracefully."
else
    echo "Main application did not stop gracefully or was already stopped. Sending SIGKILL if process still exists..."
    kill -9 $NPM_DEV_PID 2>/dev/null || echo "Main application (PID $NPM_DEV_PID) already stopped or not found."
fi

echo "Attempting to gracefully stop Ollama service (PID $OLLAMA_PID)..."
kill $OLLAMA_PID 2>/dev/null
if wait $OLLAMA_PID 2>/dev/null; then
    echo "Ollama service stopped gracefully."
else
    echo "Ollama service did not stop gracefully or was already stopped. Sending SIGKILL if process still exists..."
    kill -9 $OLLAMA_PID 2>/dev/null || echo "Ollama service (PID $OLLAMA_PID) already stopped or not found."
fi

echo "Attempting to gracefully stop Gitea service (PID $GITEA_PID)..."
kill $GITEA_PID 2>/dev/null
if wait $GITEA_PID 2>/dev/null; then
    echo "Gitea service stopped gracefully."
else
    echo "Gitea service did not stop gracefully or was already stopped. Sending SIGKILL if process still exists..."
    kill -9 $GITEA_PID 2>/dev/null || echo "Gitea service (PID $GITEA_PID) already stopped or not found."
fi

echo "=== Application Setup and Run Script Finished ===="
exit 0 
