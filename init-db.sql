-- Initialize Home Server Database
-- This script runs when the MySQL container starts for the first time

-- Create database for Gitea if it doesn't exist
CREATE DATABASE IF NOT EXISTS gitea;

-- Create user for Gitea
CREATE USER IF NOT EXISTS 'gitea'@'%' IDENTIFIED WITH mysql_native_password BY 'gitea123';
GRANT ALL PRIVILEGES ON gitea.* TO 'gitea'@'%';

-- The myuser@'%' is already created by Docker environment variables
-- Now create additional host-specific users for better connectivity

-- Create myuser for localhost specifically (MySQL treats localhost differently)
CREATE USER IF NOT EXISTS 'myuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'secret';
GRANT ALL PRIVILEGES ON mydatabase.* TO 'myuser'@'localhost';

-- Create myuser for 127.0.0.1 specifically
CREATE USER IF NOT EXISTS 'myuser'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'secret';
GRANT ALL PRIVILEGES ON mydatabase.* TO 'myuser'@'127.0.0.1';

-- Create root users for localhost and 127.0.0.1 with native password
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'verysecret';
CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'verysecret';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;

-- Also update the existing myuser@'%' to use native password
ALTER USER 'myuser'@'%' IDENTIFIED WITH mysql_native_password BY 'secret';

-- Use the main application database
USE mydatabase;

-- Create system_config table for application configuration
CREATE TABLE IF NOT EXISTS system_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: Admin user will be created through the setup process
-- No default users are created here to ensure proper setup flow

-- Flush privileges to ensure all changes take effect
FLUSH PRIVILEGES; 
