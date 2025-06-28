package com.isaaclins.homeserver.controller;

import com.isaaclins.homeserver.entity.User;
import com.isaaclins.homeserver.service.UserService;
import com.isaaclins.homeserver.service.JwtService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    @Autowired
    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.getUsernameOrEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body("Missing credentials");
        }

        Optional<User> optionalUser = userService.getUserByUsername(request.getUsernameOrEmail());
        if (optionalUser.isEmpty()) {
            optionalUser = userService.getUserByEmail(request.getUsernameOrEmail());
        }

        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        User user = optionalUser.get();
        // NOTE: Passwords should be hashed. For now compare plaintext.
        if (!user.getHashedPassword().equals(request.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getUsername());

        LoginResponse resp = new LoginResponse();
        resp.setId(user.getId());
        resp.setUsername(user.getUsername());
        resp.setEmail(user.getEmail());
        resp.setAdmin(Boolean.TRUE.equals(user.getIsAdmin()));
        resp.setToken(token);
        return ResponseEntity.ok(resp);
    }

    @Data
    public static class LoginRequest {
        private String usernameOrEmail;
        private String password;
    }

    @Data
    public static class LoginResponse {
        private Long id;
        private String username;
        private String email;
        private boolean admin;
        private String token;
    }
}
