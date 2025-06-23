#!/bin/bash

echo "🔍 Testing Database Connection..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if MySQL container is running
if ! docker compose ps mysql | grep -q "running"; then
    echo "❌ MySQL container is not running. Starting services..."
    docker compose up -d mysql
    echo "⏳ Waiting for MySQL to start..."
    sleep 10
fi

echo "🔍 Checking MySQL container status..."
docker compose ps mysql

echo "🔍 Testing MySQL connection..."

# Test MySQL connection
if docker compose exec -T mysql mysqladmin ping -h localhost -u myuser -psecret 2>/dev/null; then
    echo "✅ MySQL connection successful!"
    
    echo "🔍 Testing database access..."
    if docker compose exec -T mysql mysql -u myuser -psecret -e "USE mydatabase; SHOW TABLES;" 2>/dev/null; then
        echo "✅ Database access successful!"
        echo "📊 Available tables:"
        docker compose exec -T mysql mysql -u myuser -psecret -e "USE mydatabase; SHOW TABLES;"
    else
        echo "❌ Cannot access database 'mydatabase'"
    fi
else
    echo "❌ MySQL connection failed!"
    echo "🔍 MySQL logs:"
    docker compose logs --tail=20 mysql
    exit 1
fi

echo "🚀 Database is ready for the application!" 
