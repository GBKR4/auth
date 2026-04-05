# Complete OAuth Provider Integration Plan

> ⚠️ **Port Reference**
> - Auth service: `http://localhost:3000`
> - CollabDocs backend: `http://localhost:4002`
> - CollabDocs frontend (Vite): `http://localhost:5173`
> - OAuth redirect URI always points to the **CollabDocs frontend** (port 5173)
## Self-Contained Reference Document

---

## CONTEXT — What Exists Today

### Project 1: Auth Service
- **Path:** `C:\Users\Lenoovo\OneDrive\Desktop\New folder\auth\app-backend`
- **Port:** 3000
- **Stack:** Node.js + Express 5, PostgreSQL, JWT (access 15m + refresh 7d), bcrypt, Passport.js + Google OAuth, Nodemailer (SMTP), Pino logging, express-validator
- **Already has:**
  - Email/password register, login, logout, refresh token rotation
  - Email verification (token sent on register, blocks login until clicked)
  - Forgot/reset password with email link
  - Account lockout (5 failed attempts → 15 min block, tracked in `login_attempts` table)
  - Google OAuth via Passport.js + secure one-time code exchange
  - Refresh tokens stored **SHA-256 hashed** in DB (`refresh_tokens` table)
  - Verification tokens stored **SHA-256 hashed** (`verification_tokens` table)
  - `JWT_ACCESS_SECRET` (15m access token) + `JWT_REFRESH_SECRET` (7d refresh token)

### Project 2: CollabDocs (MarkDown-project)
- **Path:** `C:\Users\Lenoovo\OneDrive\Desktop\MarkDown-project`
- **Backend port:** 4002, **WS port:** 1234
- **Stack:** Node.js + Express 5, PostgreSQL, JWT (single 7d token), bcrypt, Yjs + WebSockets, Helmet, Winston logging
- **Already has:** Full collaborative Markdown editor, document CRUD, real-time collab via Yjs, snapshots, invites, member management
- **Auth problem:** Has its own basic login/register built in — needs to be replaced with OAuth client

---

## GOAL

Convert the auth project into a **standalone OAuth 2.0 Authorization Server** with:
1. A **Developer Portal** where developers register their apps and get `client_id` + `client_secret`
2. **OAuth 2.0 Authorization Code + PKCE flow** for email/password login
3. **Google OAuth** plugged into the same OAuth code flow

Convert **CollabDocs** into a **pure OAuth client** — no auth code inside, just redirects to the auth service.

---

## NEW DATABASE TABLES (Auth Service DB)

Add to the **auth service database** (same DB the auth service already uses):

### `oauth_clients`
Stores registered OAuth client apps.
```
id              SERIAL PRIMARY KEY
client_id       VARCHAR(100) UNIQUE NOT NULL       -- e.g. "app_a1b2c3d4"
client_secret   VARCHAR(255) NOT NULL               -- SHA-256 hashed, NEVER raw
name            VARCHAR(100) NOT NULL               -- e.g. "CollabDocs"
redirect_uris   TEXT[] NOT NULL                    -- array of allowed callback URLs
developer_id    INTEGER REFERENCES users(id) ON DELETE CASCADE
created_at      TIMESTAMP DEFAULT NOW()
```

### `oauth_auth_codes`
Stores one-time authorization codes generated during the OAuth flow.
```
id              SERIAL PRIMARY KEY
code            VARCHAR(255) UNIQUE NOT NULL        -- SHA-256 hashed
client_id       VARCHAR(100) NOT NULL
user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE
redirect_uri    TEXT NOT NULL                      -- must match what client sent
code_challenge  VARCHAR(255)                       -- PKCE: S256 challenge
expires_at      TIMESTAMP NOT NULL                 -- 5 minutes from creation
used_at         TIMESTAMP                          -- NULL = unused, set on exchange
```

### Alter existing `users` table
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
-- Roles used: 'user', 'developer', 'admin'
```

---

## PHASE 1 — DEVELOPER PORTAL

### What it does
A protected section of the auth service where developers can:
1. Upgrade their account to `developer` role
2. Register OAuth apps → receive `client_id` + `client_secret` (shown **once**, then hashed in DB)
3. View all their registered apps
4. Rotate (regenerate) a client secret — old one immediately invalid
5. Delete an app — revokes all tokens issued to it

### API Endpoints to Add (JSON responses)

| Method | Path | Auth Required | Role | Description |
|--------|------|--------------|------|-------------|
| POST | `/api/developer/register` | Yes (cookie/bearer) | any | Upgrade own account to `developer` role |
| POST | `/api/developer/clients` | Yes | developer/admin | Register new OAuth app |
| GET | `/api/developer/clients` | Yes | developer/admin | List own apps (no secrets) |
| POST | `/api/developer/clients/:id/rotate` | Yes | developer/admin | Regenerate client secret |
| DELETE | `/api/developer/clients/:id` | Yes | developer/admin | Delete app |

### UI Pages to Add (HTML served by auth service)

| Route | Description |
|-------|-------------|
| `GET /developer` | Dashboard — list of registered apps, "New App" button. Requires login (redirect to `/developer/login` if not) |
| `GET /developer/new` | Form to register a new app (name, redirect URIs) |
| `GET /developer/clients/:id` | App detail: shows client_id, redirect URIs, rotate secret button, delete button |
| `GET /developer/login` | Simple login page for the developer portal specifically |

### New Files to Create (Auth Project)

#### `src/models/OAuthClient.js`
Model with functions:
- `create({ clientId, hashedSecret, name, redirectUris, developerId })` — INSERT into `oauth_clients`
- `findByClientId(clientId)` — SELECT
- `findByDeveloperId(developerId)` — SELECT all for a developer
- `updateSecret(clientId, newHashedSecret)` — UPDATE secret
- `delete(clientId)` — DELETE row
- `verifySecret(rawSecret, storedHash)` — `SHA-256(rawSecret) === storedHash` comparison

#### `src/controllers/developerController.js`
Functions:
- `registerAsDeveloper(req, res)` — sets `role = 'developer'` on `req.user.id`
- `createClient(req, res)`:
  - Validates `name` (required, 2-100 chars), `redirect_uris` (array, ≥1 item, each must be a valid URL)
  - Generates `client_id = 'app_' + crypto.randomBytes(8).toString('hex')`
  - Generates raw `client_secret = crypto.randomBytes(32).toString('hex')`
  - Stores `SHA-256(client_secret)` in DB — raw secret never saved
  - Returns `{ client_id, client_secret }` — **only time secret is visible**
  - Log: `developer registered new OAuth client`
- `listClients(req, res)` — returns all clients for `req.user.id`, **omits secret**
- `rotateSecret(req, res)`:
  - Verifies developer owns the client
  - Generates new raw secret → stores new hash → returns new raw secret once
  - Immediately invalidates old secret
- `deleteClient(req, res)`:
  - Verifies developer owns the client
  - Deletes `oauth_clients` row
  - Revokes (marks `is_revoked = true`) all `refresh_tokens` related to this `client_id`
  - Marks all `oauth_auth_codes` for this `client_id` as used
  - Returns `{ message: 'App deleted' }`
- Dashboard page handlers: `dashboardPage`, `newClientPage`, `clientDetailPage` — render HTML files

#### `src/routes/developer.js`
- Mounts all API routes under `/api/developer`
- Mounts HTML page routes under `/developer`
- Uses `authenticateToken` + `requireRole('developer', 'admin')` on protected API routes
- HTML page routes need session/cookie check; redirect to `/developer/login` if not logged in

#### `src/views/developer/dashboard.html`
Simple HTML page:
- Header with "Developer Portal" title and logged-in user's name
- "Register New App" button → links to `/developer/new`
- Table of registered apps: columns = App Name, Client ID, Created, Actions (View, Delete)
- If no apps registered: empty state message

#### `src/views/developer/new-client.html`
Form:
- Input: App Name (text, required)
- Dynamic inputs: Redirect URIs (start with 1 input, "Add another" button adds more via JS)
- Submit button: "Register App"
- POST to `/api/developer/clients`
- On success response: show a **one-time secret display modal** with `client_id` and `client_secret`, copy buttons for each, warning "Save this secret — it will never be shown again", "Done" button closes modal and redirects to `/developer`

#### `src/views/developer/client-detail.html`
Shows:
- App name, Client ID (copyable)
- List of redirect URIs
- "Rotate Secret" button — on click: POST to `/api/developer/clients/:id/rotate`, show new secret in one-time modal
- "Delete App" button — confirmation dialog → DELETE to `/api/developer/clients/:id`
- Back to dashboard link

### Modify Existing Files (Auth Project — Phase 1)

#### `src/middlewares/auth.js`
Add `requireRole(...roles)` export:
```
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};
```

#### `src/app.js`
- Import and mount `developerRouter` at both `/api/developer` (API) and `/developer` (UI)
- Add `express.static('src/views')` to serve HTML/CSS/JS assets
- Add `app.set('views', ...)` if using a template engine (optional — plain HTML is fine)

---

## PHASE 2 — OAUTH 2.0 AUTHORIZATION SERVER

### What it does
Adds the actual OAuth 2.0 Authorization Code + PKCE flow endpoints so registered apps can authenticate users through the auth service.

### OAuth Flow Step by Step

```
Step 1. Client app redirects user to:
  GET /oauth/authorize
    ?client_id=app_abc123
    &redirect_uri=http://localhost:3000/auth/callback
    &response_type=code
    &code_challenge=<BASE64URL(SHA256(code_verifier))>
    &code_challenge_method=S256
    &state=<random_csrf_token>

Step 2. Auth service validates all params.
  If invalid client_id or redirect_uri → show error page (DO NOT redirect — security risk).
  If valid → show login page (HTML) with all params as hidden inputs.

Step 3. User submits email + password on login page.
  POST /oauth/login (form submit)
  Auth service:
    - Validates credentials (same lockout logic as regular login)
    - Checks email verified, account active
    - Generates raw auth_code = crypto.randomBytes(32).toString('hex')
    - Stores SHA-256(auth_code) in oauth_auth_codes with 5-minute expiry
    - Redirects to: redirect_uri?code=<raw_auth_code>&state=<same_state>

Step 4. Client app receives code, verifies state matches stored value (CSRF check).
  Client app backend calls:
  POST /oauth/token
    { client_id, client_secret, code, redirect_uri, code_verifier }

Step 5. Auth service:
  - Verifies client_secret: SHA-256(raw) === stored hash
  - Finds SHA-256(code) in oauth_auth_codes — checks not expired, not used, redirect_uri matches
  - Verifies PKCE: SHA-256(code_verifier) === stored code_challenge (BASE64URL encoded)
  - Marks code as used_at = NOW() IMMEDIATELY (single use, even if rest fails)
  - Issues access_token (15m, signed with JWT_ACCESS_SECRET)
  - Issues refresh_token (7d, stored hashed in refresh_tokens)
  - Returns: { access_token, refresh_token, token_type: 'Bearer', expires_in: 900, user: { id, email, username, role } }
```

### API Endpoints to Add

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/oauth/authorize` | None | Validate params, show login page |
| POST | `/oauth/login` | None | Handle login form, issue auth code, redirect |
| GET | `/oauth/google-start` | None | Start Google OAuth within OAuth flow (preserves client params) |
| POST | `/oauth/token` | client credentials | Exchange code for tokens |
| POST | `/oauth/refresh` | client credentials | Rotate refresh token |
| GET | `/oauth/userinfo` | Bearer access token | Return user profile |
| POST | `/oauth/revoke` | client credentials | Revoke refresh token (logout) |

### New Files to Create (Auth Project — Phase 2)

#### `src/models/OAuthAuthCode.js`
Functions:
- `create({ hashedCode, clientId, userId, redirectUri, codeChallenge, expiresAt })` — INSERT
- `findByCode(rawCode)` — hashes rawCode with SHA-256 then SELECT WHERE code = hash AND used_at IS NULL AND expires_at > NOW()
- `markAsUsed(rawCode)` — UPDATE SET used_at = NOW()
- `deleteExpired()` — DELETE WHERE expires_at < NOW() (called by cleanup job)

#### `src/utils/pkce.js`
Functions:
- `verifyPKCE(codeVerifier, codeChallenge)`:
  - Computes `SHA-256(codeVerifier)` → base64url encode (no padding)
  - Compares to `codeChallenge`
  - Returns `true` or `false`
- `hashToken(rawToken)`:
  - `crypto.createHash('sha256').update(rawToken).digest('hex')`

#### `src/controllers/oauthController.js`
Functions:

**`authorize(req, res)`** (GET /oauth/authorize):
- Read query params: `client_id`, `redirect_uri`, `response_type`, `code_challenge`, `code_challenge_method`, `state`
- Validate `response_type === 'code'` — else error
- Validate `state` is present — else error
- Validate `code_challenge_method === 'S256'` — else error
- Look up `client_id` in `oauth_clients`
- If not found → render error page (do NOT redirect)
- If `redirect_uri` not in `client.redirect_uris` → render error page (do NOT redirect)
- All valid → render `/oauth/login.html` with all params passed as hidden form fields

**`handleLogin(req, res)`** (POST /oauth/login):
- Read body: `email`, `password`, `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method`
- Re-validate `client_id` + `redirect_uri` (never trust what comes from the form)
- Validate email + password (same lockout logic as existing login controller)
- Check user `is_verified` and `is_active`
- On success:
  - Generate raw code = `crypto.randomBytes(32).toString('hex')`
  - Store `SHA-256(code)` in `oauth_auth_codes` (5 min expiry)
  - Redirect to `redirect_uri?code=${rawCode}&state=${state}`
- On failure: re-render login page with error message, preserve all hidden fields

**`token(req, res)`** (POST /oauth/token):
- Read body: `client_id`, `client_secret`, `code`, `redirect_uri`, `code_verifier`, `grant_type`
- Validate `grant_type === 'authorization_code'`
- Look up `client_id` — if not found → 401
- Verify `client_secret`: `SHA-256(client_secret) === client.client_secret` — if fail → 401
- Find auth code: `OAuthAuthCode.findByCode(code)` — if not found/expired/used → 400
- Verify `redirect_uri` matches what's stored in the auth code — if not → 400
- Verify PKCE: `pkce.verifyPKCE(code_verifier, authCode.code_challenge)` — if fail → 400
- Mark code as used: `OAuthAuthCode.markAsUsed(code)` — do this BEFORE issuing tokens
- Find user: `User.findById(authCode.user_id)` — if not active → 401
- Generate `access_token = jwt.sign({ id, email, username, role }, JWT_ACCESS_SECRET, { expiresIn: '15m' })`
- Generate `refresh_token = crypto.randomBytes(32).toString('hex')`
- Store `SHA-256(refresh_token)` in `refresh_tokens` table (7d expiry, with client_id)
- Return: `{ access_token, refresh_token, token_type: 'Bearer', expires_in: 900, user: { id, email, username, first_name, last_name, role, profile_picture } }`

**`refresh(req, res)`** (POST /oauth/refresh):
- Read body: `client_id`, `client_secret`, `refresh_token`
- Verify client credentials (same as token endpoint)
- Find `SHA-256(refresh_token)` in `refresh_tokens` — check not revoked, not expired
- Find user — check still active
- Revoke old refresh token
- Generate new access + refresh token pair
- Store new refresh token
- Return: `{ access_token, refresh_token, token_type: 'Bearer', expires_in: 900 }`

**`userinfo(req, res)`** (GET /oauth/userinfo):
- Protected by `authenticateToken` middleware (verifies `JWT_ACCESS_SECRET`)
- Return: `{ id, email, username, first_name, last_name, role, profile_picture, is_verified }`

**`revoke(req, res)`** (POST /oauth/revoke):
- Read body: `client_id`, `client_secret`, `refresh_token`
- Verify client credentials
- Mark `SHA-256(refresh_token)` as `is_revoked = true` in `refresh_tokens`
- Return: `{ message: 'Token revoked' }`

#### `src/routes/oauth.js`
Mount all oauth endpoints. All routes under `/oauth` prefix.

#### `src/views/oauth/login.html`
HTML login page shown to users during the OAuth flow:
- Title: "Sign in to [App Name]" (pass app name from controller)
- Email input, password input
- Hidden inputs: `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method`
- Submit button: "Sign in"
- "Sign in with Google" button → links to `/oauth/google-start?client_id=X&redirect_uri=Y&state=Z&code_challenge=C&code_challenge_method=S256`
- Error message area (shown if login failed, re-rendered with error)
- "Forgot password?" link → opens in new tab to `{FRONTEND_URL}/forgot-password` (or auth service forgot password page)
- Clean, standalone design (not embedded in any app's UI)

#### Modify `src/controllers/googleAuthController.js`
When Google OAuth is initiated **from the OAuth flow** (via `/oauth/google-start`):
- Store the OAuth flow params (`client_id`, `redirect_uri`, `state`, `code_challenge`) in the Passport.js `state` parameter (base64-encoded JSON)
- In `googleAuthCallback`: decode the state, detect if it's an OAuth flow request
  - If yes: generate auth code for the Google-authenticated user → redirect to `redirect_uri?code=X&state=Y` (same as email login)
  - If no (direct Google login): existing behavior (issue tokens directly via cookie)

#### `src/app.js` changes
- Import and mount `oauthRouter` at `/oauth`
- Register cleanup job: every 6 hours call `OAuthAuthCode.deleteExpired()`

---

## PHASE 3 — COLLABDOCS BECOMES OAUTH CLIENT

### What Changes in CollabDocs Backend

#### Files to DELETE completely:
- `app-backend/src/controllers/auth.controller.js`
- `app-backend/src/services/auth.service.js`
- `app-backend/src/utils/jwt.js`
- `app-backend/src/utils/password.js`
- `app-backend/src/utils/tokens.js`

#### New `src/controllers/auth.controller.js` (minimal, replaces old)

Only **3 handlers**:

**`exchangeToken(req, res)`** (POST /api/auth/token):
- Receives from frontend: `{ code, codeVerifier }`
- Calls auth service: `POST {AUTH_SERVICE_URL}/oauth/token` with body:
  ```json
  {
    "client_id": process.env.OAUTH_CLIENT_ID,
    "client_secret": process.env.OAUTH_CLIENT_SECRET,
    "code": code,
    "redirect_uri": process.env.OAUTH_REDIRECT_URI,
    "code_verifier": codeVerifier,
    "grant_type": "authorization_code"
  }
  ```
- On success from auth service: set two httpOnly cookies:
  - `accessToken`: value = access_token, maxAge = 15 minutes, httpOnly, Secure in prod, SameSite=Lax
  - `refreshToken`: value = refresh_token, maxAge = 7 days, httpOnly, Secure in prod, SameSite=Lax
- Return to frontend: `{ user: { id, email, username, role } }`
- On failure: return 401

**`refreshToken(req, res)`** (POST /api/auth/refresh) — *NEW, was missing from original plan*:
- Read `refreshToken` from `req.cookies.refreshToken`
- If missing → return 401
- Call auth service: `POST {AUTH_SERVICE_URL}/oauth/refresh` with body:
  ```json
  { "client_id": OAUTH_CLIENT_ID, "client_secret": OAUTH_CLIENT_SECRET, "refresh_token": refreshToken }
  ```
- On success: set new `accessToken` cookie (15m) and new `refreshToken` cookie (7d)
- Return: `{ message: 'Token refreshed' }`
- On failure: clear both cookies → return 401 (forces re-login)

**`logout(req, res)`** (POST /api/auth/logout):
- Get `refreshToken` from `req.cookies.refreshToken`
- If exists: call auth service `POST {AUTH_SERVICE_URL}/oauth/revoke` with `{ client_id, client_secret, refresh_token }`
- Clear both cookies: `res.clearCookie('accessToken')` + `res.clearCookie('refreshToken')`
- Return: `{ message: 'Logged out' }`

#### Modify `src/middlewares/auth.js`
- Remove: DB lookup, old JWT_SECRET usage
- New logic:
  - Read token from `req.cookies.accessToken` OR `Authorization: Bearer` header
  - Verify with `jwt.verify(token, process.env.JWT_ACCESS_SECRET)`
  - If valid: `req.user = decoded` (payload has `{ id, email, username, role }`)
  - If invalid: return 401

#### Modify `src/routes/auth.routes.js`
Remove all existing routes. Replace with:
```
POST /api/auth/token     → exchangeToken  (no auth middleware)
POST /api/auth/refresh   → refreshToken   (no auth middleware — access token may be expired)
POST /api/auth/logout    → logout         (with authMiddleware)
```

#### Modify `src/realtime/websocketServer.js`
- Change: `jwt.verify(token, process.env.JWT_SECRET)` → `jwt.verify(token, process.env.JWT_ACCESS_SECRET)`
- The WS token is still issued by CollabDocs itself (5-min WS-only token) but signed with `JWT_ACCESS_SECRET` instead of `JWT_SECRET`

#### Modify `src/services/collabRoom.service.js`
- Change signing key: `config.jwt.secret` → `process.env.JWT_ACCESS_SECRET`

#### Modify `src/config/index.js`
- Change `jwt.secret` to read from `JWT_ACCESS_SECRET`
- Remove `SALT_ROUNDS`

#### Modify `src/app.js`
- Change startup guard: replace `JWT_SECRET` check with `JWT_ACCESS_SECRET`
- Add `AUTH_SERVICE_URL` to required env vars check

#### Update `app-backend/.env`
Remove:
```
JWT_SECRET
JWT_EXPIRES_IN
SALT_ROUNDS
```
Add:
```
JWT_ACCESS_SECRET=<MUST MATCH auth service JWT_ACCESS_SECRET exactly>
AUTH_SERVICE_URL=http://localhost:3000
OAUTH_CLIENT_ID=<client_id from Developer Portal>
OAUTH_CLIENT_SECRET=<client_secret from Developer Portal>
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

---

### What Changes in CollabDocs Frontend

#### Modify `src/pages/Login.jsx`
No more form. Just a button/auto-redirect:
1. User clicks "Login" (or page auto-redirects)
2. Frontend generates PKCE pair:
   - `codeVerifier` = 43-128 char random base64url string (`crypto.getRandomValues`)
   - `codeChallenge` = base64url(SHA-256(codeVerifier)) using Web Crypto API
   - `state` = random 32-char hex string
3. Store in `sessionStorage`: `pkce_verifier`, `oauth_state`
4. Build URL:
   ```
   {AUTH_SERVICE_URL}/oauth/authorize
     ?client_id={OAUTH_CLIENT_ID}
     &redirect_uri={OAUTH_REDIRECT_URI}
     &response_type=code
     &code_challenge={codeChallenge}
     &code_challenge_method=S256
     &state={state}
   ```
5. `window.location.href = url`

#### New `src/pages/AuthCallback.jsx`
Route: `/auth/callback`
1. Read `code` and `state` from URL search params
2. Read `oauth_state` from `sessionStorage`
3. If `state !== sessionStorage.oauth_state` → show error "Invalid state" → redirect to `/login`
4. Read `pkce_verifier` from `sessionStorage`
5. Clear both from `sessionStorage`
6. Call `POST /api/auth/token` with `{ code, codeVerifier: pkce_verifier }`
7. On success: call `AuthContext.setUser(response.user)` → navigate to `/dashboard`
8. On error: navigate to `/login?error=auth_failed`
9. Show a loading spinner while processing

#### New `src/utils/pkce.js` (frontend)
Three functions using the **Web Crypto API** (works in browser, no npm package needed):
- `generateCodeVerifier()`: `crypto.getRandomValues(new Uint8Array(32))` → base64url encode
- `generateCodeChallenge(verifier)`: async, `crypto.subtle.digest('SHA-256', encoder.encode(verifier))` → base64url encode
- `generateState()`: `crypto.getRandomValues(new Uint8Array(16))` → hex string

#### Modify `src/context/AuthContext.jsx`
- Remove `login(email, password)` action
- Remove `register(name, email, password)` action
- Add `loginWithOAuth()` action — generates PKCE + builds URL + redirects (or move this to Login.jsx directly)
- Add `setUser(user)` action — called by AuthCallback after successful exchange
- Keep `logout()` — calls `POST /api/auth/logout`
- Keep session verification on app load (GET /api/docs validates cookie)
- `loading` state and session check remain the same

#### Modify `src/api/client.js` (Axios interceptor — auto-refresh)
Update the 401 response interceptor:
```
On 401 response:
1. If the failed request was NOT /api/auth/refresh itself:
   → Try POST /api/auth/refresh
   → If refresh succeeds: retry the original request once
   → If refresh fails (401): clear user state → navigate to /login
2. If the failed request WAS /api/auth/refresh:
   → Clear user state → navigate to /login (session fully expired)
```
This ensures the access token (15m) is silently renewed from the refresh token (7d) without the user noticing.

#### Modify `src/router/AppRouter.jsx`
Add route: `/auth/callback` → `<AuthCallback />`
Remove: `/register` route (registration now on auth service)
Keep: `/login`, `/dashboard`, `/editor/:docId`, `/invite/:token`
Redirect: `/` → `/dashboard`

#### Modify `src/utils/constants.js`
Add:
```js
export const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3000';
export const OAUTH_CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID || '';
export const OAUTH_REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : 'http://localhost:3000/auth/callback';
```

#### Update `app-frontend/.env`
Add:
```
VITE_AUTH_SERVICE_URL=http://localhost:3000
VITE_OAUTH_CLIENT_ID=<client_id from Developer Portal>
```

#### Modify `src/api/authApi.js`
Remove: `login()`, `register()`
Add: `exchangeToken(code, codeVerifier)` → POST /api/auth/token

---

## ENVIRONMENT VARIABLES SUMMARY

### Auth Service `.env` (no changes needed — already has everything)
```
NODE_ENV=development
PORT=3000
DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME / DB_SSL
JWT_ACCESS_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret, different from access>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
EMAIL_HOST / EMAIL_PORT / EMAIL_SECURE / EMAIL_USER / EMAIL_PASSWORD / EMAIL_FROM
FRONTEND_URL=http://localhost:5173        ← CollabDocs frontend (Vite port)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4002
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### CollabDocs Backend `.env` (updated)
```
NODE_ENV=development
PORT=4002
YWEBSOCKET_PORT=1234
FRONTEND_URL=http://localhost:5173  ← CollabDocs frontend
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD  ← CollabDocs own DB

# OAuth client config
JWT_ACCESS_SECRET=<EXACT SAME VALUE as auth service JWT_ACCESS_SECRET>
AUTH_SERVICE_URL=http://localhost:3000
OAUTH_CLIENT_ID=<from Developer Portal after registering CollabDocs>
OAUTH_CLIENT_SECRET=<from Developer Portal — save it, shown only once>
OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback   ← CollabDocs FRONTEND port
```

### CollabDocs Frontend `.env` (updated)
```
VITE_API_URL=http://localhost:4002
VITE_WS_URL=ws://localhost:1234
VITE_AUTH_SERVICE_URL=http://localhost:3000
VITE_OAUTH_CLIENT_ID=<same client_id from Developer Portal>
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

> ⚠️ When registering CollabDocs in the Developer Portal, the redirect URI to enter is:
> `http://localhost:5173/auth/callback`
> For production, replace `localhost:5173` with your actual frontend domain.

---

## BUILD ORDER (Step by Step)

### Step 1 — DB Migration (Auth Service)
- Add `role` column to `users` table
- Create `oauth_clients` table
- Create `oauth_auth_codes` table

### Step 2 — Phase 1: Developer Portal
1. Create `src/models/OAuthClient.js`
2. Create `src/controllers/developerController.js`
3. Create `src/routes/developer.js`
4. Create `src/views/developer/dashboard.html`
5. Create `src/views/developer/new-client.html`
6. Create `src/views/developer/client-detail.html`
7. Add `requireRole` to `src/middlewares/auth.js`
8. Mount developer routes in `src/app.js`
9. **Test**: Register a developer account → open `/developer` → register "CollabDocs" app → save the `client_id` and `client_secret`

### Step 3 — Phase 2: OAuth Server
1. Create `src/utils/pkce.js`
2. Create `src/models/OAuthAuthCode.js`
3. Create `src/controllers/oauthController.js`
4. Create `src/routes/oauth.js`
5. Create `src/views/oauth/login.html`
6. Update `src/controllers/googleAuthController.js` to support OAuth code flow
7. Mount oauth routes in `src/app.js`
8. Add cleanup job for expired auth codes
9. **Test**: Manually call `GET /oauth/authorize?client_id=...&redirect_uri=...&response_type=code&code_challenge=test&code_challenge_method=S256&state=abc` → see login page → login → get redirected with code → exchange code for tokens

### Step 4 — Phase 3: CollabDocs Backend
1. Delete old auth files
2. Create new minimal `src/controllers/auth.controller.js`
3. Update `src/middlewares/auth.js`
4. Update `src/routes/auth.routes.js`
5. Update `src/realtime/websocketServer.js`
6. Update `src/services/collabRoom.service.js`
7. Update `src/config/index.js`
8. Update `.env`
9. **Test**: Start CollabDocs → backend health check works → WS server starts

### Step 5 — Phase 3: CollabDocs Frontend
1. Create `src/utils/pkce.js`
2. Create `src/pages/AuthCallback.jsx`
3. Update `src/pages/Login.jsx`
4. Update `src/context/AuthContext.jsx`
5. Update `src/router/AppRouter.jsx`
6. Update `src/utils/constants.js`
7. Update `src/api/authApi.js`
8. Update `.env`
9. **Test**: Open CollabDocs → click Login → redirected to auth service login page → login → redirected back → dashboard loads → collaborative editing works

---

## VERIFICATION CHECKLIST

| Test | Expected Result |
|------|----------------|
| Register developer account | Role updated to 'developer' |
| Open `/developer` | Dashboard shows (empty) |
| Register new OAuth app "CollabDocs" | Returns client_id + client_secret (one time) |
| View apps list | client_id visible, secret NOT visible |
| Rotate secret | New secret shown once, old secret rejected |
| Delete app | App gone, related tokens revoked |
| Open CollabDocs → Login | Redirects to auth service login page |
| Login with email/password on auth page | Redirected back with code → Auth callback exchanges code → Dashboard loads |
| Login with Google on auth page | Google OAuth flow → redirected back → Dashboard loads |
| Access token expires (15m) | Axios interceptor calls POST /api/auth/refresh → new access token set in cookie → original request retried automatically |
| Logout | Cookies cleared, refresh token revoked in auth service DB |
| Collaborative editing | Works as before (WS auth uses same JWT_ACCESS_SECRET) |
| Invite link flow | Works as before (no auth change in invite logic) |

---

## IMPORTANT SECURITY NOTES

1. **`JWT_ACCESS_SECRET` must be identical** in both auth service and CollabDocs — this is what allows CollabDocs to verify tokens issued by the auth service without calling back to it
2. **Never redirect if `client_id` or `redirect_uri` is invalid** in `/oauth/authorize` — show error page instead (prevents open-redirect attacks)
3. **Auth codes expire in 5 minutes** and are **single-use** — mark as used immediately when exchanged
4. **PKCE is required** — every authorization request must include `code_challenge`, every token request must include `code_verifier`
5. **State parameter is required** — frontend must verify it matches before exchanging code (CSRF protection)
6. **Client secret stored as SHA-256 hash** — never store or log raw secrets
7. **Refresh tokens stored as SHA-256 hash** — never store raw in DB (same as auth project already does)
8. **Auto-refresh**: CollabDocs Axios interceptor should try `POST /oauth/refresh` on 401 before redirecting to login
