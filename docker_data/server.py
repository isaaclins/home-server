from flask import Flask

app = Flask(__name__)

@app.get("/")
def root():
    return "Hello World"

@app.get("/api")
def api():
    return {"message": "Home Server API - Core Endpoints"}

@app.get("/api/users")
def get_users():
    return {"message": "Users retrieved successfully"}

@app.post("/api/users")
def create_user():
    return {"message": "User created successfully"}

@app.put("/api/users/x")
def update_user():
    return {"message": "User X updated successfully"}

@app.delete("/api/users/x")
def delete_user():
    return {"message": "User X deleted successfully"}

@app.get("/api/users/x")
def get_user():
    return {"message": "User X retrieved successfully"}



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
