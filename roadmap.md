# Home Server PaaS – Detailed Roadmap

> **Audience:** Contributors and maintainers  
> **Scope:** MVP delivery as defined in `.cursor/rules/project-overview.mdc` and `project.md`

---

## Legend

| Symbol | Meaning        |
| ------ | -------------- |
| ✅     | Task completed |
| 🔄     | In-progress    |
| ⬜️    | Not started    |

---

## Phase 0 – Repository Skeleton & Local Dev Environment (½ day)

| Task                                  | Details                                                                | Owner | Status |
| ------------------------------------- | ---------------------------------------------------------------------- | ----- | ------ |
| ✅ **Create folder layout**           | `backend/`, `frontend/`, `infra/`, `scripts/`                          | —     | ✅     |
| ✅ **Bootstrap `docker-compose.yml`** | MySQL (empty schema), Ollama (no models), Spring Boot stub (`/health`) | —     | ✅     |
| ✅ **Spring Boot stub**               | `backend/gateway-service` returns `200 OK` on `/health`                | —     | ✅     |
| ✅ **Add README**                     | Quick-start with `docker compose up` + health curl                     | —     | ✅     |

**Exit Criteria**

1. `docker compose up -d` boots all containers without errors.
2. `curl http://localhost:8080/health` returns **OK**.

---

## Phase 1 – Authentication & User Management MVP (2–3 days)

### 1.1 Backend – `auth-service`

| Task                                        | Details                                                                                                | Status |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| ⬜️ Scaffold Spring Boot project            | New Maven module under `backend/auth-service`.                                                         | ⬜️    |
| ⬜️ Entities                                | `User(id, username, passwordHash, mustChangePwd, enabled)`, `Role(id, name)`, join table `user_roles`. | ⬜️    |
| ⬜️ Password Policy                         | SHA-512 pre-hash → BCrypt (72-byte limit workaround).                                                  | ⬜️    |
| ⬜️ Seed super-admin                        | On first run, detect empty `user` table → create `admin` with random pwd (log to console).             | ⬜️    |
| ⬜️ JWT issuance                            | `/api/auth/login` returns Access + Refresh tokens.                                                     | ⬜️    |
| ⬜️ Change-password endpoint                | `/api/auth/password` (requires old pwd unless `mustChangePwd=true`).                                   | ⬜️    |
| ⬜️ Global Security Filter                  | • Reject if `mustChangePwd` and path ≠ `/password`.                                                    |
| • Attach `username` to request log context. | ⬜️                                                                                                    |
| ⬜️ Request Logging                         | Persist `(ts, username, method, path, status)` to table `request_log`.                                 | ⬜️    |

### 1.2 Frontend

| Task                     | Details                                                               | Status |
| ------------------------ | --------------------------------------------------------------------- | ------ |
| ⬜️ Bootstrap project    | Next.js (TypeScript) in `frontend/`. Integrate shadcn/ui if feasible. | ⬜️    |
| ⬜️ Login page           | Username, password → calls `/login`. Store JWT in `localStorage`.     | ⬜️    |
| ⬜️ Password-change page | Shown if API flag `mustChangePwd=true`.                               | ⬜️    |
| ⬜️ Auth guard HOC       | Redirect unauthenticated users to `/login`.                           | ⬜️    |

**Exit Criteria**
• Admin can log in, create a new user (CLI for now), user forced to change password on first login.  
• All API calls write to `request_log`.

---

## Phase 2 – Admin User Management UI (1 day)

| Task                      | Details                                         | Status |
| ------------------------- | ----------------------------------------------- | ------ |
| ⬜️ List users            | `/api/users` (admin only) → table view.         | ⬜️    |
| ⬜️ Create user modal     | Calls `POST /api/users` (sets `mustChangePwd`). | ⬜️    |
| ⬜️ Disable / enable user | Patch endpoint + toggle switch in UI.           | ⬜️    |

**Exit Criteria**
• Admin can CRUD users from web UI.  
• Changes reflected immediately.

---

## Phase 3 – Ollama Chat Interface (2 days)

### 3.1 Backend – `chat-service`

| Task                 | Details                                                           | Status |
| -------------------- | ----------------------------------------------------------------- | ------ |
| ⬜️ Module setup     | Spring Boot module under `backend/chat-service`.                  | ⬜️    |
| ⬜️ Model list proxy | `GET /api/ollama/models` → Ollama `/api/tags`.                    | ⬜️    |
| ⬜️ Model pull       | `POST /api/ollama/models/pull` (admin only) → Ollama `/api/pull`. | ⬜️    |
| ⬜️ Chat endpoint    | `POST /api/ollama/chat` streams from Ollama `/api/chat`.          | ⬜️    |
| ⬜️ Persistence      | Tables `chat_session`, `chat_message` (user-scoped).              | ⬜️    |

### 3.2 Frontend

| Task                 | Details                                                                                | Status |
| -------------------- | -------------------------------------------------------------------------------------- | ------ |
| ⬜️ Chat UI          | Split-pane: sidebar sessions, main chat window. Streaming responses via SSE/WebSocket. | ⬜️    |
| ⬜️ Model Manager UI | Admin-only page lists installed + remote models, buttons to pull/delete.               | ⬜️    |

**Exit Criteria**
• Users can start chat sessions, messages persist.  
• Admin can pull models; none installed by default.

---

## Phase 4 – Resource Quota Placeholders (½ day)

| Task              | Details                                                                  | Status |
| ----------------- | ------------------------------------------------------------------------ | ------ |
| ⬜️ DB design     | `usage(id, userId, containers, ramMB, diskMB, bandwidthMB, ts)`          | ⬜️    |
| ⬜️ Middleware    | After each deployment (future), update usage row. For now, mock numbers. | ⬜️    |
| ⬜️ Admin UI stub | Simple read-only grid.                                                   | ⬜️    |

---

## Phase 5 – Traefik Reverse Proxy & Sub-Domain Template (½ day)

| Task                    | Details                                                                        | Status |
| ----------------------- | ------------------------------------------------------------------------------ | ------ |
| ⬜️ Add Traefik service | Configure routers: `api.server.local` → Spring, `app.server.local` → frontend. | ⬜️    |
| ⬜️ Wildcard cert (dev) | Use self-signed for local; later Let's Encrypt staging.                        | ⬜️    |

**Exit Criteria**
• All traffic flows through Traefik (single entrypoint).

---

## Milestones & Timeline (Estimated)

| Phase | Duration | Calendar Days     |
| ----- | -------- | ----------------- |
| 0     | 0.5      | Day 1             |
| 1     | 3        | Day 1–3           |
| 2     | 1        | Day 4             |
| 3     | 2        | Day 5–6           |
| 4     | 0.5      | Day 7 (morning)   |
| 5     | 0.5      | Day 7 (afternoon) |

> **Total:** 7 working days for MVP slice.

---

## Backlog (Post-MVP)

- Deployment Engine (build & run arbitrary Dockerfiles)
- Gitea integration + "deploy from main"
- Live system metrics dashboard
- Quota enforcement (cgroups, container limits)
- Backup & restore flows
- CI/CD runners
- Multi-server clustering support

---

## Contribution Guidelines

1. Follow the repo layout in `.cursor/rules/project-overview.mdc`.
2. Each PR must reference a roadmap task and update the status emoji.
3. Unit tests where practical; integration tests run via `docker compose up test`.
4. Keep documentation (`project.md`, `roadmap.md`) current; docs PRs are first-class.

---

_Last updated: <!-- KEEP THIS LINE; CI replaces on merge -->_
