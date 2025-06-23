#!/bin/bash

echo "🚀 Starting Home Server Application..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Starting Docker services..."

# Stop any existing containers and remove volumes for a clean start
docker compose down --volumes 2>/dev/null || true

# Start the Docker services
docker compose up -d

echo "⏳ Waiting for MySQL to be ready..."

# Wait for MySQL to be ready
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker compose exec -T mysql mysqladmin ping -h localhost -u myuser -psecret 2>/dev/null; then
        echo "✅ MySQL is ready!"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts - waiting for MySQL..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ MySQL failed to start after $max_attempts attempts"
    echo "🔍 Checking MySQL logs:"
    docker compose logs mysql
    exit 1
fi

echo "🗄️ Initializing database..."

# Give MySQL a bit more time to fully initialize
sleep 3

echo "☕ Starting Spring Boot application..."

# Start the Spring Boot application
./gradlew bootRun 

lazydocker
