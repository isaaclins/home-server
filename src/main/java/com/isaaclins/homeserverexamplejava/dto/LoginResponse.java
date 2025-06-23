package com.isaaclins.homeserverexamplejava.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private String refreshToken;
    private String username;
    private String role;
    private boolean success;
    private String message;

    // Convenience constructor for success responses
    public LoginResponse(String token, String refreshToken, String username, String role) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.username = username;
        this.role = role;
        this.success = true;
        this.message = "Login successful";
    }

    // Convenience constructor for error responses
    public LoginResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
}
