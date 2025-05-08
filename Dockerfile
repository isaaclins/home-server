# Use an official Node.js runtime as a parent image
FROM --platform=linux/amd64 node:20-slim

# Install necessary dependencies: git (for npm), sqlite3 (for setup.sh), coreutils (for sha256sum in setup.sh)
RUN apt-get update && \
    apt-get install -y sqlite3 git coreutils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app


# --- Main App (concurrently) Setup ---
WORKDIR /app/docker-data
COPY docker-data/package.json docker-data/package-lock.json* ./
RUN npm install --arch=x64 --platform=linux


# Copy the rest of the application code
WORKDIR /app
# This copies the entire docker-data directory from the host into /app/docker-data in the container
# node_modules within docker-data/backend and docker-data/frontend should be excluded by .dockerignore
COPY docker-data/ ./docker-data/

# Now, set the working directory to where setup.py will run
WORKDIR /app/docker-data

# Expose ports for frontend and backend
# For Next.js frontend
EXPOSE 3000
# For Express backend
EXPOSE 3001

# Run setup.py when the container launches.
# setup.py is now at /app/docker-data/setup.py
CMD ["bash", "run.sh"]
