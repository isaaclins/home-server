#!/bin/bash

echo "🔐 Setting up Home Server Secrets"
echo "================================="

# Check if .secrets already exists
if [ -f ".secrets" ]; then
    echo "⚠️  .secrets file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

echo "🎲 Generating secure passwords and secrets..."

# Generate random passwords
MYSQL_ROOT_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
MYSQL_USER_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

# Get current timestamp for unique naming
TIMESTAMP=$(date +%Y%m%d)

echo "📝 Creating .secrets file with generated values..."

cat > .secrets << EOF
# =======================================================
# HOME SERVER SECRETS & CONFIGURATION
# =======================================================
# Generated on $(date)
# IMPORTANT: Never commit this file to version control!
# =======================================================

# =======================================================
# MYSQL DATABASE CONFIGURATION
# =======================================================
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASS}
MYSQL_DATABASE=homeserver
MYSQL_USER=homeserver_app
MYSQL_PASSWORD=${MYSQL_USER_PASS}

# =======================================================
# BACKEND (SPRING BOOT) CONFIGURATION
# =======================================================
BACKEND_PORT=8080
BACKEND_SPRING_PROFILE=docker

# Database Connection
DB_HOST=mysql
DB_PORT=3306
DB_URL=jdbc:mysql://mysql:3306/homeserver
DB_USERNAME=homeserver_app
DB_PASSWORD=${MYSQL_USER_PASS}
DB_DRIVER=com.mysql.cj.jdbc.Driver

# JPA/Hibernate Configuration
JPA_DIALECT=org.hibernate.dialect.MySQL8Dialect
JPA_DDL_AUTO=validate
JPA_SHOW_SQL=true

# Security Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=86400000

# Actuator Configuration
MANAGEMENT_ENDPOINTS=health,info,metrics
MANAGEMENT_HEALTH_DETAILS=always

# =======================================================
# FRONTEND (NEXT.JS) CONFIGURATION
# =======================================================
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_BASE_PATH=/api
NEXT_TELEMETRY_DISABLED=1

# Environment
NODE_ENV=production
HOSTNAME=0.0.0.0

# =======================================================
# DOCKER COMPOSE CONFIGURATION
# =======================================================
COMPOSE_PROJECT_NAME=homeserver
DOCKER_NETWORK=homeserver-network

# Container Names
MYSQL_CONTAINER=homeserver-mysql-${TIMESTAMP}
BACKEND_CONTAINER=homeserver-backend-${TIMESTAMP}
FRONTEND_CONTAINER=homeserver-frontend-${TIMESTAMP}

# Volume Names
MYSQL_VOLUME=homeserver_mysql_data

# =======================================================
# DEVELOPMENT/DEBUGGING
# =======================================================
DEBUG_MODE=false
LOG_LEVEL=INFO
ENABLE_H2_CONSOLE=false

# =======================================================
# BACKUP & MAINTENANCE
# =======================================================
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=/var/backups/homeserver
EOF

# Set proper permissions
chmod 600 .secrets

echo ""
echo "✅ Secrets file created successfully!"
echo ""
echo "🔒 Generated secure passwords:"
echo "   MySQL Root: ${MYSQL_ROOT_PASS}"
echo "   MySQL User: ${MYSQL_USER_PASS}"
echo "   JWT Secret: ${JWT_SECRET:0:20}... (truncated)"
echo ""
echo "📋 Next steps:"
echo "1. Review and customize .secrets file if needed"
echo "2. Run: ./start.sh"
echo ""
echo "⚠️  IMPORTANT: Keep your .secrets file secure!"
echo "   - Never commit it to version control"
echo "   - Backup it securely"
echo "   - File permissions set to 600 (owner read/write only)" 
