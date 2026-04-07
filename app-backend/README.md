# 🔐 Auth Provider — OAuth 2.0 Server

A production-ready **OAuth 2.0 Authorization Server** and authentication provider built with Node.js, Express 5, and PostgreSQL. It exposes a full OAuth 2.0 PKCE flow for third-party applications, along with a **Developer Portal** for registering and managing OAuth clients.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2.1-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ What's New — UI Overhaul

All server-rendered HTML pages now use a **premium dark glassmorphism design** powered by [Lucide Icons](https://lucide.dev) (the same icon set as `react-icons/lu`) via CDN:

- 🌑 Deep `#060818` background with animated radial gradient orbs
- 🪟 `backdrop-filter: blur(20px)` glassmorphism cards with glowing top-line accents
- 🔮 Purple gradient buttons (`#6c63ff → #8b5cf6`) with drop-shadow glow
- 🔡 **Inter** font (Google Fonts) · consistent `--border`, `--primary`, `--muted` CSS variables
- 👁️ Password show/hide toggle (`eye` / `eye-off`) on every password field
- 📩 Contextual input prefix icons (`mail`, `lock`, `at-sign`, `link`, `key-round`, `user`, …)
- ✅ Styled success / error alert boxes with `check-circle-2` / `alert-circle` icons
- 🚀 Icon-enriched buttons: `log-in`, `send`, `rocket`, `trash-2`, `refresh-cw`, `copy`, `check`

> **Icon library:** [Lucide](https://lucide.dev) — MIT licensed, framework-agnostic SVG icon set (`<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js">`)

---

## 🚀 Features

### 🔑 Authentication
- ✅ **Local Authentication** — Email + Password with Bcrypt hashing
- ✅ **Google OAuth 2.0** — Sign in with Google (Passport.js strategy)
- ✅ Smart email linking — Google accounts detected on password login
- ✅ Auto-verification for OAuth users

### 🛡️ OAuth 2.0 Authorization Server (PKCE)
- ✅ Authorization Code flow with **PKCE** (`code_challenge` / `code_verifier`)
- ✅ Third-party apps can request scopes and receive short-lived authorization codes
- ✅ Token exchange endpoint — code → access token + refresh token
- ✅ `client_id` / `client_secret` based app authentication
- ✅ Per-client `redirect_uri` allowlist enforcement
- ✅ Consent / login screen served at `/oauth/authorize`

### 🧑‍💻 Developer Portal
- ✅ Register OAuth applications (name + redirect URIs)
- ✅ View `client_id` and one-time `client_secret` on registration
- ✅ Rotate client secret
- ✅ Delete registered applications
- ✅ Beautiful glassmorphism UI at `/developer`

### 🛡️ Security
- ✅ JWT Access Token (15 min) + Refresh Token (7 days) in `httpOnly` cookies
- ✅ Bcrypt password hashing with adaptive cost factor
- ✅ Helmet.js security headers
- ✅ Rate limiting on login, register, and password reset endpoints
- ✅ Input validation & sanitization (`express-validator`)
- ✅ SQL injection protection (parameterized queries)
- ✅ Token revocation on logout
- ✅ Role-based access control (`user` / `developer` / `admin`)

### 📧 Email System
- ✅ Email verification on registration
- ✅ Resend verification email
- ✅ Password reset via email (time-limited token)
- ✅ Gmail SMTP integration

---

## 🖥️ Pages & Routes

### OAuth Flow (served by the auth server)
| URL | Description |
|-----|-------------|
| `/oauth/authorize` | OAuth login/consent screen shown to the end-user |
| `/oauth/register` | Create new account (end-user registration) |
| `/forgot-password` | Request a password reset link |
| `/reset-password/:token` | Set a new password using a reset token |

### Developer Portal
| URL | Description |
|-----|-------------|
| `/developer/login` | Developer sign-in |
| `/developer` | Dashboard — list all registered OAuth apps |
| `/developer/new` | Register a new OAuth application |
| `/developer/clients/:id` | Manage a specific app (credentials, URIs, delete, rotate secret) |

---

## 📋 Prerequisites

- **Node.js** v18+
- **PostgreSQL** v16 (or v12+)
- **Gmail account** with App Password enabled
- **Google Cloud Console** project (for Google OAuth)

---

## 🛠️ Installation & Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd auth
```

### 2. Install Backend Dependencies
```bash
cd app-backend && npm install
```

### 3. Create PostgreSQL Database

**Windows (PowerShell):**
```powershell
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE auth_db;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d auth_db -f "app-backend/src/database/schema.sql"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d auth_db -f "app-backend/src/database/google-auth-migration.sql"
```

**Linux / macOS:**
```bash
psql -U postgres -c "CREATE DATABASE auth_db;"
psql -U postgres -d auth_db -f app-backend/src/database/schema.sql
psql -U postgres -d auth_db -f app-backend/src/database/google-auth-migration.sql
```

### 4. Configure Environment Variables

Copy `app-backend/.env.example` → `app-backend/.env` and fill in:

```env
# Server
NODE_ENV=development
PORT=3000
AUTH_SERVER_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=auth_db

# JWT — use 64+ char random strings
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (Gmail App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@yourapp.com

# Frontend / client app URL
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173

# CORS — comma-separated allowed origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Google OAuth 2.0
# Authorized redirect URI: http://localhost:3000/api/auth/google/callback
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### 5. Gmail App Password

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. **Security → 2-Step Verification → App passwords**
3. Create a password for "Mail" and paste it into `EMAIL_PASSWORD`

### 6. Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
3. Application type: **Web application**
4. **Authorized JavaScript origins:** `http://localhost:3000`
5. **Authorized redirect URIs:** `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Secret → `.env`

### 7. Start the Server
```bash
cd app-backend
npm run dev
# → http://localhost:3000
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication (`/auth`)

#### Local Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login with email/password | ❌ |
| POST | `/auth/logout` | Logout & revoke refresh token | ❌ |
| POST | `/auth/refresh` | Get new access token | ❌ |
| GET  | `/auth/verify/:token` | Verify email address | ❌ |
| POST | `/auth/resend-verification` | Resend verification email | ❌ |

#### Password Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/validate-reset-token` | Validate reset token (used by UI) |

#### Google OAuth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate Google OAuth flow |
| GET | `/auth/google/callback` | Google callback → sets httpOnly cookies |

### User Management (`/user`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/user/me` | Get current user info | ✅ JWT |
| GET | `/user/profile` | Get full profile | ✅ JWT |
| PUT | `/user/profile` | Update name | ✅ JWT |
| PUT | `/user/change-password` | Change password | ✅ JWT |
| DELETE | `/user/delete-account` | Delete own account | ✅ JWT |
| GET | `/user/users` | List all users | ✅ Admin |

### OAuth 2.0 Server (`/oauth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/oauth/authorize` | Show login/consent screen |
| POST | `/oauth/login` | Process the OAuth login |
| POST | `/oauth/token` | Exchange auth code for tokens |
| POST | `/oauth/introspect` | Inspect an access token |

### Developer API (`/developer`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET  | `/developer/clients` | List registered apps | ✅ Session |
| POST | `/developer/clients` | Register new app | ✅ Session |
| DELETE | `/developer/clients/:id` | Delete an app | ✅ Session |
| POST | `/developer/clients/:id/rotate` | Rotate client secret | ✅ Session |

---

## 📝 API Examples

### Register User
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response `201`:**
```json
{
  "message": "User registered successfully. Please check your email to verify your account.",
  "user": { "id": 1, "email": "user@example.com", "username": "johndoe" }
}
```

### Login
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "SecurePass123!" }
```

> Tokens are set as `httpOnly` cookies — never in the response body.

### Register an OAuth App (Developer API)
```bash
POST http://localhost:3000/api/developer/clients
Content-Type: application/json

{
  "name": "CollabDocs",
  "redirect_uris": ["http://localhost:5173/auth/callback"]
}
```

**Response `201`:**
```json
{
  "client_id": "abc123...",
  "client_secret": "sk_live_...",
  "name": "CollabDocs",
  "redirect_uris": ["http://localhost:5173/auth/callback"]
}
```

> ⚠️ The `client_secret` is only shown **once** at registration. Save it immediately.

### OAuth 2.0 PKCE Authorization Flow (for client apps)

**Step 1 — Redirect user to the auth server:**
```
GET http://localhost:3000/oauth/authorize
  ?response_type=code
  &client_id=<your-client-id>
  &redirect_uri=http://localhost:5173/auth/callback
  &state=<random-state>
  &code_challenge=<base64url(SHA256(code_verifier))>
  &code_challenge_method=S256
  &app_name=CollabDocs
```

**Step 2 — Exchange code for tokens:**
```bash
POST http://localhost:3000/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "<auth-code>",
  "redirect_uri": "http://localhost:5173/auth/callback",
  "client_id": "<your-client-id>",
  "client_secret": "<your-client-secret>",
  "code_verifier": "<original-code-verifier>"
}
```

---

## 🗄️ Database Schema

### `users`
```sql
id              SERIAL PRIMARY KEY
email           VARCHAR(255) UNIQUE NOT NULL
username        VARCHAR(100) UNIQUE NOT NULL
password_hash   VARCHAR(255)              -- NULL for Google OAuth users
first_name      VARCHAR(100)
last_name       VARCHAR(100)
google_id       VARCHAR(255) UNIQUE       -- Set for Google OAuth users
auth_provider   VARCHAR(50) DEFAULT 'local'
profile_picture TEXT
is_verified     BOOLEAN DEFAULT FALSE
is_active       BOOLEAN DEFAULT TRUE
role            VARCHAR(50) DEFAULT 'user' -- 'user' | 'developer' | 'admin'
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
last_login      TIMESTAMP
```

### Other Tables
| Table | Purpose |
|-------|---------|
| `refresh_tokens` | Stored & rotated JWT refresh tokens |
| `verification_tokens` | Email verification + password reset tokens |
| `oauth_clients` | Registered OAuth applications (`client_id`, `client_secret`, `redirect_uris`) |
| `oauth_codes` | Short-lived PKCE authorization codes |
| `oauth_tokens` | Issued OAuth access & refresh tokens |
| `sessions` | Session tracking with IP & user agent |
| `login_attempts` | Security audit logging |

> Schema files: `app-backend/src/database/schema.sql` + `google-auth-migration.sql`

---

## 🔒 Security

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 20 requests | 15 min |
| Register | 10 requests | 15 min |
| Password Reset | 5 requests | 15 min |
| General API | 100 requests | 15 min |

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character

### JWT Tokens
- **Access Token** — 15-min expiry, `httpOnly` cookie
- **Refresh Token** — 7-day expiry, `httpOnly` cookie, rotated on every use

---

## 📁 Project Structure

```
auth/
├── .gitignore
│
└── app-backend/                         # Node.js + Express OAuth Server
    ├── server.js                        # Entry point
    ├── package.json
    ├── .env                             # Secrets (not committed)
    ├── .env.example                     # Template
    ├── ecosystem.config.cjs             # PM2 config
    │
    ├── src/
    │   ├── app.js                       # Express app setup (middleware, routes)
    │   ├── config/
    │   │   ├── database.js              # PostgreSQL connection pool
    │   │   ├── email.js                 # Nodemailer config
    │   │   ├── jwt.js                   # JWT helpers
    │   │   └── passport.js              # Google OAuth strategy
    │   │
    │   ├── controllers/
    │   │   ├── authController.js        # Register, login, logout, refresh, verify
    │   │   ├── googleAuthController.js  # Google OAuth callback
    │   │   ├── oauthController.js       # OAuth 2.0 PKCE authorization server logic
    │   │   ├── developerController.js   # OAuth client CRUD + secret rotation
    │   │   ├── passwordController.js    # Forgot/reset password
    │   │   └── userController.js        # Profile, change-password, admin
    │   │
    │   ├── routes/
    │   │   ├── index.js
    │   │   ├── auth.js
    │   │   ├── googleAuth.js
    │   │   ├── oauth.js                 # /oauth/* routes
    │   │   ├── developer.js             # /developer/* routes
    │   │   └── user.js
    │   │
    │   ├── views/                       # Server-rendered HTML (glassmorphism UI)
    │   │   ├── oauth/
    │   │   │   ├── login.html           # OAuth login/consent screen
    │   │   │   └── register.html        # End-user registration
    │   │   ├── developer/
    │   │   │   ├── login.html           # Developer portal login
    │   │   │   ├── dashboard.html       # List registered OAuth apps
    │   │   │   ├── new-client.html      # Register new app form
    │   │   │   └── client-detail.html   # App detail — credentials, URIs, delete
    │   │   ├── forgot-password.html
    │   │   └── reset-password.html
    │   │
    │   ├── models/
    │   │   ├── User.js
    │   │   ├── Token.js
    │   │   └── Session.js
    │   │
    │   ├── services/
    │   │   ├── authService.js
    │   │   ├── emailService.js
    │   │   ├── hashService.js
    │   │   └── tokenService.js
    │   │
    │   ├── middlewares/
    │   │   ├── auth.js                  # JWT verification
    │   │   ├── validation.js            # express-validator rules
    │   │   ├── rateLimiter.js
    │   │   └── errorHandler.js
    │   │
    │   ├── templates/                   # HTML email templates
    │   │   ├── verificationEmail.html
    │   │   ├── resetPassword.html
    │   │   └── welcomeEmail.html
    │   │
    │   ├── utils/
    │   │   ├── generators.js
    │   │   ├── logger.js               # Pino structured logging
    │   │   └── validators.js
    │   │
    │   └── database/
    │       ├── init.js
    │       ├── schema.sql              # Main table definitions
    │       ├── google-auth-migration.sql
    │       └── seed.sql
    │
    └── tests/
        ├── api.test.js                 # Jest integration tests
        ├── test-complete.js
        └── test-email.js
```

---

## 🎨 UI Design System

All server-rendered pages (`src/views/`) share a consistent design language:

| Token | Value |
|-------|-------|
| Background | `#060818` |
| Card surface | `rgba(255,255,255,0.03)` + `backdrop-filter: blur(20px)` |
| Primary | `#6c63ff` → gradient `#8b5cf6` |
| Primary light | `#9d97ff` |
| Border | `rgba(255,255,255,0.08)` |
| Focus ring | `rgba(108,99,255,0.55)` border + `rgba(108,99,255,0.1)` shadow |
| Danger | `#f87171` |
| Success | `#34d399` |
| Font | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| Icons | [Lucide](https://lucide.dev) via CDN (`unpkg.com/lucide@latest`) |

**Lucide icons used across the UI:**

`shield-check` · `code-2` · `key-round` · `lock-keyhole` · `user-plus` ·
`mail` · `lock` · `eye` · `eye-off` · `at-sign` · `log-in` · `log-out` ·
`send` · `arrow-left` · `plus` · `plus-circle` · `rocket` · `trash-2` ·
`refresh-cw` · `copy` · `check` · `alert-circle` · `check-circle-2` ·
`mail-check` · `triangle-alert` · `link` · `link-2` · `link-2-off` ·
`app-window` · `calendar` · `hash` · `info` · `settings-2` · `circle-check-big`

---

## 🧪 Testing

### Unit / Integration Tests (Jest)
```bash
cd app-backend
npm test
```

### Manual Functional Tests
```bash
cd app-backend
node tests/test-complete.js
node tests/test-email.js
```

---

## 🐛 Troubleshooting

### `database "auth_db" does not exist`
```powershell
$env:PGPASSWORD = "your_password"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE auth_db;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d auth_db -f "src/database/schema.sql"
```

### `Error 400: redirect_uri_mismatch`
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Credentials → Edit OAuth client
2. Add `http://localhost:3000/api/auth/google/callback` to **Authorized redirect URIs**
3. Save and wait ~30 seconds

### Email not sending
- Confirm 2-Step Verification is enabled on Gmail
- Use a **16-character App Password** (not your real password)
- Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`

### Port already in use
```powershell
netstat -ano | Select-String ":3000"
Stop-Process -Id <PID> -Force
```

### Lucide icons not showing after update
The icons load from unpkg CDN. If you see missing icons on a specific page, do a **hard refresh** (`Ctrl+Shift+R`) to bypass browser cache.

---

## 🚀 Production Deployment Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (64+ random chars)
- [ ] PostgreSQL with SSL and a dedicated user
- [ ] Production email service (SendGrid, AWS SES, Resend, etc.)
- [ ] Update `AUTH_SERVER_URL`, `FRONTEND_URL`, `GOOGLE_CALLBACK_URL` to production domains
- [ ] Update Google Console authorized origins + redirect URIs
- [ ] HTTPS on both frontend and backend
- [ ] Use PM2 or Docker (`ecosystem.config.cjs` included)
- [ ] Configure Nginx reverse proxy for `/api` and `/oauth` routes

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.2.1 | Web framework |
| pg | 8.17.1 | PostgreSQL client |
| bcrypt | 6.0.0 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT generation/verification |
| passport-google-oauth20 | 2.0.0 | Google OAuth strategy |
| nodemailer | 8.0.4 | Email delivery |
| helmet | 8.1.0 | Security headers |
| express-rate-limit | 8.2.1 | Rate limiting |
| express-validator | 7.3.1 | Input validation |
| cookie-parser | 1.4.7 | Cookie parsing |
| pino / pino-pretty | 10.3.1 | Structured JSON logging |
| nodemon | 3.1.11 | Dev auto-restart |

---

## 📄 License

MIT License

---

**⭐ Star this repository if you find it helpful!**
