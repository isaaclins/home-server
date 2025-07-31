# MySQL Security Configuration Script
# This script hardens MySQL configuration for production use

#!/bin/bash

set -euo pipefail

echo "🔐 Configuring MySQL Security Settings..."

# MySQL configuration file
MYSQL_CONF="/etc/mysql/conf.d/security.cnf"

# Create security configuration
cat > "$MYSQL_CONF" << 'EOF'
[mysqld]
# Security Configuration

# Network Security
bind-address = 0.0.0.0
skip-networking = false
skip-name-resolve = true

# SSL Configuration (uncomment when SSL certs are available)
# ssl-ca = /etc/mysql/ssl/ca-cert.pem
# ssl-cert = /etc/mysql/ssl/server-cert.pem  
# ssl-key = /etc/mysql/ssl/server-key.pem
# require_secure_transport = ON

# Authentication
default-authentication-plugin = mysql_native_password
validate_password.policy = MEDIUM
validate_password.length = 12
validate_password.mixed_case_count = 1
validate_password.number_count = 1
validate_password.special_char_count = 1

# Disable dangerous features
local-infile = 0
secure-file-priv = /tmp
symbolic-links = 0

# Logging for security monitoring
log-error = /var/log/mysql/error.log
slow-query-log = 1
slow-query-log-file = /var/log/mysql/slow.log
long-query-time = 2
log-queries-not-using-indexes = 1

# Connection limits
max-connections = 100
max-connect-errors = 10
max-user-connections = 50

# Timeout settings
connect-timeout = 10
wait-timeout = 600
interactive-timeout = 600

# Buffer pool settings for security and performance
innodb-buffer-pool-size = 256M
innodb-log-file-size = 64M
innodb-flush-log-at-trx-commit = 1

# Disable external file access
secure-file-priv = /tmp

# Character set security
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

[mysql]
default-character-set = utf8mb4

[client]
default-character-set = utf8mb4
EOF

echo "✅ MySQL security configuration created at $MYSQL_CONF"

# Create database initialization script with security hardening
cat > "/docker-entrypoint-initdb.d/99-security.sql" << 'EOF'
-- Security hardening for MySQL

-- Remove test database if it exists
DROP DATABASE IF EXISTS test;

-- Remove anonymous users
DELETE FROM mysql.user WHERE User='';

-- Remove remote root login
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Update root password policy
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';

-- Create application user with limited privileges
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${MYSQL_PASSWORD}';

-- Grant only necessary privileges to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';

-- Remove FILE privilege from all users except root
UPDATE mysql.user SET File_priv='N' WHERE User != 'root';

-- Remove PROCESS privilege from application users
UPDATE mysql.user SET Process_priv='N' WHERE User != 'root';

-- Remove SUPER privilege from application users  
UPDATE mysql.user SET Super_priv='N' WHERE User != 'root';

-- Remove SHUTDOWN privilege from application users
UPDATE mysql.user SET Shutdown_priv='N' WHERE User != 'root';

-- Remove RELOAD privilege from application users
UPDATE mysql.user SET Reload_priv='N' WHERE User != 'root';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;
EOF

echo "✅ Database security initialization script created"
echo ""
echo "📋 Next steps for complete MySQL security:"
echo "1. Enable SSL/TLS encryption (certificates required)"
echo "2. Configure firewall rules to restrict database access"
echo "3. Set up database backup encryption"
echo "4. Enable audit logging if required"
echo "5. Regular security updates and monitoring"