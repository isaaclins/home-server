package com.isaaclins.homeserverexamplejava.controller;

import com.isaaclins.homeserverexamplejava.dto.LoginRequest;
import com.isaaclins.homeserverexamplejava.dto.LoginResponse;
import com.isaaclins.homeserverexamplejava.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest,
            HttpServletResponse response) {
        log.info("Login attempt for user: {}", loginRequest.getUsername());

        LoginResponse loginResponse = userService.authenticate(loginRequest);

        if (loginResponse.isSuccess()) {
            // Set JWT token as HTTP-only cookie for web interface
            Cookie jwtCookie = new Cookie("jwt", loginResponse.getToken());
            jwtCookie.setHttpOnly(true);
            jwtCookie.setSecure(false); // Set to true in production with HTTPS
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge(24 * 60 * 60); // 24 hours
            response.addCookie(jwtCookie);

            // Set refresh token as HTTP-only cookie
            Cookie refreshCookie = new Cookie("refreshToken", loginResponse.getRefreshToken());
            refreshCookie.setHttpOnly(true);
            refreshCookie.setSecure(false); // Set to true in production with HTTPS
            refreshCookie.setPath("/");
            refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
            response.addCookie(refreshCookie);

            log.info("User {} logged in successfully", loginRequest.getUsername());
            return ResponseEntity.ok(loginResponse);
        } else {
            log.warn("Failed login attempt for user: {}", loginRequest.getUsername());
            return ResponseEntity.badRequest().body(loginResponse);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletResponse response) {
        // Clear cookies
        Cookie jwtCookie = new Cookie("jwt", "");
        jwtCookie.setHttpOnly(true);
        jwtCookie.setPath("/");
        jwtCookie.setMaxAge(0);
        response.addCookie(jwtCookie);

        Cookie refreshCookie = new Cookie("refreshToken", "");
        refreshCookie.setHttpOnly(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);
        response.addCookie(refreshCookie);

        return ResponseEntity.ok("Logged out successfully");
    }

    @GetMapping("/verify")
    public ResponseEntity<String> verifyToken() {
        // This endpoint will be protected by the JWT filter
        // If we reach here, the token is valid
        return ResponseEntity.ok("Token is valid");
    }
}
