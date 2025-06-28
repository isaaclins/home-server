package com.isaaclins.homeserver.service;

import com.isaaclins.homeserver.entity.RequestLog;
import com.isaaclins.homeserver.repository.RequestLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequestLogService {

    private final RequestLogRepository requestLogRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void logRequest(String username, String method, String endpoint,
            Integer statusCode, Long responseTime,
            String userAgent, String ipAddress) {
        try {
            RequestLog requestLog = new RequestLog();
            requestLog.setTimestamp(LocalDateTime.now());
            requestLog.setUsername(username != null ? username : "anonymous");
            requestLog.setMethod(method);
            requestLog.setEndpoint(endpoint);
            requestLog.setStatusCode(statusCode);
            requestLog.setResponseTimeMs(responseTime);
            requestLog.setUserAgent(userAgent);
            requestLog.setIpAddress(ipAddress);

            RequestLog savedLog = requestLogRepository.save(requestLog);

            // Send real-time update via WebSocket
            messagingTemplate.convertAndSend("/topic/request-logs", formatRequestLog(savedLog));

            log.debug("Logged request: {} {} {} - {} ({}ms)",
                    method, endpoint, username, statusCode, responseTime);

        } catch (Exception e) {
            log.error("Error logging request", e);
        }
    }

    public List<RequestLog> getRecentRequestLogs(int limit) {
        List<RequestLog> logs = requestLogRepository.findRecentRequests();
        return logs.size() > limit ? logs.subList(0, limit) : logs;
    }

    public List<RequestLog> getRequestLogsSince(LocalDateTime since) {
        return requestLogRepository.findRequestsSince(since);
    }

    @Scheduled(fixedRate = 3600000) // Cleanup old request logs every hour
    public void cleanupOldRequestLogs() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(3); // Keep 3 days of request logs
            requestLogRepository.deleteOldRequests(cutoff);
            log.info("Cleaned up old request logs older than {}", cutoff);
        } catch (Exception e) {
            log.error("Error cleaning up old request logs", e);
        }
    }

    private String formatRequestLog(RequestLog log) {
        return String.format("[%s]: %s (%s %s) (%d)",
                log.getTimestamp(),
                log.getUsername(),
                log.getMethod(),
                log.getEndpoint(),
                log.getStatusCode());
    }
}
