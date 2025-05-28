# --- Builder Stage for Ollama ---
FROM --platform=linux/amd64 node:22-slim as ollama-builder

# Install only dependencies needed for the ollama install script (curl, tar, gzip, coreutils for mktemp, ca-certificates for SSL/TLS verification)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl tar gzip coreutils ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ARG OLLAMA_VERSION=""
ARG TARGETARCH=amd64
ENV OLLAMA_DOWNLOAD_URL=https://ollama.com/download/ollama-linux-${TARGETARCH}.tgz

# Download Ollama
RUN mkdir -p /tmp/ollama-download && \
    curl --fail --show-error --location --progress-bar -o /tmp/ollama-download/ollama-linux-${TARGETARCH}.tgz "${OLLAMA_DOWNLOAD_URL}${OLLAMA_VERSION:+?version=$OLLAMA_VERSION}"

# Copy your local install_ollama.sh script - this is needed to place ollama in the right system dirs
COPY docker-data/install_ollama.sh /tmp/install_ollama.sh
RUN chmod +x /tmp/install_ollama.sh

# Install Ollama from the downloaded tarball using parts of your script logic
# This simplified RUN command assumes the tarball is already downloaded and focuses on extraction and placement.
# The original script handles /usr/local/bin and /usr/local/lib.
RUN mkdir -p /usr/local/bin /usr/local/lib/ollama && \
    tar -xzf /tmp/ollama-download/ollama-linux-${TARGETARCH}.tgz -C /usr/local && \
    if [ -f "/usr/local/ollama" ] && [ ! -f "/usr/local/bin/ollama" ]; then mv "/usr/local/ollama" "/usr/local/bin/ollama"; fi && \
    if [ -d "/usr/local/lib/ollama" ]; then echo "Ollama lib dir exists."; else mkdir -p "/usr/local/lib/ollama"; fi && \
    # The default ollama-linux-amd64.tgz might not create /usr/local/lib/ollama directly,
    # or might place all libraries directly into /usr/local/lib.
    # Ensure the target copy path for the main stage exists.
    # If the tgz extracts to a specific subdirectory like 'ollama/lib' inside /usr/local/lib, adjust COPY in main stage.
    echo "Ollama installed to /usr/local/bin and /usr/local/lib"


# --- Main Application Stage ---
FROM --platform=linux/amd64 node:22-slim

# Install system dependencies for your application
RUN apt-get update && \
    apt-get install -y --no-install-recommends sqlite3 git coreutils curl python3 build-essential ca-certificates procps && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy Ollama from the builder stage
COPY --from=ollama-builder /usr/local/bin/ollama /usr/local/bin/ollama
COPY --from=ollama-builder /usr/local/lib/ollama /usr/local/lib/ollama/

# Verify Ollama installation
RUN ollama --version

WORKDIR /app
RUN mkdir -p /app/docker-data

COPY docker-data/package.json /app/docker-data/package.json
COPY docker-data/package-lock.json /app/docker-data/package-lock.json

WORKDIR /app/docker-data
RUN npm install --arch=x64 --platform=linux

# Verification Step 1: Check if tailwindcss is installed
RUN if [ -d "/app/docker-data/node_modules/tailwindcss" ]; then \
    echo "SUCCESS: tailwindcss directory found in node_modules after npm install."; \
    else \
    echo "ERROR: tailwindcss directory NOT found in node_modules after npm install! Listing /app/docker-data/node_modules/ contents:"; \
    ls -la /app/docker-data/node_modules/; \
    exit 1; \
    fi

WORKDIR /app
COPY docker-data/ ./docker-data/

# Verification Step 2: Check if tailwindcss is still present after the main COPY
RUN if [ -d "/app/docker-data/node_modules/tailwindcss" ]; then \
    echo "SUCCESS: tailwindcss directory still found after main COPY operation."; \
    else \
    echo "ERROR: tailwindcss directory NOT found after main COPY! Host's node_modules might have overwritten it. Listing /app/docker-data/node_modules/ contents:"; \
    ls -la /app/docker-data/node_modules/; \
    exit 1; \
    fi

WORKDIR /app/docker-data

# --- Gitea Installation ---
# Download Gitea (latest stable release)
RUN curl -L -o /usr/local/bin/gitea https://dl.gitea.io/gitea/1.21.11/gitea-1.21.11-linux-amd64 \
    && chmod +x /usr/local/bin/gitea

# Create Gitea data directory
RUN mkdir -p /app/docker-data/gitea-data

# Expose Gitea web port
EXPOSE 3003

EXPOSE 3000
EXPOSE 3001

# --- Add gitea user for running Gitea as non-root ---
RUN useradd -m -d /home/gitea -s /bin/bash gitea \
    && chown -R gitea:gitea /app/docker-data

USER gitea

CMD ["bash", "run-setup.sh"]
