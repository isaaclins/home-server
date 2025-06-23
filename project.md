# Home Server Project - Comprehensive Overview

## Project Purpose
This is a **comprehensive self-hosted home server solution** built with modern web technologies. It's designed to provide a unified dashboard for managing multiple self-hosted services in a personal or small business environment. The project emphasizes containerization, security, and ease of deployment.

## Architecture Overview

### **Core Services Integrated**
- [ ] **Ollama AI Integration** - Local AI model hosting and chat interface
- [ ] **Gitea** - Self-hosted Git repository management
- [ ] **Web Terminal** - Browser-based SSH/terminal access (admin only)
- [ ] **System Monitoring** - Real-time server resource monitoring

## Key Features

### **1. Authentication & Authorization System**
- [ ] JWT-based authentication with secure token management
- [ ] Role-based access control (`_ollama_user`, admin privileges)
- [ ] Initial admin setup during first run
- [ ] Session management with automatic redirects

### **2. AI Chat Interface (Ollama Integration)**
- [ ] **Local AI Model Management**: Pull, install, and manage AI models locally
- [ ] **Interactive Chat Interface**: Real-time streaming chat with various AI models
- [ ] **Model Selection**: Switch between different AI models dynamically
- [ ] **Chat History**: Persistent conversation history (limited to 20 messages)
- [ ] **Admin Controls**: Model installation, deletion, and configuration
- [ ] **Image Support**: Capability to send images to models that support it

### **3. Git Repository Management (Gitea)**
- [ ] **Self-hosted Git**: Complete Git hosting solution with web interface
- [ ] **Repository Browser**: View public repositories through the web interface
- [ ] **Service Management**: Start/stop Gitea service through the admin interface (admin only)
- [ ] **Integration**: Seamless access to Gitea repositories from the main dashboard

### **4. System Administration**
- [ ] **Web Terminal**: Full terminal access through the browser (admin only)
- [ ] **System Statistics**: Real-time monitoring of CPU, memory, network, and storage
- [ ] **Resource Charts**: Visual representation of system performance metrics
- [ ] **Activity Logs**: Comprehensive logging and monitoring system (admin only)
- [ ] **User Management**: Admin interface for managing user accounts (admin only)

## Application Structure

### **Frontend Pages**
- [ ] **`/login`** - Authentication page
- [ ] **`/services`** - Main dashboard showing available services
- [ ] **`/ollama-chat`** - AI chat interface
- [ ] **`/gitea-repos`** - Git repository browser
- [ ] **`/admin/terminal`** - Web-based terminal (admin only)
- [ ] **`/admin/logs`** - System activity logs (admin only)

### **Backend API Endpoints**
- [ ] **Authentication**: `/api/auth/login`, user management
- [ ] **Ollama Integration**: `/api/ollama/models`, `/api/ollama/chat`, `/api/ollama/pull`
- [ ] **Gitea Management**: `/api/gitea/service/*`, `/api/gitea/public-repos`
- [ ] **System Monitoring**: `/api/system/stats`, real-time metrics

### **Key Components**
- [ ] **DashboardShell**: Main layout wrapper with sidebar navigation
- [ ] **SystemStats**: Real-time system monitoring widgets
- [ ] **ResourceChart**: Performance visualization components
- [ ] **TerminalComponent**: Web terminal using xterm.js
- [ ] **Theme Support**: Dark/light mode toggle

## Development Workflow

### **Initial Setup Process**
- [ ] **Database Initialization**: mysql database with user tables
- [ ] **Admin User Creation**: Interactive or environment variable-based setup
- [ ] **Service Startup**: Ollama, Gitea, and main application servers
- [ ] **Port Configuration**: Coordinated port mapping across services

### **Data Persistence Strategy**
- [ ] **Database**: mysql init file on first run
- [ ] **Gitea Data**: Separate directory for repository storage
- [ ] **Ollama Models**: Model storage and configuration persistence
- [ ] **reset on rebuild for testing purposes** 

## Security Features

### **Access Control**
- [ ] JWT token-based authentication
- [ ] Role-based authorization (`_ollama_user`, admin)
- [ ] Protected admin routes with middleware
- [ ] Secure password hashing (SHA-256)

### **Administrative Controls**
- [ ] Admin-only terminal access
- [ ] Service management controls
- [ ] User account management
- [ ] System monitoring and logs access


- [ ] **Backup Strategy**: Automated backup and restore procedures
- [ ] **API Documentation**: OpenAPI/Swagger documentation
- [ ] **File Server**: Dedicated file sharing functionality
- [ ] **Password Recovery**: User password reset mechanisms


