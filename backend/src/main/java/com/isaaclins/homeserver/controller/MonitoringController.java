package com.isaaclins.homeserver.controller;

import com.isaaclins.homeserver.entity.RequestLog;
import com.isaaclins.homeserver.entity.SystemMetrics;
import com.isaaclins.homeserver.entity.User;
import com.isaaclins.homeserver.service.RequestLogService;
import com.isaaclins.homeserver.service.SystemMetricsService;
import com.isaaclins.homeserver.service.UserService;
import com.isaaclins.homeserver.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
@Slf4j
public class MonitoringController {

    private final SystemMetricsService systemMetricsService;
    private final RequestLogService requestLogService;
    private final UserService userService;
    private final JwtService jwtService;

    @GetMapping("/metrics/24h")
    public ResponseEntity<?> getSystemMetrics24h(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdminUser(authHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            List<SystemMetrics> metrics = systemMetricsService.getMetricsForLast24Hours();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            log.error("Error fetching 24h metrics", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch metrics"));
        }
    }

    @GetMapping("/metrics/latest")
    public ResponseEntity<?> getLatestMetrics(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdminUser(authHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            SystemMetrics metrics = systemMetricsService.getLatestMetrics();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            log.error("Error fetching latest metrics", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch latest metrics"));
        }
    }

    @GetMapping("/requests/recent")
    public ResponseEntity<?> getRecentRequests(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(defaultValue = "100") int limit) {
        if (!isAdminUser(authHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            List<RequestLog> logs = requestLogService.getRecentRequestLogs(limit);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            log.error("Error fetching recent requests", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch request logs"));
        }
    }

    @GetMapping("/requests/since")
    public ResponseEntity<?> getRequestsSince(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam String since) {
        if (!isAdminUser(authHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            LocalDateTime sinceDateTime = LocalDateTime.parse(since);
            List<RequestLog> logs = requestLogService.getRequestLogsSince(sinceDateTime);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            log.error("Error fetching requests since {}", since, e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch request logs"));
        }
    }

    @GetMapping("/dashboard/data")
    public ResponseEntity<?> getDashboardData(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdminUser(authHeader)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            // Get all dashboard data in one request
            List<SystemMetrics> metrics24h = systemMetricsService.getMetricsForLast24Hours();
            SystemMetrics latestMetrics = systemMetricsService.getLatestMetrics();
            List<RequestLog> recentRequests = requestLogService.getRecentRequestLogs(50);

            Map<String, Object> dashboardData = Map.of(
                    "metrics24h", metrics24h,
                    "latestMetrics", latestMetrics != null ? latestMetrics : new SystemMetrics(),
                    "recentRequests", recentRequests);

            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            log.error("Error fetching dashboard data", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch dashboard data"));
        }
    }

    private boolean isAdminUser(String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return false;
            }

            String token = authHeader.substring(7);
            if (!jwtService.validate(token)) {
                return false;
            }

            String username = jwtService.getSubject(token);
            Optional<User> userOpt = userService.getUserByUsername(username);

            return userOpt.isPresent() && userOpt.get().getIsAdmin();
        } catch (Exception e) {
            log.warn("Error validating admin user", e);
            return false;
        }
    }
}
