def get_manual_api():

    return {"message": "Manual API", "manual": manual}, 200


manual = {
    "This is a manual API":{
        "You can use this API to get the manual":{
            "Here are all the available endpoints:":{
                "GET REQUESTS:":{
                    "GET / ":"Home Page",
                    "GET /api/ ":"API Home Page",
                    "GET /api/health/ ":"Health Check",
                    "GET /api/users/ ":"Get All Users",
                    "GET /api/users/<int:user_id>/ ":"Get User by ID",
        
                },
                "POST REQUESTS:":{
                    "POST /api/users/ ":"Create User",
                    "POST /api/users/<int:user_id>/ ":"Update User",
                    "POST /api/users/<int:user_id>/ ":"Delete User"
                },
                "PUT REQUESTS:":{
                    "PUT /api/users/<int:user_id>/ ":"Update User",
                    "PUT /api/users/<int:user_id>/ ":"Delete User"
                },
                "DELETE REQUESTS:":{
                    "DELETE /api/users/<int:user_id>/ ":"Delete User"
                }
            }
        }
    }
}

