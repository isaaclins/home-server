# --- Builder Stage for Ollama ---
FROM --platform=linux/amd64 node:22-slim as ollama-builder

# Install only dependencies needed for the ollama install script (curl, tar, gzip, coreutils for mktemp, ca-certificates for SSL/TLS verification)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl tar gzip coreutils ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy and run your local install_ollama.sh script
COPY docker-data/install_ollama.sh /tmp/install_ollama.sh
RUN chmod +x /tmp/install_ollama.sh && \
    /tmp/install_ollama.sh

# --- Main Application Stage ---
FROM --platform=linux/amd64 node:22-slim

# Install system dependencies for your application
RUN apt-get update && \
    apt-get install -y --no-install-recommends sqlite3 git coreutils curl python3 build-essential ca-certificates && \
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

EXPOSE 3000
EXPOSE 3001

CMD ["bash", "run-setup.sh"]
