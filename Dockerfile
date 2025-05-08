# Use an official Node.js runtime as a parent image
FROM --platform=linux/amd64 node:20-slim

# Install necessary dependencies: git (for npm), sqlite3 (for setup.sh), coreutils (for sha256sum in setup.sh)
RUN apt-get update && \
    apt-get install -y sqlite3 git coreutils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the initial working directory
WORKDIR /app

# --- Main App (concurrently) Setup ---

# Create the target directory for application data
RUN mkdir -p /app/docker-data

# Copy only package.json to leverage Docker cache for npm install
COPY docker-data/package.json /app/docker-data/package.json

# Set WORKDIR for npm install
WORKDIR /app/docker-data
# Run npm install. This will use the copied package.json and generate a new
# package-lock.json inside the image, specific to linux/amd64.
RUN npm install --arch=x64 --platform=linux

# Verification Step 1: Check if tailwindcss is installed
RUN if [ -d "/app/docker-data/node_modules/tailwindcss" ]; then \
    echo "SUCCESS: tailwindcss directory found in node_modules after npm install."; \
    else \
    echo "ERROR: tailwindcss directory NOT found in node_modules after npm install! Listing /app/docker-data/node_modules/ contents:"; \
    ls -la /app/docker-data/node_modules/; \
    exit 1; \
    fi

# Reset WORKDIR for copying the rest of the application code
WORKDIR /app

# Copy the rest of the application code from host's docker-data
# Your .dockerignore file (with **/node_modules) is CRITICAL here to prevent
# the host's docker-data/node_modules from overwriting the one just installed.
COPY docker-data/ ./docker-data/

# Verification Step 2: Check if tailwindcss is still present after the main COPY
# This ensures the COPY command (and .dockerignore) worked as expected for node_modules.
RUN if [ -d "/app/docker-data/node_modules/tailwindcss" ]; then \
    echo "SUCCESS: tailwindcss directory still found after main COPY operation."; \
    else \
    echo "ERROR: tailwindcss directory NOT found after main COPY! Host's node_modules might have overwritten it. Listing /app/docker-data/node_modules/ contents:"; \
    ls -la /app/docker-data/node_modules/; \
    exit 1; \
    fi

# Set the final working directory for the CMD
WORKDIR /app/docker-data

# Expose ports
# Frontend
EXPOSE 3000
# Backend
EXPOSE 3001

# Run command
CMD ["bash", "run.sh"]
