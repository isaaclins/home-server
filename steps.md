# User Management Feature Completion Steps

## I. Backend (Node.js/Express - `docker-data/backend/server.js`)

- [x] **1. Middleware for JWT Authentication & Authorization:**

  - [x] Create a middleware function `authenticateJWT`.
    - [x] It should extract the token from the `Authorization: Bearer <token>` header.
    - [x] Verify the token using `jsonwebtoken` and the `JWT_SECRET`.
    - [x] If valid, attach the decoded user payload (especially `username` and `isAdmin`) to `req.user`.
    - [x] If invalid or not present, send a 401 or 403 error.
  - [x] Create a middleware function `authorizeAdmin`.
    - [x] It should check if `req.user && req.user.isAdmin` is true.
    - [x] If not admin, send a 403 Forbidden error.
    - [x] This middleware will be used after `authenticateJWT` for admin-only routes.

- [ ] **2. User CRUD API Endpoints:**

  - [x] **GET `/api/users` (Admin only):**
    - [x] Implement route `app.get('/api/users', authenticateJWT, authorizeAdmin, (req, res) => { ... });`
    - [x] Fetch all users from the `users` table (excluding `hashed_password`).
    - [x] Return the list of users as JSON.
  - [x] **POST `/api/users` (Admin only):**
    - [x] Implement route `app.post('/api/users', authenticateJWT, authorizeAdmin, (req, res) => { ... });`
    - [x] Get `username`, `email`, `password`, `isAdmin` from `req.body` (Note: `email` isn't in the current DB schema in `setup.sh`. I will add it or confirm if it should be omitted. For now, I'll assume it should be added to the schema and handled here).
    - [x] Validate inputs (e.g., username, email, and password are not empty, isAdmin is boolean).
    - [x] Hash the provided password using the `hashPassword` function.
    - [x] Insert the new user into the `users` table.
    - [x] Return the created user (excluding `hashed_password`) or a success message.
  - [x] **PUT `/api/users/:id` (Admin only):**
    - [x] Implement route `app.put('/api/users/:id', authenticateJWT, authorizeAdmin, (req, res) => { ... });`
    - [x] Get `username`, `email`, `isAdmin` from `req.body` and `id` from `req.params`. (Password updates handled separately if at all by admin, or not via this generic endpoint for simplicity. For now, password update is excluded from this PUT).
    - [x] Validate inputs.
    - [x] Update the user in the `users` table.
    - [x] Return the updated user (excluding `hashed_password`) or a success message.
  - [x] **DELETE `/api/users/:id` (Admin only):**
    - [x] Implement route `app.delete('/api/users/:id', authenticateJWT, authorizeAdmin, (req, res) => { ... });`
    - [x] Get `id` from `req.params`.
    - [x] Prevent admin from deleting themselves (optional but good practice).
    - [x] Delete the user from the `users` table.
    - [x] Return a success message or 204 No Content.

- [x] **3. Database Schema Update (if adding email):**

  - [x] Modify `docker-data/setup.sh` to include an `email TEXT` column in the `users` table if `email` is to be managed.
  - [x] _Self-correction: UserManagementPage and UserForm on the frontend expect an email field. I will add `email` to the backend schema and logic._
  - [x] Added `created_at` to `users` table in `setup.sh`.

- [x] **4. Database Connection Handling:**
  - [x] Ensure database connections are opened and closed properly for each query.

## II. Frontend (Next.js - `docker-data/frontend/`)

- [x] **1. Connect API Calls in `pages/admin/users.js`:**

  - [x] Uncomment the `fetch` calls in `fetchUsers`, `createUserAPI`, `updateUserAPI`, `deleteUserAPI`.
  - [x] Remove the mock data and `console.warn` calls from these functions.
  - [x] Ensure error handling and toasts work correctly with actual API responses.

- [ ] **2. Login Page (`pages/login.js`) Enhancements:**

  - [x] Ensure the redirect after login properly updates the `Layout.js` to show admin links. (Current `router.reload()` is a temporary fix. Consider a React Context for auth state if reload is problematic, but will proceed with reload for now). (Addressed via AuthContext)

- [ ] **3. Layout Component (`components/Layout.js`) Reactivity:**

  - [x] Ensure the user state in the Layout updates upon login/logout without needing a full page reload (related to the point above. This might involve a global state or context, or at least a way to signal a refresh of the user data from `localStorage`). For now, the `router.reload()` on the login page handles this for login. Logout already updates state locally. (Addressed via AuthContext)

## III. Documentation & Cleanup

- [ ] **1. Update `README.md` (if necessary):**
  - [ ] Document new API endpoints.
  - [ ] Explain user management functionality.
- [ ] **2. Code Cleanup:**
  - [ ] Remove any unused mock code or console logs (except intentional ones).
  - [ ] Ensure consistent formatting.
