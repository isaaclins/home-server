package com.isaaclins.homeserver.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Security headers filter to add essential security headers to all responses.
 * Implements OWASP recommended security headers for web applications.
 */
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        // Determine if we're in a secure context (HTTPS)
        boolean isSecure = request.isSecure() || 
                          "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto")) ||
                          "https".equalsIgnoreCase(request.getScheme());

        // HSTS - HTTP Strict Transport Security (only for HTTPS)
        if (isSecure) {
            response.setHeader("Strict-Transport-Security", 
                "max-age=31536000; includeSubDomains; preload");
        }

        // Content Security Policy
        response.setHeader("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self'; " +
            "connect-src 'self' " + frontendUrl + "; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'");

        // X-Frame-Options - Clickjacking protection
        response.setHeader("X-Frame-Options", "DENY");

        // X-Content-Type-Options - MIME sniffing protection
        response.setHeader("X-Content-Type-Options", "nosniff");

        // X-XSS-Protection
        response.setHeader("X-XSS-Protection", "1; mode=block");

        // Referrer Policy
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Cache Control for sensitive endpoints
        String requestPath = request.getRequestURI();
        if (isSensitiveEndpoint(requestPath)) {
            response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            response.setHeader("Pragma", "no-cache");
            response.setHeader("Expires", "0");
        }

        // Remove server information
        response.setHeader("Server", "");

        // Feature Policy / Permissions Policy
        response.setHeader("Permissions-Policy", 
            "geolocation=(), microphone=(), camera=(), payment=(), usb=()");

        filterChain.doFilter(request, response);
    }

    private boolean isSensitiveEndpoint(String path) {
        return path.startsWith("/api/auth/") || 
               path.startsWith("/api/admin/") ||
               path.startsWith("/api/users/") ||
               path.startsWith("/actuator/");
    }
}