# Home Server - Developer Documentation

> **Comprehensive developer guide for the Home Server project** - A full-stack application with Spring Boot backend, Next.js frontend, and MySQL database, all containerized with Docker.

## 🏗️ Architecture Overview

This project implements a modern, containerized full-stack application with the following components:

### **Backend (Spring Boot)**

- **Framework**: Spring Boot 3.2.4 with Java 17
- **Database**: JPA/Hibernate with MySQL 8.0 (H2 for testing)
- **Security**: JWT authentication ready (configured but not fully implemented)
- **Monitoring**: Spring Boot Actuator with health endpoints
- **API**: RESTful endpoints with CRUD operations for User management

### **Frontend (Next.js)**

- **Framework**: Next.js 15.3.4 with React 19
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with custom component library
- **UI Components**: Lucide React icons, Class Variance Authority for component variants
- **Development**: Turbopack for fast development builds

### **Database & Infrastructure**

- **Database**: MySQL 8.0 with automated schema initialization
- **Containerization**: Docker Compose orchestration
- **Networking**: Custom bridge network for service communication
- **Volumes**: Persistent MySQL data storage

## 📋 Project Structure

```
home-server/
├── backend/                    # Spring Boot REST API
│   ├── src/main/java/com/isaaclins/homeserver/
│   │   ├── BackendApplication.java         # Main Spring Boot application
│   │   ├── controller/
│   │   │   ├── HealthController.java       # Health check endpoints
│   │   │   └── UserController.java         # User CRUD operations
│   │   └── entity/
│   │       └── User.java                   # JPA entity with Lombok
│   ├── pom.xml                            # Maven dependencies & build config
│   └── Dockerfile                         # Backend container configuration
├── frontend/                   # Next.js TypeScript application
│   ├── app/                               # Next.js 13+ app directory
│   ├── components.json                    # Shadcn/ui configuration
│   ├── package.json                      # Node dependencies & scripts
│   └── Dockerfile                         # Frontend container configuration
├── db/
│   └── init.sql                          # Database schema initialization
├── tests/                     # Test automation scripts
│   ├── 00-fail.sh                       # Intentional failure test
│   └── 01-succeed.sh                    # Success test case
├── compose.yml                # Docker Compose orchestration
├── start.sh                   # Production startup script
├── setup-secrets.sh           # Secure configuration generator
└── run-test.sh               # Automated testing framework
```

## 🛠️ Technical Implementation Details

### **Backend Architecture**

#### **Dependencies & Frameworks**

- **Spring Boot Starter Web**: RESTful web services
- **Spring Boot Starter Data JPA**: Database abstraction layer
- **Spring Boot Starter Actuator**: Production monitoring
- **MySQL Connector**: Production database driver
- **H2 Database**: In-memory testing database
- **Lombok**: Boilerplate code reduction

#### **API Endpoints**

```
GET    /users         # List all users
GET    /users/{id}    # Get user by ID
POST   /users         # Create new user
PUT    /users/{id}    # Update existing user
DELETE /users/{id}    # Delete user

GET    /actuator/health    # Health check endpoint
```

#### **Data Model**

```java
@Entity User {
    Long id                    // Auto-generated primary key
    String username           // Unique username
    String email             // User email address
    String hashedPassword    // Encrypted password
    LocalDateTime createdAt  // Auto-set creation timestamp
}
```

### **Frontend Architecture**

#### **Tech Stack**

- **Next.js 15.3.4**: React framework with app directory
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **Component Library**: Custom components with CVA for variants

#### **Development Features**

- **Turbopack**: Lightning-fast development builds
- **ESLint**: Code quality enforcement
- **Hot Reloading**: Instant development feedback

### **Infrastructure & DevOps**

#### **Docker Composition**

- **Multi-stage builds**: Optimized container images
- **Health checks**: Automatic service health monitoring
- **Dependency management**: Proper service startup ordering
- **Network isolation**: Custom bridge network for security

#### **Configuration Management**

- **Environment-based**: Separate configs for development/production
- **Secret management**: Automated generation with `setup-secrets.sh`
- **Flexible deployment**: Easy port and service customization

## 🚀 Development Workflow

### **Initial Setup**

1. **Generate secure configuration**:

   ```bash
   ./setup-secrets.sh
   ```

   This creates a `.secrets` file with:

   - Randomly generated MySQL passwords
   - JWT secret key (64-character base64)
   - All necessary environment variables

2. **Start the entire stack**:
   ```bash
   ./start.sh
   ```
   This script:
   - Validates `.secrets` file existence
   - Converts secrets to Docker Compose format
   - Builds and starts all containers
   - Provides status overview and useful commands

### **Development Environments**

#### **Containerized Development** (Recommended)

```bash
# Start all services
./start.sh

# View logs
docker compose logs -f

# Restart specific service
docker compose restart backend

# Stop everything
docker compose down
```

#### **Local Development**

```bash
# Backend (requires Java 17 & Maven)
cd backend
mvn spring-boot:run

# Frontend (requires Node.js)
cd frontend
npm run dev
```

### **Testing Framework**

#### **Automated Testing**

```bash
./run-test.sh
```

**Features:**

- **Server lifecycle management**: Automatic start/stop of Spring Boot
- **Health monitoring**: Waits for server readiness before testing
- **Configurable behavior**:
  - `STOP_ON_ERROR=true/false`: Continue or halt on first failure
  - `MAX_WAIT_SECONDS`: Server startup timeout
  - `SERVER_URL`: Custom health check endpoint
- **Comprehensive reporting**: Pass/fail statistics with percentages
- **Signal handling**: Graceful cleanup on interruption

#### **Test Structure**

- Tests located in `tests/*.sh`
- Each test is an independent bash script
- Exit code 0 = success, non-zero = failure
- Example tests included (failure and success scenarios)

## 🔧 Configuration Details

### **Environment Variables**

The `.secrets` file contains all configuration:

#### **Database Configuration**

```bash
MYSQL_ROOT_PASSWORD=<generated>
MYSQL_DATABASE=homeserver
MYSQL_USER=homeserver_app
MYSQL_PASSWORD=<generated>
```

#### **Backend Configuration**

```bash
BACKEND_PORT=8080
SPRING_PROFILES_ACTIVE=docker
DB_URL=jdbc:mysql://mysql:3306/homeserver
JWT_SECRET=<64-char-generated>
```

#### **Frontend Configuration**

```bash
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=production
```

### **Service Endpoints**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/actuator/health
- **Database**: localhost:3306

## 📊 Development Features

### **Backend Features**

- **In-memory user storage**: ConcurrentHashMap for demo purposes
- **Sample data**: Pre-loaded test users
- **Thread-safe operations**: Atomic ID generation
- **Production-ready**: Easy migration to database repository
- **Health monitoring**: Actuator endpoints for system monitoring

### **Frontend Features**

- **Modern React**: Latest React 19 with Next.js 15
- **TypeScript**: Full type safety throughout the application
- **Component library**: Reusable UI components with Tailwind CSS
- **Development optimization**: Turbopack for faster builds

### **DevOps Features**

- **One-command setup**: `./setup-secrets.sh` → `./start.sh`
- **Automated testing**: Comprehensive test runner with reporting
- **Health monitoring**: Built-in health checks for all services
- **Easy scaling**: Docker Compose ready for horizontal scaling
- **Security**: Automated secret generation and proper file permissions

## 🎯 Production Considerations

### **Implemented**

- ✅ Container orchestration with Docker Compose
- ✅ Health checks and monitoring
- ✅ Secure secret management
- ✅ Database initialization and persistence
- ✅ Environment-specific configuration
- ✅ Automated testing framework

### **Ready for Enhancement**

- 🔄 Database repository pattern (currently in-memory)
- 🔄 JWT authentication implementation (configured but not used)
- 🔄 Frontend-backend integration
- 🔄 API error handling and validation
- 🔄 Production database migrations
- 🔄 SSL/TLS configuration

## 📚 Next Steps for Developers

1. **Implement JPA repositories** to replace in-memory storage
2. **Add JWT authentication** flow (backend configuration exists)
3. **Create frontend pages** to consume backend APIs
4. **Add input validation** and error handling
5. **Implement database migrations** for schema versioning
6. **Add comprehensive logging** and monitoring
7. **Set up CI/CD pipeline** for automated deployment

---

**Built with ❤️ using Spring Boot, Next.js, and Docker**
