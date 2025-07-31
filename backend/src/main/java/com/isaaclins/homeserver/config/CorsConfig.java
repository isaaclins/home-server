package com.isaaclins.homeserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.additional-origins:}")
    private String additionalOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // Build allowed origins list
                String[] allowedOrigins;
                if (additionalOrigins != null && !additionalOrigins.trim().isEmpty()) {
                    String[] additional = additionalOrigins.split(",");
                    allowedOrigins = new String[additional.length + 1];
                    allowedOrigins[0] = frontendUrl;
                    System.arraycopy(additional, 0, allowedOrigins, 1, additional.length);
                } else {
                    allowedOrigins = new String[]{frontendUrl};
                }

                registry.addMapping("/api/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("Authorization", "Content-Type", "X-Requested-With")
                        .allowCredentials(true)
                        .maxAge(3600); // Cache preflight for 1 hour

                // WebSocket CORS configuration
                registry.addMapping("/ws/**")
                        .allowedOrigins(allowedOrigins)
                        .allowCredentials(true);
            }
        };
    }
}
