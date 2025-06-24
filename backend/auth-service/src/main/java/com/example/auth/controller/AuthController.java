package com.example.auth.controller;

import com.example.auth.model.User;
import com.example.auth.repository.UserRepository;
import com.example.auth.service.JwtService;
import com.example.auth.service.PasswordHashingService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordHashingService hashingService;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepo, PasswordHashingService hashingService, JwtService jwtService) {
        this.userRepo = userRepo;
        this.hashingService = hashingService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userRepo.findByUsername(req.getUsername())
                .filter(User::isEnabled)
                .filter(u -> hashingService.matches(req.getPassword(), u.getPasswordHash()))
                .<ResponseEntity<?>>map(u -> {
                    String token = jwtService.generateToken(u.getUsername());
                    Map<String, Object> body = new java.util.HashMap<>();
                    body.put("accessToken", token);
                    body.put("mustChangePwd", u.isMustChangePwd());
                    return ResponseEntity.ok(body);
                })
                .orElseGet(() -> ResponseEntity.status(401).body("Invalid credentials"));
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@RequestHeader("Authorization") String authHeader,
            @RequestBody PasswordChangeRequest req) {
        String username = extractUsername(authHeader);
        if (username == null)
            return ResponseEntity.status(401).build();

        return userRepo.findByUsername(username).map(u -> {
            if (!hashingService.matches(req.getOldPassword(), u.getPasswordHash()) && !u.isMustChangePwd()) {
                return ResponseEntity.status(403).body("Old password mismatch");
            }
            u.setPasswordHash(hashingService.hashPassword(req.getNewPassword()));
            u.setMustChangePwd(false);
            userRepo.save(u);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.status(404).build());
    }

    private String extractUsername(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            return null;
        String token = authHeader.substring(7);
        try {
            return jwtService.validate(token);
        } catch (Exception e) {
            return null;
        }
    }

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    public static class PasswordChangeRequest {
        private String oldPassword;
        private String newPassword;
    }
}

