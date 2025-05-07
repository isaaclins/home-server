# Home Server Project

A custom-built home server designed to provide API-driven services including Ollama LLM management, file hosting, and a Platform-as-a-Service (PaaS) for deploying Dockerized applications. For comprehensive requirements and planning, please refer to the `[home-server-plan.mdc](mdc:.cursor/rules/home-server-plan.mdc)`.

## Key Features

- API-driven management of Ollama Large Language Models (pull, start, chat, stop).
- Secure file hosting with configurable retention periods (UI and API uploads).
- Platform-as-a-Service (PaaS) for deploying and managing arbitrary Docker containers.
- User management with role-based access control for APIs and services (Initial admin setup via interactive script when module loads, data stored in `/app/data`).
- Basic FastAPI web server implemented with root (`/`) and `/api` endpoints.
- Centralized dashboard for monitoring server health and service status (Planned).
- Secure access via HTTPS and authentication (Planned).

## Technology Stack (High-Level)

- **Operating System:** Linux (target), runs in Docker.
- **Containerization:** Docker
- **Programming Language:** Python 3.11
- **API Framework:** FastAPI
- **Web Server:** Uvicorn
- **Reverse Proxy:** To be selected (e.g., Nginx, Traefik, Caddy) - for SSL termination and request routing.
- **Authentication:** HTTP Basic Auth (planned), hashed passwords with SHA256.
- **Database:** SQLite (for user management, stored in `/app/data/home_server.db` within the container).

## Prerequisites

- Docker
- Git

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url> # Replace with the actual repository URL
    cd home-server
    ```
2.  **Prepare Data Directory on Host:**
    Create a directory on your host machine to store persistent application data. This will be mounted into the container.

    ```bash
    mkdir ./app_data # Or any other path you prefer, e.g., /opt/home-server/data
    ```

3.  **Build the Docker image:**
    The `Dockerfile` copies your application code into the image. The image is configured to build for `linux/amd64` by default.
    ```bash
    docker build -t home-server .
    ```
4.  **Initial Configuration & First Run (Admin Setup):
    When you run the container for the first time **interactively**, it will attempt an initial admin setup if the marker file (`.admin_created`) is not found in the mounted data volume. You will be prompted in the terminal to create an admin user. This information will be stored in the `home_server.db` file within the container's `/app/data` directory, which is mapped from your host's `./app_data`.
    **Important:\*\* The interactive prompt for admin setup currently relies on `input()`. This may not function as expected if the container is run in a non-interactive way (e.g. with `-d` without `-it` for the first run). A more robust first-time setup mechanism (e.g., using environment variables for initial admin credentials) is planned.

    To run interactively for the first setup:

    ```bash
    docker run -it --rm \
      -v $(pwd)/app_data:/app/data \
      -p 8000:8000 \
      --name home-server-app-setup \
      home-server
    ```

    - `-it`: Runs the container in interactive mode for the setup prompts.
    - `--rm`: Removes this setup container when it stops.
    - `-v $(pwd)/app_data:/app/data`: Mounts the host's `./app_data` directory to `/app/data` inside the container. This is where `main.py` now stores its database and marker file.
    - `-p 8000:8000`: Maps host port 8000 to container port 8000 where Uvicorn listens.

5.  \*\*Run the Docker container (Detached Mode for Regular Use):
    After the initial admin setup is complete (or if data already exists in `./app_data`), you can run the container in detached mode:
    ```bash
    docker run -d \
      -v $(pwd)/app_data:/app/data \
      -p 8000:8000 \
      --name home-server-app \
      --restart unless-stopped \
      home-server
    ```
    - The application code runs from within the image. Persistent data is read from/written to the mounted `/app/data` volume.
    - The server will be accessible on `http://localhost:8000`.

## Usage

Once the server is running, you can access its basic API endpoints:

- Root: `http://localhost:8000/`
- API Root: `http://localhost:8000/api`

FastAPI's automatic interactive API documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Documentation

Basic API endpoints are now available. FastAPI also provides automatic interactive API documentation (Swagger UI) at `http://localhost:8000/docs` and alternative documentation (ReDoc) at `http://localhost:8000/redoc` when the server is running.

Further API documentation will be provided as endpoints are developed. Reference the detailed API plans in `[home-server-plan.mdc](mdc:.cursor/rules/home-server-plan.mdc)`.

## Configuration

The application is primarily configured through:

1.  **Initial interactive setup (on first interactive run):** For the master admin credentials.
2.  **Persistent Data Volume:** The database (`home_server.db`) and admin marker file (`.admin_created`) are stored in the `/app/data` directory inside the container. This directory should be mounted from a host directory (e.g., `./app_data`) to persist data across container restarts.
3.  **Environment variables (Future):** Will be used for more granular settings.

## Dependencies and why

- **fastapi:** (Used in `main.py`) A modern, fast (high-performance) web framework for building APIs with Python, based on standard Python type hints. Chosen for its speed, ease of use, and automatic data validation and documentation features (Swagger UI at `/docs`, ReDoc at `/redoc`).
- **uvicorn:** (Used in `main.py` and `Dockerfile CMD`) An ASGI server, used to run FastAPI applications. It's lightweight and fast. `[standard]` variant includes recommended extras.
- **Python Standard Library:**
  - `os`: Used in `main.py` for checking file existence (`os.path.exists`) for the admin marker file.
  - `sqlite3`: Used in `main.py` for creating and interacting with the SQLite database for user management.
  - `hashlib`: Used in `main.py` for hashing admin passwords (SHA256) before storing them.
  - `getpass`: Used in `main.py` to securely read the admin password from the terminal during the initial setup (works best in interactive mode).

_(This section will be updated as more dependencies are added and used.)_
