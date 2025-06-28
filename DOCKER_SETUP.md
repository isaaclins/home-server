# Docker Compose Setup Guide

This Docker Compose configuration sets up a complete home server environment with centralized secrets management.

## 🔐 Secrets Management

**All sensitive configuration is stored in a single `.secrets` file** containing passwords, database connections, and all environment-specific settings.

### Quick Setup

#### Option 1: Automatic Setup (Recommended)

```bash
# Generate secure secrets automatically
./setup-secrets.sh

# Start all services
./docker-start.sh
```

#### Option 2: Manual Setup

```bash
# Copy and customize the template
cp .secrets.example .secrets

# Edit the file with your own values
nano .secrets

# Start all services
./docker-start.sh
```

## Services

### 🗃️ MySQL Database

- **Port**: Configurable via `DB_PORT` (default: 3306)
- **Database**: Configurable via `MYSQL_DATABASE`
- **User**: Configurable via `MYSQL_USER`
- **Password**: Configurable via `MYSQL_PASSWORD`
- **Initialization**: Automatically runs `db/init.sql` on first start
- **Data Persistence**: Uses Docker volume (configurable name)

### 🔧 Java Backend (Spring Boot)

- **Port**: Configurable via `BACKEND_PORT` (default: 8080)
- **Framework**: Spring Boot 3.2.4 with Java 17
- **Database**: Auto-configured from secrets file
- **Health Check**: Available at `/actuator/health`
- **Security**: JWT tokens with configurable secret
- **Features**: REST API, JPA/Hibernate, Actuator monitoring

### 🌐 Frontend (Next.js)

- **Port**: Configurable via `FRONTEND_PORT` (default: 3000)
- **Framework**: Next.js 15 with React 19
- **API Connection**: Auto-configured from secrets file
- **Build**: Optimized production build with standalone output

## Configuration Structure

The `.secrets` file contains all configuration organized by service:

```bash
# MySQL Database
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=homeserver
MYSQL_USER=homeserver_app
MYSQL_PASSWORD=your_user_password

# Backend Configuration
DB_URL=jdbc:mysql://mysql:3306/homeserver
JWT_SECRET=your_jwt_secret
BACKEND_PORT=8080

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
FRONTEND_PORT=3000

# Docker Configuration
MYSQL_CONTAINER=homeserver-mysql
BACKEND_CONTAINER=homeserver-backend
FRONTEND_CONTAINER=homeserver-frontend
```

## Service URLs

- **Frontend**: http://localhost:${FRONTEND_PORT}
- **Backend API**: http://localhost:${BACKEND_PORT}
- **Health Check**: http://localhost:${BACKEND_PORT}/actuator/health
- **MySQL**: localhost:${DB_PORT}

## Security Features

- **🔒 Centralized Secrets**: All passwords and sensitive config in one file
- **🚫 Git Protection**: `.secrets` automatically ignored by Git
- **🎲 Random Generation**: Auto-generated secure passwords
- **🛡️ File Permissions**: Secrets file restricted to owner only (600)
- **🔑 JWT Security**: Configurable JWT secret for authentication

## Useful Commands

```bash
# Setup with auto-generated secrets
./setup-secrets.sh

# Start all services
./docker-start.sh

# View service status
docker compose ps

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql

# Restart specific service
docker compose restart backend

# Access MySQL with your configured credentials
docker compose exec mysql mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE}

# Remove everything (including volumes)
docker compose down -v
```

## Environment Variables Reference

### Database

- `MYSQL_ROOT_PASSWORD` - MySQL root password
- `MYSQL_DATABASE` - Database name
- `MYSQL_USER` - Application database user
- `MYSQL_PASSWORD` - Application database password
- `DB_HOST` - Database host (internal: mysql)
- `DB_PORT` - Database port
- `DB_URL` - Complete JDBC URL

### Backend

- `BACKEND_PORT` - Backend service port
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRATION` - JWT token expiration time
- `LOG_LEVEL` - Application log level

### Frontend

- `FRONTEND_PORT` - Frontend service port
- `NEXT_PUBLIC_API_URL` - Backend API URL for browser
- `NEXT_PUBLIC_API_BASE_PATH` - API base path

### Docker

- `COMPOSE_PROJECT_NAME` - Docker Compose project name
- `MYSQL_CONTAINER` - MySQL container name
- `BACKEND_CONTAINER` - Backend container name
- `FRONTEND_CONTAINER` - Frontend container name
- `MYSQL_VOLUME` - MySQL data volume name

## File Structure

```
├── .secrets              # ⚠️ Your secrets (DO NOT COMMIT!)
├── .secrets.example      # Template for secrets file
├── setup-secrets.sh      # Auto-generate secure secrets
├── docker-start.sh       # Start all services
├── compose.yml           # Docker Compose configuration
├── backend/
│   ├── Dockerfile
│   └── src/main/resources/
│       └── application-docker.properties
└── frontend/
    ├── Dockerfile
    └── next.config.ts
```

## Troubleshooting

1. **Missing secrets file**: Run `./setup-secrets.sh` first
2. **Permission denied**: Check `.secrets` file permissions (`chmod 600 .secrets`)
3. **Database connection issues**: Verify MySQL credentials in `.secrets`
4. **Port conflicts**: Update port numbers in `.secrets` file
5. **Build issues**: Try `docker compose build --no-cache`

## Security Best Practices

✅ **DO:**

- Use the auto-generated secrets from `setup-secrets.sh`
- Keep `.secrets` file permissions restricted (600)
- Backup your `.secrets` file securely
- Use different passwords for different environments

❌ **DON'T:**

- Commit `.secrets` file to version control
- Share secrets via insecure channels
- Use default/weak passwords in production
- Store secrets in environment files that might be committed
