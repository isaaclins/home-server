package com.isaaclins.homeserver.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public Map<String, Object> root() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Home Server Backend is running!");
        response.put("timestamp", LocalDateTime.now());
        response.put("endpoints", Map.of(
                "users", "/api/users",
                "health", "/actuator/health"));
        return response;
    }

    @GetMapping("/health")
    public Map<String, String> simpleHealth() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now().toString());
        return health;
    }
}
