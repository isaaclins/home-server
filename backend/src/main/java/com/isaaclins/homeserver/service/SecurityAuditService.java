package com.isaaclins.homeserver.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class SecurityAuditService {

    private static final Logger securityLogger = LoggerFactory.getLogger("SECURITY");
    private static final Logger accessLogger = LoggerFactory.getLogger("ACCESS");

    public void logSecurityEvent(String eventType, String description, String username, HttpServletRequest request) {
        logSecurityEvent(eventType, description, username, request, null);
    }

    public void logSecurityEvent(String eventType, String description, String username, HttpServletRequest request, Map<String, Object> additionalData) {
        try {
            // Set MDC for structured logging
            MDC.put("eventType", eventType);
            MDC.put("username", username != null ? username : "anonymous");
            MDC.put("clientIp", getClientIP(request));
            MDC.put("userAgent", request.getHeader("User-Agent"));
            MDC.put("requestUri", request.getRequestURI());
            MDC.put("method", request.getMethod());

            Map<String, Object> logData = new HashMap<>();
            logData.put("timestamp", LocalDateTime.now().toString());
            logData.put("eventType", eventType);
            logData.put("description", description);
            logData.put("username", username);
            logData.put("clientIp", getClientIP(request));
            logData.put("userAgent", request.getHeader("User-Agent"));
            logData.put("requestUri", request.getRequestURI());
            logData.put("method", request.getMethod());
            logData.put("sessionId", request.getSession(false) != null ? request.getSession().getId() : null);

            if (additionalData != null) {
                logData.putAll(additionalData);
            }

            securityLogger.info("Security Event: {}", logData);

        } finally {
            MDC.clear();
        }
    }

    public void logAccessEvent(HttpServletRequest request, int statusCode, long responseTime) {
        try {
            MDC.put("clientIp", getClientIP(request));
            MDC.put("method", request.getMethod());
            MDC.put("uri", request.getRequestURI());
            MDC.put("statusCode", String.valueOf(statusCode));
            MDC.put("responseTime", String.valueOf(responseTime));

            String logMessage = String.format("%s %s %s %d %dms",
                    getClientIP(request),
                    request.getMethod(),
                    request.getRequestURI(),
                    statusCode,
                    responseTime);

            accessLogger.info(logMessage);

        } finally {
            MDC.clear();
        }
    }

    public void logAuthenticationSuccess(String username, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("authMethod", "jwt");
        logSecurityEvent("AUTHENTICATION_SUCCESS", "User successfully authenticated", username, request, data);
    }

    public void logAuthenticationFailure(String username, String reason, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("reason", reason);
        data.put("severity", "HIGH");
        logSecurityEvent("AUTHENTICATION_FAILURE", "Authentication failed: " + reason, username, request, data);
    }

    public void logAccountLockout(String username, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("severity", "HIGH");
        data.put("action", "ACCOUNT_LOCKED");
        logSecurityEvent("ACCOUNT_LOCKOUT", "Account locked due to multiple failed login attempts", username, request, data);
    }

    public void logPasswordChange(String username, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("action", "PASSWORD_CHANGED");
        logSecurityEvent("PASSWORD_CHANGE", "User password changed", username, request, data);
    }

    public void logUnauthorizedAccess(String username, String resource, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("resource", resource);
        data.put("severity", "HIGH");
        logSecurityEvent("UNAUTHORIZED_ACCESS", "Unauthorized access attempt to resource: " + resource, username, request, data);
    }

    public void logRateLimitExceeded(String clientIp, String endpoint, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("endpoint", endpoint);
        data.put("severity", "MEDIUM");
        logSecurityEvent("RATE_LIMIT_EXCEEDED", "Rate limit exceeded for endpoint: " + endpoint, null, request, data);
    }

    public void logSuspiciousActivity(String description, String username, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("severity", "HIGH");
        data.put("flagged", true);
        logSecurityEvent("SUSPICIOUS_ACTIVITY", description, username, request, data);
    }

    public void logDataExport(String username, String dataType, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("dataType", dataType);
        data.put("action", "DATA_EXPORT");
        logSecurityEvent("DATA_EXPORT", "Data export performed: " + dataType, username, request, data);
    }

    public void logConfigurationChange(String username, String configType, String changeDescription, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("configType", configType);
        data.put("changeDescription", changeDescription);
        data.put("severity", "MEDIUM");
        logSecurityEvent("CONFIGURATION_CHANGE", "Configuration changed: " + configType, username, request, data);
    }

    public void logUserCreation(String adminUsername, String createdUsername, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("createdUser", createdUsername);
        data.put("action", "USER_CREATED");
        logSecurityEvent("USER_CREATION", "New user created: " + createdUsername, adminUsername, request, data);
    }

    public void logUserDeletion(String adminUsername, String deletedUsername, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("deletedUser", deletedUsername);
        data.put("action", "USER_DELETED");
        data.put("severity", "HIGH");
        logSecurityEvent("USER_DELETION", "User deleted: " + deletedUsername, adminUsername, request, data);
    }

    public void logPrivilegeEscalation(String adminUsername, String targetUsername, String newRole, HttpServletRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("targetUser", targetUsername);
        data.put("newRole", newRole);
        data.put("action", "PRIVILEGE_CHANGE");
        data.put("severity", "HIGH");
        logSecurityEvent("PRIVILEGE_ESCALATION", "User privileges changed: " + targetUsername + " -> " + newRole, adminUsername, request, data);
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || "unknown".equalsIgnoreCase(xfHeader)) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}