package com.isaaclins.homeserver.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Simple in-memory rate limiting filter for authentication endpoints.
 * In production, this should be replaced with Redis-based implementation.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 10;
    private static final int MAX_REQUESTS_PER_HOUR = 50;
    private static final long MINUTE_IN_MS = 60 * 1000;
    private static final long HOUR_IN_MS = 60 * 60 * 1000;

    // In-memory storage - should be Redis in production
    private final ConcurrentHashMap<String, RateLimitInfo> rateLimitMap = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String requestPath = request.getRequestURI();
        
        // Apply rate limiting only to authentication endpoints
        if (isAuthEndpoint(requestPath)) {
            String clientIp = getClientIpAddress(request);
            
            if (isRateLimitExceeded(clientIp)) {
                response.setStatus(429); // Too Many Requests
                response.setHeader("X-RateLimit-Limit", String.valueOf(MAX_REQUESTS_PER_MINUTE));
                response.setHeader("X-RateLimit-Remaining", "0");
                response.setHeader("Retry-After", "60");
                response.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\"}");
                return;
            }
        }
        
        filterChain.doFilter(request, response);
    }

    private boolean isAuthEndpoint(String path) {
        return path.startsWith("/api/auth/") || 
               path.startsWith("/api/admin/");
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    private boolean isRateLimitExceeded(String clientIp) {
        long currentTime = System.currentTimeMillis();
        
        RateLimitInfo rateLimitInfo = rateLimitMap.computeIfAbsent(clientIp, k -> new RateLimitInfo());
        
        // Clean up old entries
        if (currentTime - rateLimitInfo.getLastMinuteReset() > MINUTE_IN_MS) {
            rateLimitInfo.resetMinuteCounter(currentTime);
        }
        
        if (currentTime - rateLimitInfo.getLastHourReset() > HOUR_IN_MS) {
            rateLimitInfo.resetHourCounter(currentTime);
        }
        
        // Check limits
        if (rateLimitInfo.getMinuteRequestCount().incrementAndGet() > MAX_REQUESTS_PER_MINUTE) {
            return true;
        }
        
        if (rateLimitInfo.getHourRequestCount().incrementAndGet() > MAX_REQUESTS_PER_HOUR) {
            return true;
        }
        
        return false;
    }

    private static class RateLimitInfo {
        private final AtomicInteger minuteRequestCount = new AtomicInteger(0);
        private final AtomicInteger hourRequestCount = new AtomicInteger(0);
        private final AtomicLong lastMinuteReset = new AtomicLong(System.currentTimeMillis());
        private final AtomicLong lastHourReset = new AtomicLong(System.currentTimeMillis());

        public AtomicInteger getMinuteRequestCount() {
            return minuteRequestCount;
        }

        public AtomicInteger getHourRequestCount() {
            return hourRequestCount;
        }

        public long getLastMinuteReset() {
            return lastMinuteReset.get();
        }

        public long getLastHourReset() {
            return lastHourReset.get();
        }

        public void resetMinuteCounter(long currentTime) {
            minuteRequestCount.set(0);
            lastMinuteReset.set(currentTime);
        }

        public void resetHourCounter(long currentTime) {
            hourRequestCount.set(0);
            lastHourReset.set(currentTime);
        }
    }
}