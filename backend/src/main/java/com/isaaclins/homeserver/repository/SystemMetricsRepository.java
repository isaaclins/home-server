package com.isaaclins.homeserver.repository;

import com.isaaclins.homeserver.entity.SystemMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SystemMetricsRepository extends JpaRepository<SystemMetrics, Long> {

    // Get metrics for the last 24 hours
    @Query("SELECT m FROM SystemMetrics m WHERE m.timestamp >= :since ORDER BY m.timestamp DESC")
    List<SystemMetrics> findMetricsSince(@Param("since") LocalDateTime since);

    // Get latest metrics
    @Query("SELECT m FROM SystemMetrics m ORDER BY m.timestamp DESC")
    List<SystemMetrics> findLatestMetrics();

    // Delete old metrics (cleanup)
    @Modifying
    @Transactional
    @Query("DELETE FROM SystemMetrics m WHERE m.timestamp < :before")
    void deleteOldMetrics(@Param("before") LocalDateTime before);
}
