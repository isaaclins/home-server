package com.isaaclins.homeserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.security.content-security-policy:default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:}")
    private String contentSecurityPolicy;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for REST API (JWT-based authentication)
            .csrf(AbstractHttpConfigurer::disable)
            
            // Configure session management
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // Configure authorization
            .authorizeHttpRequests(authz -> authz
                // Public endpoints
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                
                // Admin endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            
            // Security headers
            .headers(headers -> headers
                // Prevent clickjacking
                .frameOptions().deny()
                
                // Prevent MIME sniffing
                .contentTypeOptions().and()
                
                // HSTS Configuration
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000) // 1 year
                    .includeSubDomains(true)
                )
                
                // Content Security Policy
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(contentSecurityPolicy)
                )
                
                // Additional security headers
                .addHeaderWriter((request, response) -> {
                    response.setHeader("X-XSS-Protection", "1; mode=block");
                    response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
                    response.setHeader("Permissions-Policy", 
                        "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()");
                    response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
                    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
                })
            );

        return http.build();
    }
}