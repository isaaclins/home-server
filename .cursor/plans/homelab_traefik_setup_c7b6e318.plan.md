---
name: Homelab Traefik Setup
overview: Create a clean homelab repository structure with Traefik v3 as reverse proxy and Homepage dashboard, using Docker Compose with proper networking and labels.
todos:
  - id: create-structure
    content: Create repository directory structure
    status: in_progress
  - id: traefik-compose
    content: Create main docker-compose.yml with Traefik
    status: pending
  - id: homepage-compose
    content: Create services/homepage/docker-compose.yml
    status: pending
  - id: env-example
    content: Create .env.example file
    status: pending
  - id: readme
    content: Create README.md with setup instructions
    status: pending
---

# Homelab Traefik + Homepage Setup

## Repository Structure

```
homelab/
├── docker-compose.yml          # Main compose file (Traefik)
├── services/
│   └── homepage/
│       └── docker-compose.yml  # Homepage dashboard
├── .env.example                # Example environment variables
└── README.md                   # Setup instructions
```

## docker-compose.yml (Traefik)

```yaml
networks:
  frontend:
    name: frontend

services:
  traefik:
    image: traefik:v3.2
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=true"
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=frontend"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--log.level=INFO"
    ports:
      - "80:80"
      - "443:443"
      - "127.0.0.1:8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - frontend
```

**Note:** Dashboard accessible at `http://localhost:8080` (localhost only). Will be secured with Authelia later.

## services/homepage/docker-compose.yml

```yaml
networks:
  frontend:
    external: true

services:
  homepage:
    image: ghcr.io/gethomepage/homepage:v0.9.6
    container_name: homepage
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
    volumes:
      - ./config:/app/config
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - frontend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.homepage.rule=Host(`home.isaaclins.com`)"
      - "traefik.http.routers.homepage.entrypoints=web"
      - "traefik.http.services.homepage.loadbalancer.server.port=3000"
```

## Starting the Stack

```bash
# 1. Start Traefik first (creates networks)
docker compose up -d

# 2. Start Homepage
cd services/homepage
docker compose up -d

# 3. Verify
docker ps
curl -H "Host: home.isaaclins.com" http://localhost
```

## Key Design Decisions

- **exposedbydefault=false**: Containers must explicitly opt-in with `traefik.enable=true`
- **No external dashboard**: Traefik dashboard bound to localhost:8080 only
- **Pinned versions**: Homepage pinned to v0.9.6 (avoid `latest` breaking changes)
- **No backend network yet**: Will add when introducing DBs/internal APIs
- **External network**: Homepage references the Traefik-created `frontend` network
- **No hardcoded secrets**: Ready for `.env` files and Docker secrets
- **Restart policy**: `unless-stopped` for production reliability
- **Read-only socket**: Docker socket mounted as `:ro` for security

## Next Steps (in order)

1. Verify HTTP routing works (`home.isaaclins.com` loads)
2. Add wildcard TLS with DNS challenge
3. Add Authelia for authentication
4. Then add additional services (Ollama, GitLab, etc.)