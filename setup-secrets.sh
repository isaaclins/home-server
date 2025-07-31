#!/bin/bash

echo "🔐 Setting up Home Server Secrets"
echo "================================="

# Function to generate cryptographically secure passwords
generate_secure_password() {
    local length=${1:-32}
    openssl rand -base64 $(($length * 3 / 4)) | tr -d "=+/" | cut -c1-$length
}

# Function to validate password strength
validate_password_strength() {
    local password=$1
    local min_length=24
    
    # Check minimum length
    if [ ${#password} -lt $min_length ]; then
        echo "❌ Password too short (minimum $min_length characters)"
        return 1
    fi
    
    # Check for mixed case, numbers, and symbols
    if [[ ! "$password" =~ [A-Z] ]] || [[ ! "$password" =~ [a-z] ]] || [[ ! "$password" =~ [0-9] ]]; then
        echo "❌ Password must contain uppercase, lowercase, and numbers"
        return 1
    fi
    
    return 0
}

# Function to generate JWT secret
generate_jwt_secret() {
    # JWT secret should be at least 256 bits (32 bytes) for HS256
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

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

echo "🎲 Generating cryptographically secure passwords and secrets..."

# Generate secure passwords
echo "   Generating MySQL root password..."
MYSQL_ROOT_PASS=$(generate_secure_password 32)
if ! validate_password_strength "$MYSQL_ROOT_PASS"; then
    echo "❌ Failed to generate secure MySQL root password"
    exit 1
fi

echo "   Generating MySQL user password..."
MYSQL_USER_PASS=$(generate_secure_password 32)
if ! validate_password_strength "$MYSQL_USER_PASS"; then
    echo "❌ Failed to generate secure MySQL user password"
    exit 1
fi

echo "   Generating JWT secret..."
JWT_SECRET=$(generate_jwt_secret)
if [ ${#JWT_SECRET} -lt 64 ]; then
    echo "❌ JWT secret too short (minimum 64 characters for security)"
    exit 1
fi

echo "   Generating admin credentials..."
ADMIN_SECRET=$(generate_secure_password 24)
ADMIN_PASSWORD=$(generate_secure_password 24)

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

# Admin Configuration  
ADMIN_USERNAME=admin@homeserver.local
ADMIN_EMAIL=admin@homeserver.local
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_SECRET=${ADMIN_SECRET}

# Security Settings
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=10
MAX_REQUESTS_PER_HOUR=50
ALLOWED_ORIGINS=
SECURITY_ALERT_EMAIL=admin@localhost

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
MYSQL_CONTAINER=homeserver-mysql
BACKEND_CONTAINER=homeserver-backend
FRONTEND_CONTAINER=homeserver-frontend
NGINX_CONTAINER=homeserver-nginx
REDIS_CONTAINER=homeserver-redis

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
echo "🔒 Generated secure credentials:"
echo "   MySQL Root: ${MYSQL_ROOT_PASS:0:8}... (32 chars)"
echo "   MySQL User: ${MYSQL_USER_PASS:0:8}... (32 chars)"
echo "   JWT Secret: ${JWT_SECRET:0:16}... (64 chars)"
echo "   Admin Password: ${ADMIN_PASSWORD:0:8}... (24 chars)"
echo "   Admin Secret: ${ADMIN_SECRET:0:8}... (24 chars)"
echo ""
echo "📋 Next steps:"
echo "1. Review and customize .secrets file if needed"
echo "2. Run: ./start.sh"
echo ""
echo "⚠️  IMPORTANT: Keep your .secrets file secure!"
echo "   - Never commit it to version control"
echo "   - Backup it securely"
echo "   - File permissions set to 600 (owner read/write only)" 
