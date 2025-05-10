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
    echo "Directory '$directory_path' checked/created."
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
    echo "Data directory and database tables checked/created at '$DB_NAME'."
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
    echo "No admin user found in database. Proceeding with interactive admin setup."
    perform_interactive_admin_setup
else
    echo "Admin user already exists in the database. Skipping interactive setup."
fi
echo "[Phase 1/2] Database and admin user setup complete."
echo # Blank line for readability


echo # Blank line for readability

# 2. Run Application
echo "[Phase 2/2] Starting application servers..."

if [ ! -d "$APP_DIR" ]; then
    echo "Error: Application directory '$APP_DIR' not found. Cannot start servers."
    exit 1
fi

cd "$APP_DIR"
echo "Changed directory to $(pwd) for running npm."

print_server_info() {
    echo ""
    echo "--- Server Information ---"
    echo "Frontend Next.js app expected at: http://localhost:3000"
    echo "Backend Express API expected at:  http://localhost:3001"
    echo "Ollama API (if installed and 'ollama serve' is run): http://localhost:11434"
    echo "Ensure Docker ports are mapped correctly (e.g., -p 3000:3000 -p 3001:3001)."
    echo "Application logs will follow."
    echo ""
}

print_server_info

# Start the application (e.g., using concurrently via npm script)
npm run dev

EXIT_CODE=$?
echo "Application process (npm run dev) exited with code $EXIT_CODE."
echo "=== Application Setup and Run Script Finished ==="
exit $EXIT_CODE 
