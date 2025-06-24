# Home Server Project - Self-Hosted PaaS Platform with AI Integration

## Project Purpose

This is a **comprehensive self-hosted Platform-as-a-Service (PaaS) solution** designed for personal use, teams, and small organizations. It provides a unified dashboard for deploying, managing, and monitoring containerized applications with integrated AI capabilities. The platform emphasizes organizational multi-tenancy, resource management, external accessibility, and ease of deployment.

## Host Environment & Deployment Target

- **Hardware**: 32 GB DDR5 RAM, NVIDIA RTX 3060 Ti GPU, AMD Ryzen 7 7800X3D CPU
- **Operating System**: Any lightweight Unix-like server distribution (e.g., Ubuntu Server 22.04, Debian 12).
- **Domain Template**: Designed to run under a configurable sub-domain (default example: `server.isaaclins.com`).

## Minimum Viable Product (MVP)

The first public release focuses on two pillars:

1. **User Management**  
   • Admin-only user provisioning.  
   • Mandatory password change on first login.
2. **Ollama Chat Interface**  
   • GPU-accelerated inference (leverages the RTX 3060 Ti).  
   • Ships with _no_ default models; admin can pull models via a built-in Model Manager UI.

## Architecture Overview

### **Core Platform Features**

- [ ] **PaaS Deployment Engine** - Deploy any Dockerized application with automatic URL generation
- [ ] **Organizational Multi-Tenancy** - Role-based access control with resource quotas
- [ ] **Ollama AI Integration** - Local AI model hosting and chat interface for content generation
- [ ] **Gitea Integration** - Self-hosted Git repository management
- [ ] **Web Terminal** - Browser-based SSH/terminal access (admin only)
- [ ] **System Monitoring** - Real-time server resource monitoring and quota management
- [ ] **External Domain Access** - Automatic SSL certificates and subdomain management

## Key Features

### **1. Platform-as-a-Service Core**

- [ ] **Dockerfile Upload & Deployment**: Users upload Dockerfiles and get automatic service deployment
- [ ] **Automatic URL Generation**: Each service gets a subdomain (service-name.yourdomain.com)
- [ ] **Service Management**: Start, stop, restart, and delete deployed services
- [ ] **Application Types Supported**:
  - Web applications (Node.js, Python, PHP, etc.)
  - Game servers (Minecraft, Terraria, etc.)
  - Databases (PostgreSQL, Redis, etc.)
  - Development tools and CI/CD runners
  - Any containerized application
- [ ] **Load Balancing**: Automatic scaling and load distribution for high-traffic services
- [ ] **Service Discovery**: Internal service-to-service communication

### **2. Organizational Multi-Tenancy & Resource Management**

- [ ] **Organization Structure**: Account-based tenancy with team/organization groupings
- [ ] **Role-Based Access Control**:
  - **Super Admin**: Platform management, organization creation
  - **Org Admin**: Organization management, user provisioning
  - **Developer**: Service deployment and management
  - **Viewer**: Read-only access to organization services
- [ ] **Resource Quotas per Account**:
  - Maximum concurrent containers: **2** running containers per user (12 total platform limit)
  - RAM allocation limits: **4 GB** per user (24 GB platform limit)
  - Disk storage limits: **10 GB** per user (80 GB platform limit)
  - Network bandwidth limits: soft cap **200 GB/month** per user
- [ ] **Usage Monitoring**: Real-time tracking of resource consumption per user/organization

### **3. Authentication & Authorization System**

- [ ] JWT-based authentication with secure token management
- [ ] Organization-scoped role assignments
- [ ] Initial super admin setup during first run
- [ ] Forced password change on first login for newly-provisioned users
- [ ] Session management with automatic redirects
- [ ] API key management for programmatic access

### **4. AI Chat Interface (Ollama Integration)**

- [ ] **Content Generation**: AI-powered writing assistance and content creation
- [ ] **Personal Assistant**: Task management, code help, and general assistance
- [ ] **Interactive Chat Interface**: Real-time streaming chat with various AI models
- [ ] **Model Manager UI**: Admin can pull, install, and manage AI models (no models ship by default)
- [ ] **GPU Acceleration**: Utilises RTX 3060 Ti if available, with CPU fallback
- [ ] **Chat History**: Persistent conversation history per user
- [ ] **Organization-wide AI**: Shared AI resources within organizations

### **5. External Access & Domain Management**

- [ ] **Reverse Proxy (Traefik)**: Automatic routing and load balancing
- [ ] **Automatic SSL**: Let's Encrypt integration with wildcard certificate support
- [ ] **Subdomain Management**: Automatic subdomain generation for deployed services
- [ ] **Custom Domain Support**: Users can configure custom domains for their services
- [ ] **Dynamic DNS Integration**: Automatic DNS updates for changing IPs

### **6. Git Repository Management (Gitea)**

- [ ] **Self-hosted Git**: Complete Git hosting solution with web interface
- [ ] **Organization Repositories**: Team-based repository management
- [ ] **CI/CD Integration**: Automatic deployment from Git repositories
- [ ] **Service Integration**: Deploy directly from Git repositories to PaaS

### **7. System Administration**

- [ ] **Web Terminal**: Full terminal access through the browser (admin only)
- [ ] **System Statistics**: Real-time monitoring of CPU, memory, network, and storage
- [ ] **Resource Charts**: Visual representation of system performance and quota usage
- [ ] **Activity & Request Logs**: Log every HTTP request (user, time, route); viewable only by admins
- [ ] **User Management**: Admin interface for managing organizations and users
- [ ] **Backup Management**: Automated backup and restore for user data and services

## Application Structure

### **Frontend Pages**

- [ ] **`/login`** - Authentication page
- [ ] **`/dashboard`** - Main dashboard showing deployed services and resource usage
- [ ] **`/deploy`** - Service deployment interface (Dockerfile upload)
- [ ] **`/services`** - Service management and monitoring
- [ ] **`/ollama-chat`** - AI chat interface
- [ ] **`/repositories`** - Git repository browser and management
- [ ] **`/admin/terminal`** - Web-based terminal (admin only)
- [ ] **`/admin/users`** - User and organization management (admin only)
- [ ] **`/admin/system`** - System monitoring and configuration (admin only)

### **Backend API Endpoints**

- [ ] **Authentication**: `/api/auth/*` - Login, token management, user sessions
- [ ] **PaaS Management**: `/api/deploy/*` - Service deployment, management, monitoring
- [ ] **Resource Management**: `/api/resources/*` - Quota management, usage tracking
- [ ] **Ollama Integration**: `/api/ollama/*` - AI model management and chat
- [ ] **Gitea Management**: `/api/git/*` - Repository management and CI/CD
- [ ] **System Monitoring**: `/api/system/*` - Real-time metrics and administration
- [ ] **Organization Management**: `/api/orgs/*` - Multi-tenancy and role management

### **Key Components**

- [ ] **DeploymentEngine**: Docker container orchestration and management
- [ ] **ResourceManager**: Quota enforcement and usage tracking
- [ ] **ProxyManager**: Automatic subdomain and SSL certificate management
- [ ] **DashboardShell**: Main layout with organization-aware navigation
- [ ] **ServiceMonitor**: Real-time service health and performance monitoring
- [ ] **TerminalComponent**: Web terminal using xterm.js

## Development Workflow

### **Initial Setup Process**

- [ ] **Database Initialization**: MySQL database with multi-tenant schema
- [ ] **Super Admin Creation**: Initial platform administrator account
- [ ] **Domain Configuration**: SSL certificate setup and proxy configuration
- [ ] **Service Startup**: Ollama, Gitea, Traefik, and main application servers
- [ ] **Default Quotas**: Configuration of default resource limits

### **Data Persistence Strategy**

- [ ] **MySQL Database**: User accounts, organizations, service metadata, and configurations
- [ ] **Container Storage**: Persistent volumes for deployed services
- [ ] **Gitea Data**: Separate directory for repository storage
- [ ] **Ollama Models**: Model storage and configuration persistence
- [ ] **Backup Strategy**: Automated daily backups of all user data and configurations

## Security Features

### **Access Control**

- [ ] JWT token-based authentication with organization scoping
- [ ] Role-based authorization across multiple levels
- [ ] Protected admin routes with middleware
- [ ] Secure password hashing with salt and pepper
- [ ] API rate limiting and abuse prevention

### **Container Security**

- [ ] Isolated container environments per organization
- [ ] Resource limits enforced at container level
- [ ] Network segmentation between organizations
- [ ] Automated security scanning of deployed containers

### **External Access Security**

- [ ] Automatic SSL/TLS encryption for all services
- [ ] DDoS protection and rate limiting
- [ ] Firewall integration and port management
- [ ] Audit logging for all administrative actions

## Technology Stack

### **Backend Infrastructure**

- [ ] **Application**: Java Spring Boot
- [ ] **Database**: MySQL with connection pooling
- [ ] **Container Orchestration**: Docker Engine with custom management layer
- [ ] **Reverse Proxy**: Traefik with automatic SSL
- [ ] **AI Platform**: Ollama for local AI model hosting

### **Scalability Considerations**

- [ ] **Database**: MySQL with read replicas for scaling
- [ ] **Container Management**: Resource pooling and intelligent scheduling
- [ ] **Load Balancing**: Automatic distribution across available resources
- [ ] **Caching**: Redis for session management and performance optimization

## Future Enhancements

- [ ] **Marketplace**: Pre-built application templates (WordPress, Minecraft, etc.)
- [ ] **Advanced CI/CD**: GitOps workflow integration
- [ ] **Monitoring Dashboard**: Grafana integration for advanced metrics
- [ ] **API Gateway**: Advanced API management and documentation
- [ ] **Backup Integration**: Cloud backup providers (S3, etc.)
- [ ] **Multi-Server**: Clustering support for multiple home servers

# Home Server PaaS – Quick Start (Phase 0)

This guide shows how to spin up the _Phase 0_ skeleton: MySQL, Ollama, and a Spring Boot **gateway-service** that responds on `/health`.

## Prerequisites

1. **Docker ≥ 24** and **Docker Compose v2**
2. (Optional) **NVIDIA GPU drivers + nvidia-docker** if you want Ollama to use the RTX 3060 Ti.

## Folder Layout (so far)

```
backend/
  gateway-service/
    ├── Dockerfile
    ├── pom.xml
    └── src/main/java/com/example/gateway/GatewayApplication.java
infra/
  docker-compose.yml
README.md
```

## Running Locally

```bash
# from repository root
cd infra

docker compose up -d --build
```

Containers created:

- `mysql` → MySQL 8.1 on `localhost:3306` (root/root)
- `ollama` → Ollama on `localhost:11434` (no models yet)
- `gateway-service` → Spring Boot app on `localhost:8080`

### Verify

```bash
curl http://localhost:8080/health  # returns "OK"
```

### Stopping

```bash
docker compose down -v  # removes containers + volumes
```

## Next Steps

Proceed to **Phase 1** in [roadmap.md](./roadmap.md) to implement Authentication & User Management.
