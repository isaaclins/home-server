DROP DATABASE IF EXISTS homeserver_test;
CREATE DATABASE homeserver_test;
USE homeserver_test;

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY username_unique (username),
    UNIQUE KEY email_unique (email)
);

DROP TABLE IF EXISTS registration_codes;
CREATE TABLE registration_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL
);

DROP TABLE IF EXISTS system_metrics;
CREATE TABLE system_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    cpu_usage DOUBLE NOT NULL,
    gpu_usage DOUBLE NOT NULL,
    ram_used BIGINT NOT NULL,
    ram_total BIGINT NOT NULL,
    network_bytes_received BIGINT NOT NULL,
    network_bytes_sent BIGINT NOT NULL,
    INDEX timestamp_idx (timestamp)
);

DROP TABLE IF EXISTS request_logs;
CREATE TABLE request_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    username VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms BIGINT,
    user_agent TEXT,
    ip_address VARCHAR(45),
    INDEX timestamp_idx (timestamp),
    INDEX username_idx (username)
);
