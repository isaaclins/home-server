package com.isaaclins.homeserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

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
                // Enable CORS so preflight requests include proper headers
                .cors(Customizer.withDefaults())
                // Disable CSRF for REST API (JWT-based authentication)
                .csrf(AbstractHttpConfigurer::disable)

                // Configure session management
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Configure authorization
                .authorizeHttpRequests(authz -> authz
                        // Public endpoints
                        .requestMatchers("/", "/health").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/actuator/prometheus").permitAll()
                        .requestMatchers("/api/login").permitAll()
                        .requestMatchers("/api/register").permitAll()
                        .requestMatchers("/api/users/**").permitAll()
                        .requestMatchers("/api/admin/**").permitAll()
                        .requestMatchers("/api/monitoring/**").permitAll()
                        // Swagger/OpenAPI endpoints
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        // Allow everything else for now (controllers enforce their own checks where
                        // needed)
                        .anyRequest().permitAll())

                // Security headers
                .headers(headers -> headers
                        // Prevent clickjacking
                        .frameOptions().deny()

                        // Prevent MIME sniffing
                        .contentTypeOptions().and()

                        // HSTS Configuration
                        .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                                .maxAgeInSeconds(31536000) // 1 year
                                .includeSubDomains(true))

                        // Content Security Policy
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives(contentSecurityPolicy))

                        // Additional security headers
                        .addHeaderWriter((request, response) -> {
                            // Basic CORS headers to satisfy simple preflight checks in tests
                            response.setHeader("Access-Control-Allow-Origin", "*");
                            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                            response.setHeader("Access-Control-Allow-Headers",
                                    "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Version");
                            response.setHeader("X-XSS-Protection", "1; mode=block");
                            response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
                            response.setHeader("Permissions-Policy",
                                    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()");
                            response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                            response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                            response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
                            response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
                        }));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("X-Total-Count", "X-Page-Number", "X-Page-Size"));
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply only to API and health endpoints to avoid interfering with static
        // resources
        source.registerCorsConfiguration("/api/**", configuration);
        source.registerCorsConfiguration("/actuator/health", configuration);
        source.registerCorsConfiguration("/health", configuration);
        return source;
    }
}
