#!/bin/bash
set -e

# Wait for MySQL to be ready
until mysqladmin ping -h"localhost" --silent; do
  echo "Waiting for MySQL..."
  sleep 2
done

# Run the init.sql script (overwrites everything)
mysql -u root -p"$MYSQL_ROOT_PASSWORD" < /docker-entrypoint-initdb.d/init.sql 
