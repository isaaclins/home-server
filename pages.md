# Frontend Route & User Flow Documentation

> **Project:** Home Server PaaS – MVP Front-end
> **Last updated:** <!-- CURSOR-DATE -->

---

## 1. Personas

| Persona                  | Role in System                     | Primary Goals                                                                                                                             |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Alice – Regular User** | Authenticated end-user (non-admin) | • Chat with Ollama-powered models<br/>• View past chat history                                                                            |
| **Bob – Administrator**  | System administrator               | • Create/manage user accounts<br/>• Enforce password policies<br/>• Pull / remove Ollama models<br/>• Monitor resource usage & audit logs |

## 2. Route Map (Next.js pages ➜ URL)

| URL                    | Component/File              | Access                    | Description                                                    |
| ---------------------- | --------------------------- | ------------------------- | -------------------------------------------------------------- |
| `/`                    | `pages/index.tsx`           | Authenticated (all roles) | Post-login landing page. Simple welcome + links to main areas. |
| `/login`               | `pages/login.tsx`           | Public                    | Username/password sign-in.                                     |
| `/password-change`     | `pages/password-change.tsx` | Authenticated (all roles) | Forced password reset on first login or when expired.          |
| `/chat`                | `pages/chat.tsx`            | Authenticated (all roles) | Full-screen chat UI backed by Chat Service + Ollama.           |
| `/admin/users`         | `pages/admin/users.tsx`     | Admin only                | CRUD for user accounts, enable/disable.                        |
| `/admin/models`        | `pages/admin/models.tsx`    | Admin only                | Pull / delete local Ollama models.                             |
| `/admin/usage`         | `pages/admin/usage.tsx`     | Admin only                | View resource usage per user.                                  |
| (future) `/admin/logs` | —                           | Admin only                | HTTP request log viewer (not yet implemented).                 |

## 3. Primary Use-cases & User Flows

### 3.1 Alice — Chat with AI

1. **Navigate:** Alice visits `https://server.example.com/login`.
2. **Authenticate:** Enters valid credentials → receives JWT stored in context/localStorage.
3. **Redirect:** Automatically redirected to `/`.
4. **Open Chat:** Clicks "Chat" link → routed to `/chat`.
5. **Interact:** Sends prompts, receives streaming responses. Messages are stored and session list auto-updates.
6. **Logout (TBD):** Click "Logout" in nav to clear token and return to `/login`.

### 3.2 Bob — Provision New User

1. **Login:** Bob signs in via `/login`.
2. **Admin Dashboard:** Landing page shows Admin links; Bob selects **Users** (`/admin/users`).
3. **Create:** Fills username & temporary password → clicks _Create_.
4. **Outcome:** New user appears in list.

### 3.3 New User First Login

1. **Credentials:** Receives username + temp password from Bob.
2. **Login:** Temp credentials accepted, API signals `mustChangePwd=true`.
3. **Redirect:** Front-end redirects to `/password-change`.
4. **Password Reset:** Submits old + new password → success message.
5. **Re-login:** Token cleared → redirect to `/login` for fresh sign-in.

### 3.4 Bob — Manage Models

1. **Navigate:** `/admin/models`.
2. **Pull:** Types `llama2-7b:latest` → _Pull_.
3. **Delete:** Click trash icon next to obsolete model.

### 3.5 Bob — Monitor Usage

1. **Navigate:** `/admin/usage`.
2. Page lists quota metrics per user.

## 4. Self-Review & Corrections

- ✅ URLs match current file structure (`frontend/pages/**`).
- ✅ All MVP features mapped (User Mgmt, Chat, Model Manager, Usage viewer).
- ⬜️ _Admin Logs page is listed as future work_ (tracked in roadmap).
- ⬜️ Need global navigation & layout component to surface links.

No immediate corrections required; proceeding to implementation.
