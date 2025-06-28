package com.isaaclins.homeserver.config;

import com.isaaclins.homeserver.service.JwtService;
import com.isaaclins.homeserver.service.RequestLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
@Slf4j
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private final RequestLogService requestLogService;
    private final JwtService jwtService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Store start time for response time calculation
        request.setAttribute("startTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
            Object handler, Exception ex) {
        try {
            // Skip health check endpoints and static resources
            String uri = request.getRequestURI();
            if (uri.startsWith("/actuator") || uri.startsWith("/ws") ||
                    uri.startsWith("/static") || uri.endsWith(".ico")) {
                return;
            }

            // Calculate response time
            Long startTime = (Long) request.getAttribute("startTime");
            Long responseTime = startTime != null ? System.currentTimeMillis() - startTime : 0L;

            // Extract username from JWT token
            String username = extractUsernameFromRequest(request);

            // Get client IP
            String clientIp = getClientIpAddress(request);

            // Log the request
            requestLogService.logRequest(
                    username,
                    request.getMethod(),
                    uri,
                    response.getStatus(),
                    responseTime,
                    request.getHeader("User-Agent"),
                    clientIp);

        } catch (Exception e) {
            log.warn("Error in request logging interceptor", e);
        }
    }

    private String extractUsernameFromRequest(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                return jwtService.getSubject(token);
            }
        } catch (Exception e) {
            log.debug("Could not extract username from token", e);
        }
        return "anonymous";
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}
