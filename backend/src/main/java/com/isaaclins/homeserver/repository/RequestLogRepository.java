package com.isaaclins.homeserver.repository;

import com.isaaclins.homeserver.entity.RequestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RequestLogRepository extends JpaRepository<RequestLog, Long> {

    // Get recent request logs (for real-time display)
    @Query("SELECT r FROM RequestLog r ORDER BY r.timestamp DESC")
    List<RequestLog> findRecentRequests();

    // Get request logs since a specific time
    @Query("SELECT r FROM RequestLog r WHERE r.timestamp >= :since ORDER BY r.timestamp DESC")
    List<RequestLog> findRequestsSince(@Param("since") LocalDateTime since);

    // Delete old request logs (cleanup)
    @Modifying
    @Transactional
    @Query("DELETE FROM RequestLog r WHERE r.timestamp < :before")
    void deleteOldRequests(@Param("before") LocalDateTime before);
}
