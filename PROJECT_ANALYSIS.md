# Home Server Project: Missing Features and Areas for Improvement

This document outlines potential missing features, misconfigurations, and areas for improvement in the `home-server` project.

## I. Missing Core Features

1.  **Password Recovery System:**

    - **Current State:** User accounts (initially admin) are created via `run-setup.sh`, but there's no specified mechanism for users to recover forgotten passwords.
    - **Suggestion:** Implement a secure password reset flow, potentially involving email verification or security questions.

2.  **Comprehensive Gitea Integration & Configuration:**

    - **Current State:** The presence of `docker-data/data/gitea` and `docker-data/gitea-data` directories suggests Gitea is an intended component. However, its setup, operational status, detailed configuration, and data persistence strategy within the Dockerized environment are not fully detailed in the provided documentation. Specifically, `dev.sh` does not explicitly show volume mounts for Gitea-specific data that would ensure persistence if Gitea is running inside the main `home-server-image` container.
    - **Suggestion:**
      - Clearly define how Gitea is to be run: as a separate Docker container (recommended for modularity and using official images) linked to this project, or as a service started within the main `home-server-image` container via `run-setup.sh`.
      - If run within the main container, ensure its data directories are mapped to persistent volumes in `dev.sh`/`nocache-dev.sh`.
      - If run as a separate container, use Docker Compose to manage it alongside the main application, ensuring its data volumes are correctly configured for persistence.
      - Document the Gitea URL, how to access it, perform initial setup (if not automated), and manage it.

3.  **Dedicated File Server Functionality:**

    - **Current State:** There is no explicit file server component (e.g., for network shares like SMB/NFS, or a web-based file manager like Nextcloud or MinIO) apparent from the project structure or documentation.
    - **Suggestion:** If file storage, synchronization, and sharing are desired features for a "home server," consider integrating a dedicated file server solution. This could be another Docker container or a service built into the existing backend.

4.  **Expanded Frontend Pages & User Interface:**

    - **Current State:** The frontend has an `/admin` section (`docker-data/frontend/pages/admin/`). The overall scope of user-facing pages seems minimal for a multi-functional home server.
    - **Suggestion:**
      - Develop a main dashboard page providing an overview of services.
      - User profile management page (e.g., change password, manage preferences).
      - Dedicated UI for interacting with Gitea repositories (if deeply integrated).
      - A user interface for interacting with Ollama (e.g., a chat interface, model selection/management).
      - If a file server is implemented, a web interface for file management.

5.  **Clear Backend API Definition and Services:**
    - **Current State:** A `docker-data/backend` directory exists, and `run-setup.sh` initializes a `users` table. The full scope of backend services beyond initial admin user setup is not detailed.
    - **Suggestion:** Document the backend API endpoints (e.g., using OpenAPI/Swagger). Define the services the backend will provide to support the frontend features (e.g., Gitea authentication proxy, Ollama request handling, user management beyond initial setup, file management APIs).

## II. Configuration & Operational Improvements

1.  **Database Persistence:**

    - **Current State:** The main application SQLite database (`/app/docker-data/data/home_server.db`) is reset if the container is removed and recreated without a volume mount, as highlighted in `development_workflow_and_docker_setup.md`.
    - **Suggestion:** Modify `dev.sh` and `nocache-dev.sh` to include a Docker volume mount for the `/app/docker-data/data` directory to persist the SQLite database. For example: `-v "$(pwd)/docker-data/app-data:/app/docker-data/data"`. (Note: `app-data` is a suggestion for the host-side directory name).

2.  **Ollama Model Persistence and Configuration:**

    - **Current State:** Ollama is installed and run via `run-setup.sh`. It's unclear if downloaded models and Ollama's own configuration (e.g., `~/.ollama` or `/root/.ollama` inside the container, where `ollama serve` stores its data) are persisted if the container is rebuilt.
    - **Suggestion:** Identify the directory Ollama uses for storing models and its configuration data within the container. Mount this directory as a Docker volume in `dev.sh` and `nocache-dev.sh` to ensure models are not re-downloaded and configurations are kept. For example: `-v "$(pwd)/docker-data/ollama-data:/root/.ollama"`.

3.  **Security - Credential Management:**

    - **Current State:** Initial admin credentials can be passed via environment variables (`INITIAL_ADMIN_USER`, etc.), which `development_workflow_and_docker_setup.md` correctly notes can have security implications.
    - **Suggestion:** While acceptable for local development, for any scenario requiring more security, consider alternatives:
      - Prompting for credentials on the first run if environment variables are not set (as currently implemented if variables are absent).
      - For more advanced setups, explore Docker secrets or other secrets management tools.
      - Reinforce in documentation that the current environment variable method is primarily for non-interactive development setup.

4.  **Port Mapping Consistency (Backend):**

    - **Current State:**
      - `Dockerfile`: `EXPOSE 3000` (frontend) and `EXPOSE 3001` (backend).
      - `dev.sh`/`nocache-dev.sh`: Map host `3000` to container `3000` (frontend) and host `3002` to container `3002` (for backend access).
      - `run-setup.sh`: Starts the application using `npm run dev`. The actual port the backend listens on _inside the container_ is determined by the `docker-data/package.json` scripts and backend configuration.
    - **Potential Issue:** If the backend (started by `npm run dev`) listens on port `3001` (as per `EXPOSE`) but `dev.sh` maps host `3002` to container `3002`, the backend won't be accessible via host port `3002` unless the backend is actually configured to listen on `3002` inside the container.
    - **Suggestion:**
      1.  Verify the port the backend application (defined in `docker-data/package.json` and started by `npm run dev`) is configured to listen on within the container.
      2.  Ensure this internal listening port matches the _container-side_ port in the `dev.sh` mapping.
          - If backend listens on `3001` (matching `EXPOSE`), change `dev.sh` mapping to `-p 3002:3001`.
          - If backend is intended to listen on `3002` internally, ensure its configuration reflects this, and the `EXPOSE 3001` in Dockerfile might be misleading (though `EXPOSE` is largely informational).
      3.  Update `development_workflow_and_docker_setup.md` to reflect the correct and consistent port configuration.

5.  **`.dockerignore` Verification:**

    - **Current State:** `development_workflow_and_docker_setup.md` advises including `docker-data/node_modules` or `**/node_modules` in the root `.dockerignore`.
    - **Suggestion:** Double-check the root `.dockerignore` file to ensure these patterns are present and effective in preventing local `node_modules` from being copied into the Docker image, which could overwrite the container-specific modules installed by `npm install --arch=x64 --platform=linux`. Also, ensure other unnecessary files/directories (like `.git`, local build artifacts, `.env` files with secrets) are ignored.

6.  **Gitea Data Persistence (Reiteration & Specificity):**
    - **Current State:** As mentioned in "Missing Core Features," the persistence of Gitea data is crucial and currently unclear. The directories `docker-data/data/gitea` and `docker-data/gitea-data` exist but are not explicitly mapped as volumes in `dev.sh`.
    - **Suggestion:** If Gitea is run _within_ the main `home-server-image` container (not recommended, but possible):
      - Identify the exact paths Gitea uses _inside the container_ for its configuration and data (e.g., repositories, database).
      - Add specific Docker volume mounts in `dev.sh` and `nocache-dev.sh` for these paths. For example:
        ```bash
        # Example if Gitea data is in /app/docker-data/gitea-data/data and config in /app/docker-data/gitea-data/conf
        -v "$(pwd)/docker-data/host-gitea-data:/app/docker-data/gitea-data/data"
        -v "$(pwd)/docker-data/host-gitea-conf:/app/docker-data/gitea-data/conf"
        ```
      - The best practice is to run Gitea as a separate, official Docker container with its own well-defined volume mounts.

## III. Documentation and Development Workflow

1.  **Detailed Service Configuration Guides:**

    - **Current State:** `development_workflow_and_docker_setup.md` covers the initial setup.
    - **Suggestion:** Create more detailed documentation for configuring each major service post-deployment:
      - Gitea: Administration, user management, repository settings, backup procedures.
      - Ollama: Managing models, updating Ollama, resource allocation.
      - Custom Backend/Frontend: Key configuration files, environment variables used (beyond initial admin), theming, etc.

2.  **API Documentation (Backend):**

    - **Current State:** No explicit API documentation.
    - **Suggestion:** If the backend at `docker-data/backend/` exposes a REST or GraphQL API for the frontend or other services, document these endpoints. Tools like Swagger/OpenAPI for REST can be very helpful.

3.  **Backup and Restore Strategy:**

    - **Current State:** Not addressed.
    - **Suggestion:** Document a strategy for backing up critical data:
      - Application database (`home_server.db`).
      - Gitea data (if used).
      - Ollama models (can be large, so strategy might be to re-pull, but good to note).
      - Any file server data.
      - Container configurations.
        This is especially important if persistent volumes are used.

4.  **Updating Dependencies and Services:**
    - **Current State:** Not addressed.
    - **Suggestion:** Provide guidance on how to update Node.js dependencies, system packages in the Docker image, Ollama itself, and Gitea (if integrated).

This list aims to provide a constructive overview for enhancing the `home-server` project, focusing on robustness, usability, and maintainability.
