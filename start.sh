#!/bin/bash

echo "🚀 Starting Home Server Docker Compose Setup"
echo "============================================="

# Check if .secrets file exists
if [ ! -f ".secrets" ]; then
    echo "❌ ERROR: .secrets file not found!"
    echo "📋 Please create a .secrets file with all configuration."
    echo "💡 You can copy from .secrets.example if available."
    exit 1
fi

echo "🔐 Loading secrets and creating .env for Docker Compose..."

# Create .env file for docker-compose from .secrets (compatible with all shells)
echo "# Auto-generated from .secrets file - DO NOT EDIT" > .env
echo "# Generated on: $(date)" >> .env
echo "" >> .env

# Extract values from .secrets and create .env file
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
    fi
    # Remove leading/trailing whitespace
    key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    # Skip lines that don't look like variable assignments
    if [[ -n $key && -n $value ]]; then
        echo "${key}=${value}" >> .env
    fi
done < .secrets

# If the script was invoked with 3 positional arguments we use them as the
# initial administrator credentials. These will be appended to the generated
# .env file so that the backend container can pick them up on first start.
# Usage: ./start <username> <email> <password>
if [ "$#" -eq 3 ]; then
    echo "🛡️  Configuring initial admin user from CLI arguments..."
    ADMIN_USERNAME="$1"
    ADMIN_EMAIL="$2"
    ADMIN_PASSWORD="$3"

    # Generate a random admin secret if not already present
    ADMIN_SECRET=$(openssl rand -hex 16)

    {
        echo "# Admin bootstrap credentials";
        echo "ADMIN_USERNAME=${ADMIN_USERNAME}";
        echo "ADMIN_EMAIL=${ADMIN_EMAIL}";
        echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}";
        echo "ADMIN_SECRET=${ADMIN_SECRET}";
    } >> .env

    echo "✅ Admin user variables appended to .env"
    echo "🔑 Admin secret for future requests: ${ADMIN_SECRET}"
fi

# Source the .env file to get variables for the script
set -a
source .env
set +a

echo "📦 Building and starting all services..."
docker compose up --build -d

echo ""
echo "✅ Services started! Here's what's running:"
echo ""
echo "🌐 Frontend (Next.js): http://localhost:${FRONTEND_PORT}"
echo "🔧 Backend (Spring Boot): http://localhost:${BACKEND_PORT}"
echo "🗃️  MySQL Database: localhost:${DB_PORT}"
echo "💚 Health Check: http://localhost:${BACKEND_PORT}/actuator/health"
echo ""
echo "📋 Configuration loaded from .secrets file"
echo "🔒 Database: ${MYSQL_DATABASE} (User: ${MYSQL_USER})"
echo "🏗️  Spring Profile: ${BACKEND_SPRING_PROFILE}"
echo ""
echo "📋 To view logs:"
echo "   docker compose logs -f"
echo ""
echo "🛑 To stop all services:"
echo "   docker compose down"
echo ""
echo "🔄 To restart a specific service:"
echo "   docker compose restart [service-name]"
echo "   (service names: mysql, backend, frontend)"
echo ""

# Wait a moment for services to start
sleep 5

echo "🔍 Checking service status..."
docker compose ps
