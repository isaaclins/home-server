package com.isaaclins.homeserver.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class RateLimitConfig implements WebMvcConfigurer {

    @Bean
    public Cache<String, Bucket> bucketCache() {
        return Caffeine.newBuilder()
                .maximumSize(10000)
                .expireAfterWrite(1, TimeUnit.HOURS)
                .build();
    }

    @Bean
    public HandlerInterceptor rateLimitInterceptor() {
        return new RateLimitInterceptor(bucketCache());
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor())
                .addPathPatterns("/api/**")
                .excludePathPatterns("/actuator/health");
    }

    public static class RateLimitInterceptor implements HandlerInterceptor {
        private final Cache<String, Bucket> cache;

        public RateLimitInterceptor(Cache<String, Bucket> cache) {
            this.cache = cache;
        }

        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
            String key = getKey(request);
            Bucket bucket = cache.get(key, this::createNewBucket);

            if (bucket.tryConsume(1)) {
                return true;
            } else {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Rate limit exceeded\",\"message\":\"Too many requests. Please try again later.\"}");
                return false;
            }
        }

        private String getKey(HttpServletRequest request) {
            String clientIp = getClientIP(request);
            String path = request.getRequestURI();
            
            // Different rate limits for different endpoints
            if (path.startsWith("/api/auth/")) {
                return "auth:" + clientIp;
            } else if (path.startsWith("/api/admin/")) {
                return "admin:" + clientIp;
            } else {
                return "api:" + clientIp;
            }
        }

        private String getClientIP(HttpServletRequest request) {
            String xfHeader = request.getHeader("X-Forwarded-For");
            if (xfHeader == null || xfHeader.isEmpty() || "unknown".equalsIgnoreCase(xfHeader)) {
                return request.getRemoteAddr();
            }
            return xfHeader.split(",")[0].trim();
        }

        private Bucket createNewBucket(String key) {
            if (key.startsWith("auth:")) {
                // More restrictive for auth endpoints: 5 requests per minute
                Bandwidth limit = Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1)));
                return Bucket4j.builder().addLimit(limit).build();
            } else if (key.startsWith("admin:")) {
                // Moderate for admin endpoints: 20 requests per minute
                Bandwidth limit = Bandwidth.classic(20, Refill.intervally(20, Duration.ofMinutes(1)));
                return Bucket4j.builder().addLimit(limit).build();
            } else {
                // General API endpoints: 100 requests per minute
                Bandwidth limit = Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1)));
                return Bucket4j.builder().addLimit(limit).build();
            }
        }
    }
}