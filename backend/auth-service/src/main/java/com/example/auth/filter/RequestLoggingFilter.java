package com.example.auth.filter;

import com.example.auth.model.RequestLog;
import com.example.auth.repository.RequestLogRepository;
import com.example.auth.service.JwtService;
import com.example.auth.repository.UsageRecordRepository;
import com.example.auth.model.UsageRecord;
import com.example.auth.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private final RequestLogRepository logRepo;
    private final JwtService jwtService;
    private final UsageRecordRepository usageRepo;
    private final UserRepository userRepo;

    public RequestLoggingFilter(RequestLogRepository logRepo, JwtService jwtService, UsageRecordRepository usageRepo,
            UserRepository userRepo) {
        this.logRepo = logRepo;
        this.jwtService = jwtService;
        this.usageRepo = usageRepo;
        this.userRepo = userRepo;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } finally {
            RequestLog log = new RequestLog();
            log.setTs(Instant.now());
            log.setMethod(request.getMethod());
            log.setPath(request.getRequestURI());
            log.setStatus(response.getStatus());

            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    String username = jwtService.validate(authHeader.substring(7));
                    log.setUsername(username);
                    userRepo.findByUsername(username).ifPresent(u -> {
                        UsageRecord ur = new UsageRecord();
                        ur.setUserId(u.getId());
                        ur.setContainers(1);
                        ur.setRamMb(512);
                        ur.setDiskMb(100);
                        ur.setBandwidthMb(5);
                        usageRepo.save(ur);
                    });
                } catch (Exception ignored) {
                }
            }
            logRepo.save(log);
        }
    }
}
