package com.isaaclins.homeserver.config;

import io.micrometer.core.aop.CountedAspect;
import io.micrometer.core.aop.TimedAspect;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

@Configuration
public class MonitoringConfig {

    @Bean
    public CountedAspect countedAspect(MeterRegistry registry) {
        return new CountedAspect(registry);
    }

    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    @Component
    public static class ApplicationMetrics {
        
        private final MeterRegistry meterRegistry;
        private final AtomicLong activeUsers = new AtomicLong(0);
        private final AtomicLong totalRequests = new AtomicLong(0);
        private final AtomicLong failedRequests = new AtomicLong(0);
        private final AtomicLong securityEvents = new AtomicLong(0);
        private final Timer requestDuration;

        public ApplicationMetrics(MeterRegistry meterRegistry) {
            this.meterRegistry = meterRegistry;
            this.requestDuration = Timer.builder("http_request_duration")
                    .description("Duration of HTTP requests")
                    .register(meterRegistry);
        }

        @PostConstruct
        public void initMetrics() {
            // Register custom metrics
            meterRegistry.gauge("application.active_users", activeUsers);
            meterRegistry.gauge("application.total_requests", totalRequests);
            meterRegistry.gauge("application.failed_requests", failedRequests);
            meterRegistry.gauge("application.security_events", securityEvents);
            meterRegistry.gauge("application.startup_time", System.currentTimeMillis());
        }

        public void incrementActiveUsers() {
            activeUsers.incrementAndGet();
        }

        public void decrementActiveUsers() {
            activeUsers.decrementAndGet();
        }

        public void incrementTotalRequests() {
            totalRequests.incrementAndGet();
        }

        public void incrementFailedRequests() {
            failedRequests.incrementAndGet();
        }

        public void incrementSecurityEvents() {
            securityEvents.incrementAndGet();
        }

        public Timer.Sample startRequestTimer() {
            return Timer.start(meterRegistry);
        }

        public void recordRequestDuration(Timer.Sample sample) {
            sample.stop(requestDuration);
        }

        public long getActiveUsers() {
            return activeUsers.get();
        }

        public long getTotalRequests() {
            return totalRequests.get();
        }

        public long getFailedRequests() {
            return failedRequests.get();
        }

        public long getSecurityEvents() {
            return securityEvents.get();
        }
    }
}