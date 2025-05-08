from flask import Flask, request
from server.database import *
from server.pages import *
app = Flask(__name__)

@app.get("/")
def root_api():
    return "Hello World"

@app.get("/api/")
def api():
    return {"message": "Home Server API - Core Endpoints"}

# TESTED 
@app.get("/api/users/")
def get_users_api():
    users = get_all_users()
    if not users:
        return {"message": "No users found"}, 404
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

@app.get("/api/users/<int:user_id>")
def get_user_api(user_id):
    user = get_user(user_id)
    if not user:
        return {"message": "User with the id " + str(user_id) + " not found"}, 404
    else:
        return {"message": "User with the id " + str(user_id) + " retrieved successfully", "user": user}



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
