package com.isaaclins.homeserver.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class UrlNormalizationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String originalUri = request.getRequestURI();

        if (originalUri != null && originalUri.contains("//")) {
            String normalized = originalUri.replaceAll("/+", "/");
            if (!normalized.equals(originalUri)) {
                request.getRequestDispatcher(normalized).forward(request, response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
