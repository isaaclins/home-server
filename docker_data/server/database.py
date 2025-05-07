import sqlite3
import hashlib
DB_FILE_PATH = "data/home_server.db"

def get_db_connection():
    """Returns a connection to the database."""
    conn = sqlite3.connect(DB_FILE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# TODO: Add error handling & SQL injection protection
def execute_query(query, params=()):
    """Executes a query on the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    conn.commit()
    conn.close()

# Hash a password
def hash_password(password):
    """Hashes the given password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def get_user(user_id):
    """Returns a user by their ID."""
    user = execute_query('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    print(user)
    return user

# Create a user
def create_user(username, password, is_admin):
    """Creates a user in the database."""
    execute_query('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', (username, password, is_admin))

# Update a user
def update_user(user_id, username, password, is_admin):
    """Updates a user in the database."""
    execute_query('UPDATE users SET username = ?, password = ?, is_admin = ? WHERE id = ?', (username, password, is_admin, user_id))

# Delete a user
def delete_user(user_id):
    """Deletes a user from the database."""
    execute_query('DELETE FROM users WHERE id = ?', (user_id,))

# Get all users
def get_all_users():
    """Returns all users from the database."""
    return execute_query('SELECT * FROM users').fetchall()


# Create a user
def create_user(username, password, is_admin):
    execute_query('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', (username, password, is_admin))
