package com.isaaclins.homeserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:*}")
    private String[] allowedOrigins;

    @Value("${app.cors.max-age:3600}")
    private long maxAge;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin",
                                "X-API-Version")
                        .exposedHeaders("X-Total-Count", "X-Page-Number", "X-Page-Size")
                        .allowCredentials(false)
                        .maxAge(maxAge);

                // Health endpoints for monitoring (more restrictive)
                registry.addMapping("/actuator/health")
                        .allowedOrigins("*")
                        .allowedMethods("GET")
                        .allowCredentials(false)
                        .maxAge(3600);
            }
        };
    }
}
