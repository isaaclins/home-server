# Home Server Project

A comprehensive, API-driven home server solution designed to run on a Linux environment, packaged as a Docker container. This server provides functionalities for Ollama LLM management, file hosting, PaaS-like Docker container deployment, user management, and a monitoring dashboard.

For detailed project requirements and planning, please see the `[.cursor/rules/home-server-plan.mdc](mdc:.cursor/rules/home-server-plan.mdc)`.

## Key Features

- **Ollama LLM Management:** API endpoints to pull, start, chat with, and stop Ollama Large Language Models.
- **File Hosting:** UI and API-based file uploads with configurable retention periods (10 minutes, 1 hour, 10 hours, 10 days, or indefinitely) and unique shareable URLs.
- **PaaS / Container Management:** Deploy and manage arbitrary applications packaged as Docker images. The system automatically assigns host ports and provides access URLs.
- **User Management & Authorization:** Secure initial admin setup, with an admin panel for creating/deleting users and managing their access permissions to specific APIs.
- **Comprehensive Dashboard:** A web UI to monitor server health, resource utilization (CPU, RAM, disk), and the status of deployed services (Core API, Ollama, PaaS containers, File Hosting).
- **Secure Access:** All web UIs (Homepage, Admin Panel, Dashboard) protected by HTTP Basic Auth.

## Technology Stack (High-Level - Subject to Finalization)

- **Target Operating System:** Linux (Terminal-only server distribution)
- **Containerization:** Docker
- **Reverse Proxy:** To be determined (e.g., Nginx, Traefik, Caddy) for SSL termination and request routing.
- **API Framework:** To be determined (e.g., Python with FastAPI/Flask, Node.js with Express).
- **Authentication:** HTTP Basic Auth, hashed password storage, SQLite for user/permission data.
- **Ollama Interaction:** Via Ollama's official local REST API.

For development environment considerations, see `[.cursor/rules/dev-specs.mdc](mdc:.cursor/rules/dev-specs.mdc)`.

## Prerequisites

- Docker (for building and running the server image)
- Git (for cloning the repository)
- A Linux server environment (for deployment)

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone <your_repository_url> # Replace with actual URL
    cd home-server
    ```

2.  **Build the Docker image:**

    ```bash
    docker build -t home-server .
    ```

3.  **Initial Configuration & First Run:**
    - When running the Docker container for the first time, you will be prompted to set up the master admin user (username and password).
    - Example command to run the container (ensure to map a persistent volume for data like user database and file uploads):
    ```bash
    docker run -d \
      -p 8080:8080 \ # Replace 8080 with your desired host port for the main app, and the internal container port
      --name home-server-app \
      -v home_server_data:/app/data \ # Example volume for persistent data
      # Add any other necessary environment variables or options here
      home-server
    ```
    _(Note: Specific port mappings and volume paths will be finalized during development.)_

## Usage

- Access the server's main interface (Homepage/Admin Panel/Dashboard) via your server's domain, e.g., `https://your-server-domain.com/` (once configured with a reverse proxy and SSL).
- Non-admin users will see links to services they have permission to access.
- Admin users will have access to the admin panel for user and permission management.

## API Documentation

Detailed API functionalities and endpoint plans are outlined in the `[.cursor/rules/home-server-plan.mdc](mdc:.cursor/rules/home-server-plan.mdc)`.
As development progresses, dedicated API documentation (e.g., Swagger/OpenAPI or a separate `API_DOCS.md`) may be created.

## Configuration

The server is primarily configured via:

1.  **Initial interactive setup:** For the master admin credentials.
2.  **Environment variables:** Passed to the Docker container at runtime (e.g., for port settings, external service integrations if any). An `.env.example` file may be provided in the future.

Key environment variables will be documented here as they are defined.

## Development

(Details to be added. Refer to `[.cursor/rules/dev-specs.mdc](mdc:.cursor/rules/dev-specs.mdc)` for environment notes.)

## Troubleshooting

(Details to be added as common issues and solutions are identified.)

## License

(To be determined. MIT License is a common choice for open-source projects.)
