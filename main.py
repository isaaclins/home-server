import os
import sqlite3
import hashlib
import getpass # For securely getting password input
import uvicorn
from fastapi import FastAPI

DATA_DIR = "data"
DB_NAME = os.path.join(DATA_DIR, "home_server.db")
ADMIN_USER_FILE = os.path.join(DATA_DIR, ".admin_created")

# Initialize FastAPI app
app = FastAPI(
    title="Home Server API",
    description="APIs for managing home server functionalities including Ollama, File Hosting, and PaaS.",
    version="0.1.0"
)

def hash_password(password):
    """Hashes the given password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def create_data_dir_and_db_tables():
    """Ensures data directory and database tables exist. Safe to call on every start."""
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0
    );
    """)
    conn.commit()
    conn.close()
    print(f"Data directory and database tables checked/created at '{DATA_DIR}'.")

def add_admin_user_to_db(username, password):
    """Adds an admin user to the database. Assumes DB table exists."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    hashed_pass = hash_password(password)
    try:
        cursor.execute("INSERT INTO users (username, hashed_password, is_admin) VALUES (?, ?, 1)",
                       (username, hashed_pass))
        conn.commit()
        print(f"Admin user '{username}' created successfully.")
        with open(ADMIN_USER_FILE, 'w') as f:
            f.write("Admin user created")
    except sqlite3.IntegrityError:
        print(f"Admin user '{username}' already exists or another error occurred.")
    finally:
        conn.close()

def perform_interactive_admin_setup():
    """Handles the interactive prompting and creation of the initial admin user."""
    print("--- Initial Admin User Setup ---")
    print(f"No admin user found (marker file '{ADMIN_USER_FILE}' missing).")
    while True:
        admin_username = input("Enter desired admin username: ").strip()
        if not admin_username:
            print("Username cannot be empty. Please try again.")
            continue
        break
    
    while True:
        admin_password = getpass.getpass("Enter admin password: ").strip()
        if not admin_password:
            print("Password cannot be empty. Please try again.")
            continue
        admin_password_confirm = getpass.getpass("Confirm admin password: ").strip()
        if admin_password == admin_password_confirm:
            break
        else:
            print("Passwords do not match. Please try again.")

    add_admin_user_to_db(admin_username, admin_password)
    print("--- Initial Admin User Setup Complete ---")

# Ensure data directory and DB tables are ready when module is loaded.
# This part is non-interactive and safe for Uvicorn import.
create_data_dir_and_db_tables()

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Home Server API!"}

@app.get("/api")
async def read_api_root():
    return {"message": "Home Server API - Core Endpoints"}

if __name__ == "__main__":
    # Check if admin setup is needed only when script is run directly.
    if not os.path.exists(ADMIN_USER_FILE):
        # This print statement helps confirm if this block is reached.
        print(f"Marker file '{ADMIN_USER_FILE}' not found. Attempting interactive admin setup.")
        perform_interactive_admin_setup()
    else:
        print(f"Admin user already configured (marker file '{ADMIN_USER_FILE}' found).")

    print("Starting Uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 
