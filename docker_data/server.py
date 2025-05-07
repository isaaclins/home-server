from flask import Flask
from server.database import *

app = Flask(__name__)

@app.get("/")
def root_api():
    return "Hello World"

@app.get("/api/")
def api():
    return {"message": "Home Server API - Core Endpoints"}

@app.get("/api/users/")
def get_users_api():
    users = execute_query('SELECT * FROM users')
    if not users:
        return {"message": "No users found"}
    else:
        return {"message": "Users retrieved successfully", "users": users}

@app.post("/api/users/")
def create_user_api():
    body = request.json
    username = body.get("username")
    password = body.get("password")
    is_admin = body.get("is_admin")
    create_user(username, password, is_admin)
    return {"message": "User created successfully"}

@app.put("/api/users/{user_id}/")
def update_user_api(user_id):
    
    body = request.json
    username = body.get("username")
    password = body.get("password")
    is_admin = body.get("is_admin")
    update_user(user_id, username, password, is_admin)
    return {"message": "User with the id " + user_id + " updated successfully"}

@app.delete("/api/users/{user_id}/")
def delete_user_api(user_id):
    delete_user(user_id)
    return {"message": "User with the id " + user_id + " deleted successfully"}

@app.get("/api/users/{user_id}/")
def get_user_api(user_id):
    user = get_user(user_id)
    print(user)
    if not user:
        return {"message": "User with the id " + user_id + " not found"}
    else:
        return {"message": "User with the id " + user_id + " retrieved successfully", "user": user}



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
