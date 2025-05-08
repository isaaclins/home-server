#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
DATA_DIR="data" # Relative to the script's execution directory
DB_NAME="${DATA_DIR}/home_server.db"
ADMIN_USER_FILE=".first_run_done" # Marker file, relative to script's execution directory

# --- Helper Functions ---

ensure_dir_exists() {
    local directory_path="$1"
    mkdir -p "$directory_path"
    echo "Directory '$directory_path' checked/created."
}

hash_password() {
    local password="$1"
    # Ensure -n is used with echo to prevent trailing newline
    # sha256sum is common on Linux. For macOS, shasum -a 256 could be an alternative.
    echo -n "$password" | sha256sum | awk '{print $1}'
}

create_data_dir_and_db_tables() {
    ensure_dir_exists "$DATA_DIR"
    
    sqlite3 "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0
);
EOF
    echo "Data directory and database tables checked/created at '$DB_NAME'."
}

add_admin_user_to_db() {
    local username="$1"
    local password="$2"
    local hashed_pass

    hashed_pass=$(hash_password "$password")

    # Capture potential error messages from sqlite3 by redirecting stderr to stdout
    # Then capture the exit status
    output=$(sqlite3 "$DB_NAME" "INSERT INTO users (username, hashed_password, is_admin) VALUES ('$username', '$hashed_pass', 1);" 2>&1)
    insert_status=$?

    if [ $insert_status -eq 0 ]; then
        echo "Admin user '$username' created successfully."
        # Create the marker file
        echo "Admin user created" > "$ADMIN_USER_FILE"
    else
        # SQLite error code 19 is SQLITE_CONSTRAINT, which includes UNIQUE constraint violations
        if [ $insert_status -eq 19 ]; then
            echo "Admin user '$username' already exists or another error occurred. Flag: flag(wh4t_4_f4ck1ng_m355)"
        else
            echo "Failed to add admin user '$username' due to an unexpected SQLite error (code: $insert_status). Details: $output. Flag: flag(wh4t_4_f4ck1ng_m355)"
        fi
    fi
}

perform_interactive_admin_setup() {
    clear
    echo "--- Initial Admin User Setup ---"    
    local admin_username
    while true; do
        read -r -p "Enter desired admin username: " admin_username
        if [ -z "$admin_username" ]; then
            echo "Username cannot be empty. Please try again."
            continue
        fi
        break
    done
    
    local admin_password
    local admin_password_confirm
    while true; do
        read -r -s -p "Enter admin password: " admin_password
        echo # Newline after password input
        if [ -z "$admin_password" ]; then
            echo "Password cannot be empty. Please try again."
            continue
        fi
        read -r -s -p "Confirm admin password: " admin_password_confirm
        echo # Newline after password input
        if [ "$admin_password" == "$admin_password_confirm" ]; then
            break
        else
            echo "Passwords do not match. Please try again."
        fi
    done

    add_admin_user_to_db "$admin_username" "$admin_password"
    echo "--- Initial Admin User Setup Complete ---"
    clear
}

# --- Main Execution ---
echo "Executing initial setup (database, admin user)..."
create_data_dir_and_db_tables

if [ ! -f "$ADMIN_USER_FILE" ]; then
    echo "Marker file '$ADMIN_USER_FILE' not found. Attempting interactive admin setup."
    perform_interactive_admin_setup
else
    echo "Admin user already configured (marker file '$ADMIN_USER_FILE' found)."
fi
