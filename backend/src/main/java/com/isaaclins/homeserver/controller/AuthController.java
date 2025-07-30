package com.isaaclins.homeserver.controller;

import com.isaaclins.homeserver.entity.User;
import com.isaaclins.homeserver.service.UserService;
import com.isaaclins.homeserver.service.JwtService;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final UserService userService;
    private final JwtService jwtService;

    @Autowired
    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        logger.debug("Login attempt for username/email: {}", request.getUsernameOrEmail());

        if (request.getUsernameOrEmail() == null || request.getPassword() == null) {
            logger.warn("Login failed: Missing credentials");
            return ResponseEntity.badRequest().body("Missing credentials");
        }

        Optional<User> optionalUser = userService.getUserByUsername(request.getUsernameOrEmail());
        if (optionalUser.isEmpty()) {
            optionalUser = userService.getUserByEmail(request.getUsernameOrEmail());
        }

        if (optionalUser.isEmpty()) {
            logger.warn("Login failed: User not found for username/email: {}", request.getUsernameOrEmail());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        User user = optionalUser.get();
        logger.debug("User found: {} (admin: {})", user.getUsername(), user.getIsAdmin());

        // NOTE: Passwords should be hashed. For now compare plaintext.
        if (!user.getHashedPassword().equals(request.getPassword())) {
            logger.warn("Login failed: Invalid password for user: {}", user.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getUsername());
        logger.info("Login successful for user: {}", user.getUsername());

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
