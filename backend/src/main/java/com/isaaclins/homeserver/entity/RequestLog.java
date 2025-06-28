package com.isaaclins.homeserver.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "request_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String username; // User who made the request (or "anonymous")

    @Column(nullable = false)
    private String method; // HTTP method (GET, POST, etc.)

    @Column(nullable = false)
    private String endpoint; // Request path

    @Column(nullable = false)
    private Integer statusCode; // HTTP status code

    @Column
    private Long responseTimeMs; // Response time in milliseconds

    @Column
    private String userAgent; // User agent string

    @Column
    private String ipAddress; // Client IP address
}
