# Homelab

Production-quality homelab setup using Docker Compose on Ubuntu Server.

- **Domain:** isaaclins.com
- **Dashboard:** home.isaaclins.com
- **Reverse Proxy:** Traefik v3

## Quick Start

```bash
# 1. Start Traefik (creates frontend network)
docker compose up -d

# 2. Start Homepage
cd services/homepage
docker compose up -d

# 3. Verify
docker ps
curl -H "Host: home.isaaclins.com" http://localhost
```

## Access

- **Homepage:** http://home.isaaclins.com
- **Traefik Dashboard:** http://localhost:8080 (localhost only)

## Structure

```
.
├── docker-compose.yml          # Traefik reverse proxy
├── services/
│   └── homepage/
│       └── docker-compose.yml  # Homepage dashboard
├── .env.example                # Environment template
└── README.md
```

## Adding Services

1. Create `services/<service-name>/docker-compose.yml`
2. Use `frontend` network (external: true)
3. Add Traefik labels with `traefik.enable=true`
4. Run `docker compose up -d` from service directory

## Next Steps

1. Add wildcard TLS with DNS challenge
2. Add Authelia for authentication
3. Add additional services

