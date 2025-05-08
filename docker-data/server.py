from flask import Flask, request, send_from_directory, jsonify
from server.database import *
from server.pages import *
from server.health import *
from api.manual import *

app = Flask(__name__)

@app.route("/")
def serve_dashboard():
    return send_from_directory('pages/dashboard', 'index.html'), 200

@app.route("/pages/<path:filename>")
def serve_page(filename):
    return send_from_directory('pages', filename)

@app.get("/api/")
def api():
    return get_manual_api()

@app.get("/api/health/")
def health_api():
    health_status = health_check()
    return {"message": "Server status: ", "status": health_status}, 200

@app.get("/o/api/health")  # Ollama health check endpoint
def ollama_health_api():
    # In a real setup, this would check/proxy to the actual Ollama service
    return jsonify(status="Ollama service is presumably healthy", service_specific_info="mocked_ollama_health"), 200

@app.get("/fs/api/health")  # File Service health check endpoint
def file_service_health_api():
    # In a real setup, this would check/proxy to the actual File Service
    return jsonify(status="File service is presumably healthy", service_specific_info="mocked_file_service_health"), 200

@app.get("/api/users/")
def get_users_api():
    users = get_all_users()
    if not users:
        return {"message": "No users found"}, 404
    else:
        return {"message": "Users retrieved successfully", "users": users}, 200

@app.get("/api/users/<int:user_id>")
def get_user_from_id_api(user_id):
    user = get_user(user_id)
    if not user:
        return {"message": "User with the id " + str(user_id) + " not found"}, 404
    else:
        return {"message": "User with the id " + str(user_id) + " retrieved successfully", "user": user}, 200

@app.post("/api/users/")
def create_user_api():
    body = request.json
    username = body.get("username")
    password = body.get("password")
    is_admin = body.get("is_admin")
    create_user(username, password, is_admin)
    return {"message": "User created successfully"}

@app.put("/api/users/<int:user_id>/")
def update_user_api(user_id):
    body = request.json
    username = body.get("username")
    password = body.get("password")
    is_admin = body.get("is_admin")
    update_user(user_id, username, password, is_admin)
    return {"message": "User with the id " + user_id + " updated successfully"}

@app.delete("/api/users/<int:user_id>/")
def delete_user_api(user_id):
    delete_user(user_id)
    return {"message": "User with the id " + user_id + " deleted successfully"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
