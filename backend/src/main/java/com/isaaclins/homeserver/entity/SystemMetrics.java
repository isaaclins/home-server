package com.isaaclins.homeserver.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_metrics")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private Double cpuUsage; // Percentage 0-100

    @Column(nullable = false)
    private Double gpuUsage; // Percentage 0-100

    @Column(nullable = false)
    private Long ramUsed; // Bytes

    @Column(nullable = false)
    private Long ramTotal; // Bytes

    @Column(nullable = false)
    private Long networkBytesReceived; // Bytes

    @Column(nullable = false)
    private Long networkBytesSent; // Bytes
}
