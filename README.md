# 🏠 Home Server - Java Implementation

A comprehensive self-hosted home server solution built with **Spring Boot** that provides a unified dashboard for managing multiple services including AI chat, Git repositories, system monitoring, and administrative tools.

## 🎯 Project Overview

This home server integrates multiple self-hosted services:

- **🤖 Ollama AI Integration** - Local AI model hosting and chat interface
- **📚 Gitea** - Self-hosted Git repository management
- **💻 Web Terminal** - Browser-based SSH/terminal access (admin only)
- **📊 System Monitoring** - Real-time server resource monitoring
- **🔐 JWT Authentication** - Secure token-based authentication system
- **👥 Role-based Access Control** - User and admin privilege management

## 🚀 Features Implemented

### ✅ Authentication & Security

- **Master Password Setup** - Initial secure setup with salted, peppered, and hashed master password
- **User Registration Control** - Only users with master password can register new accounts
- **JWT-based authentication** with secure token management
- **Role-based access control** (USER, ADMIN privileges)
- **BCrypt password hashing** for user accounts
- **HTTP-only cookie management** for web sessions
- **Protected routes** with Spring Security
- **No default users** - Complete setup control from first run

### ✅ Frontend Interface

- **Modern Login Page** - Responsive design with glass morphism effects
- **Services Dashboard** - Central hub for all available services
- **User Management** - Profile and session management
- **Admin Panel** - Administrative tools and controls

### ✅ Backend Architecture

- **Spring Boot 3.5.3** with Java 17
- **Spring Security** with custom JWT filter
- **Spring Data JPA** with MySQL database
- **RESTful API** design
- **Docker Compose** for service orchestration

### ✅ Database Schema

- Users table with roles and authentication
- Chat sessions for AI conversations
- System statistics for monitoring
- Automatic database initialization

### ✅ Service Integration

- **MySQL 8.0** - Primary database
- **Ollama** - AI model hosting
- **Gitea 1.21** - Git repository management
- **Docker networking** - Isolated service communication

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Spring Boot   │    │   Services      │
│   (Thymeleaf)   │───▶│   Application   │───▶│                 │
│                 │    │                 │    │  • MySQL        │
│  • Login        │    │  • JWT Auth     │    │  • Ollama       │
│  • Dashboard    │    │  • REST APIs    │    │  • Gitea        │
│  • Services     │    │  • Web Routes   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Setup Instructions

### Prerequisites

- **Java 17** or higher
- **Docker** and **Docker Compose**
- **Gradle** (included via wrapper)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd home-server-example-java
```

### 2. Start Services

**Option A: Automated Startup (Recommended)**

```bash
# Make startup script executable and run
chmod +x start-application.sh
./start-application.sh
```

**Option B: Manual Startup**

```bash
# Start MySQL, Ollama, and Gitea services
docker compose up -d

# Wait for MySQL to be fully ready (60+ seconds)
# Check MySQL status
docker compose exec mysql mysqladmin ping -h localhost -u myuser -psecret

# If MySQL is not ready, wait longer or check logs
docker compose logs mysql
```

### 3. Run Application

```bash
# Start the Spring Boot application
```

### 4. Troubleshooting

**Database Connection Issues:**

```bash
# Clean restart all services
docker compose down --volumes
docker compose up -d

# Wait for MySQL to fully initialize (can take 60+ seconds)
# Verify MySQL is ready
docker compose exec mysql mysqladmin ping -h localhost -u myuser -psecret

# Then start the application
./gradlew bootRun
```

**Check Service Status:**

```bash
# View all service logs
docker compose logs

# Check specific service
docker compose logs mysql
docker compose logs ollama
docker compose logs gitea
```

### 5. Access the System

- **Home Server Setup**: http://localhost:8080

### 6. Initial Setup Flow

When you first access the application, you'll be guided through a secure setup process:

1. **Master Password Setup** (http://localhost:8080/setup)

   - Create a secure master password
   - This password is salted, peppered, and hashed in the database
   - Required for all future user registrations

2. **Register First Admin User** (http://localhost:8080/register?admin=true)

   - Enter the master password you just created
   - Create your first admin account with username, email, and password
   - This will be your day-to-day login account

3. **Login** (http://localhost:8080/login)
   - Use your admin credentials to log in
   - Access the services dashboard

### 7. User Registration

To add new users to your home server:

1. Go to http://localhost:8080/register
2. Enter the master password
3. Fill in the new user's details
4. Choose role (USER or ADMIN)
5. The new user can then log in with their credentials

**Security Note**: Only people who know the master password can register new users. This ensures complete control over who can access your home server.

### 8. Service Access

- **Gitea Web UI**: http://localhost:3000
- **Ollama API**: http://localhost:11434

## 🔧 Development

### Building

```bash
# Compile Java code
./gradlew compileJava

# Build without tests
./gradlew build -x test

# Run tests (requires database)
./gradlew test
```

### CI/CD

The project includes a **GitHub Actions workflow** (`startup-test.yml`) that:

- Sets up MySQL service
- Builds the application
- Tests startup and endpoints
- Validates authentication flow

## 📁 Project Structure

```
src/
├── main/
│   ├── java/com/isaaclins/homeserverexamplejava/
│   │   ├── controller/          # Web and API controllers
│   │   │   ├── AuthController.java
│   │   │   ├── HomeController.java
│   │   │   └── UserController.java
│   │   ├── entity/              # JPA entities
│   │   │   └── UserEntity.java
│   │   ├── repository/          # Data access layer
│   │   │   └── UserRepository.java
│   │   ├── service/             # Business logic
│   │   │   └── UserService.java
│   │   ├── security/            # Authentication & security
│   │   │   ├── JwtUtils.java
│   │   │   └── JwtAuthenticationFilter.java
│   │   ├── config/              # Configuration
│   │   │   └── SecurityConfig.java
│   │   └── dto/                 # Data transfer objects
│   │       ├── LoginRequest.java
│   │       └── LoginResponse.java
│   └── resources/
│       ├── templates/           # Thymeleaf templates
│       │   ├── login.html
│       │   └── services.html
│       └── application.properties
├── test/                        # Test classes
└── .github/workflows/           # CI/CD pipelines
    └── startup-test.yml
```

## 🐳 Docker Services

### MySQL Database

- **Port**: 3306
- **Database**: mydatabase
- **User**: myuser / secret
- **Includes**: Initialization script with default users

### Ollama AI

- **Port**: 11434
- **Models**: Downloaded on-demand
- **Storage**: Persistent volume for models

### Gitea Git Server

- **Port**: 3000 (HTTP), 2222 (SSH)
- **Database**: Shared MySQL instance
- **Storage**: Persistent volume for repositories

## 🔒 Security Features

- **JWT Authentication** - Stateless token-based auth
- **Role-based Authorization** - ADMIN vs USER permissions
- **Secure Password Storage** - BCrypt hashing
- **HTTP-only Cookies** - XSS protection
- **CORS Configuration** - Cross-origin request handling
- **Protected Admin Routes** - Restricted access to sensitive features

## 🎨 UI/UX Features

- **Responsive Design** - Mobile and desktop friendly
- **Modern Glass Morphism** - Beautiful translucent effects
- **Loading States** - User feedback during operations
- **Error Handling** - Graceful error messages
- **Progressive Enhancement** - Works without JavaScript

## 🚧 Current Status

### ✅ Completed Components

- [x] JWT Authentication System
- [x] User Management & Database Schema
- [x] Login & Services Dashboard UI
- [x] Docker Service Configuration
- [x] Spring Security Configuration
- [x] GitHub Actions CI/CD Pipeline
- [x] REST API Foundation

### 🔄 Next Steps

1. **Complete Ollama Integration** - Chat interface and model management
2. **Gitea API Integration** - Repository browsing and management
3. **System Monitoring** - Real-time resource tracking
4. **Admin Terminal** - Web-based SSH access
5. **WebSocket Support** - Real-time features

## 🤝 Default Users

The system initializes with these default accounts:

| Username      | Password | Role  | Description        |
| ------------- | -------- | ----- | ------------------ |
| admin         | admin123 | ADMIN | Full system access |
| \_ollama_user | admin123 | USER  | AI service access  |

## 📖 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/verify` - Token validation

### Web Routes

- `GET /` - Redirect to login or dashboard
- `GET /login` - Login page
- `GET /services` - Main dashboard
- `GET /ollama-chat` - AI chat interface
- `GET /gitea-repos` - Repository browser
- `GET /admin/*` - Administrative tools

## 🔧 Configuration

Key configuration options in `application.properties`:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/mydatabase

# JWT Configuration
app.jwt.secret=mySecretKey...
app.jwt.expiration=86400000

# External Services
ollama.base-url=http://localhost:11434
gitea.base-url=http://localhost:3000
```

## 📝 License

This project is open source and available under the MIT License.

---

**Built with ❤️ using Spring Boot, Docker, and modern web technologies.**
