# 🔐 Full-Stack Authentication App

A production-ready full-stack authentication system with **dual authentication** (Local + Google OAuth 2.0).

- **Backend** — Node.js, Express 5, PostgreSQL, JWT (`app-backend/` → port **3000**)
- **Frontend** — React 18, Vite, Tailwind CSS, React Router 6 (`app-frontend/` → port **5173**)

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2.1-blue.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Features

### 🔑 Dual Authentication System
- ✅ **Local Authentication** (Email/Password)
- ✅ **Google OAuth 2.0** (Sign in with Google)
- ✅ Smart email linking between accounts
- ✅ Auto-verification for OAuth users
- ✅ Google accounts detected on email/password login — user is guided to Google sign-in

### 🛡️ Security
- ✅ JWT Access Token (15 min) + Refresh Token (7 days)
- ✅ Silent token refresh interceptor (Axios)
- ✅ Bcrypt password hashing
- ✅ Helmet.js security headers
- ✅ Rate limiting (login, register, password reset)
- ✅ Input validation & sanitization (express-validator)
- ✅ SQL injection protection (parameterized queries)
- ✅ Token revocation on logout
- ✅ Role-based access control (user / admin)

### 📧 Email System
- ✅ Email verification on registration
- ✅ Resend verification email
- ✅ Password reset via email
- ✅ Gmail SMTP integration

### 🖥️ Frontend Pages
- ✅ Login (email/password + Google button)
- ✅ Register (with client-side validation)
- ✅ Email Verification (auto-verifies from link)
- ✅ Forgot Password / Reset Password
- ✅ Dashboard (user info + quick actions)
- ✅ Profile (edit name, change password, delete account)
- ✅ Admin Users table (searchable, admin-only)

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v16 (or v12+)
- **Gmail account** with App Password enabled
- **Google Cloud Console** project (for OAuth)

---

## 🛠️ Installation & Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd auth
```

### 2. Install Dependencies (both apps)
```bash
cd app-backend && npm install
cd ../app-frontend && npm install
```

### 3. Create PostgreSQL Database

**Windows (PostgreSQL 16):**
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

Create `app-backend/.env` (copy from `app-backend/.env.example`):

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=auth_db

# JWT — use long random strings (64+ chars)
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

# Frontend URLs — must match Vite dev server port
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173

# Google OAuth 2.0
# Authorized redirect URI in Google Console: http://localhost:3000/api/auth/google/callback
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### 5. Setup Gmail App Password

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. **Security → 2-Step Verification → App passwords**
3. Create an app password for "Mail"
4. Paste the 16-character password into `EMAIL_PASSWORD` in `.env`

### 6. Setup Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   ```
6. **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/google/callback
   ```
7. Copy the **Client ID** and **Client Secret** into `.env`

### 7. Start Both Servers

**Terminal 1 — Backend:**
```bash
cd app-backend
npm run dev
# → http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd app-frontend
npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🚀 Usage

### Start Development
```bash
# Backend (port 3000)
cd app-backend && npm run dev

# Frontend (port 5173)
cd app-frontend && npm run dev
```

### Start Production Backend
```bash
cd app-backend && npm start
```

### Run Tests
```bash
cd app-backend && npm test
```

Server will be available at: `http://localhost:3000`

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication Routes (`/auth`)

#### Local Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login with email/password | ❌ |
| POST | `/auth/logout` | Logout & revoke refresh token | ❌ |
| POST | `/auth/refresh` | Get new access token | ❌ |
| GET | `/auth/verify/:token` | Verify email address | ❌ |
| POST | `/auth/resend-verification` | Resend verification email | ❌ |

#### Password Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/forgot-password` | Request password reset email | ❌ |
| POST | `/auth/reset-password` | Reset password with token | ❌ |
| POST | `/auth/validate-reset-token` | Validate password reset token | ❌ |

#### Google OAuth 2.0
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate Google OAuth flow |
| GET | `/auth/google/callback` | Google callback → redirects to frontend |
| GET | `/auth/google/failure` | OAuth failure redirect |

### User Management Routes (`/user`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/user/profile` | Get current user profile | ✅ JWT | User/Admin |
| PUT | `/user/profile` | Update name | ✅ JWT | User/Admin |
| PUT | `/user/change-password` | Change password | ✅ JWT | User/Admin |
| DELETE | `/user/delete-account` | Delete own account | ✅ JWT | User/Admin |
| GET | `/user/users` | List all users | ✅ JWT | Admin only |

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

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": 1, "email": "user@example.com", "username": "johndoe", "role": "user" }
}
```

> ⚠️ Accounts created via Google OAuth have no password. Attempting email/password login on them returns: `"This account was created with Google. Please sign in with Google."`

### Refresh Access Token
```bash
POST http://localhost:3000/api/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

### Get Profile (Protected)
```bash
GET http://localhost:3000/api/user/profile
Authorization: Bearer eyJ...
```

**Response `200`:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "is_verified": true,
  "created_at": "2026-03-09T10:00:00.000Z"
}
```

### Forgot Password
```bash
POST http://localhost:3000/api/auth/forgot-password
Content-Type: application/json

{ "email": "user@example.com" }
```

### Reset Password
```bash
POST http://localhost:3000/api/auth/reset-password
Content-Type: application/json

{ "token": "abc123...", "newPassword": "NewPass123!" }
```

---

## 🗄️ Database Schema

### Users Table
```sql
id              SERIAL PRIMARY KEY
email           VARCHAR(255) UNIQUE NOT NULL
username        VARCHAR(100) UNIQUE NOT NULL
password_hash   VARCHAR(255)        -- NULL for Google OAuth users
first_name      VARCHAR(100)
last_name       VARCHAR(100)
google_id       VARCHAR(255) UNIQUE -- Set for Google OAuth users
auth_provider   VARCHAR(50) DEFAULT 'local'  -- 'local' | 'google'
profile_picture TEXT                -- Google profile photo URL
is_verified     BOOLEAN DEFAULT FALSE
is_active       BOOLEAN DEFAULT TRUE
role            VARCHAR(50) DEFAULT 'user'   -- 'user' | 'admin'
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
last_login      TIMESTAMP
```

**Indexes:** `email`, `username`, `google_id`, `auth_provider`

### Other Tables
- **refresh_tokens** — Stored & rotated JWT refresh tokens
- **verification_tokens** — Email verification + password reset tokens
- **sessions** — Session tracking with IP & user agent
- **login_attempts** — Login attempt logging for security auditing

> Schema files: `app-backend/src/database/schema.sql` + `google-auth-migration.sql`

---

## 🔒 Security Features

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 requests | 15 min |
| Register | 5 requests | 15 min |
| Password Reset | 3 requests | 1 hour |
| General API | 100 requests | 15 min |

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character

### JWT Tokens
- **Access Token:** 15-minute expiry — stored in `localStorage`
- **Refresh Token:** 7-day expiry — stored in `localStorage`, rotated on use
- Silent refresh via Axios interceptor (frontend queues parallel requests)

### Other Measures
- Helmet.js security headers
- CORS restricted to `FRONTEND_URL`
- bcrypt with adaptive cost factor
- SQL injection prevention via parameterized queries
- Input validation with `express-validator`

---

## 📁 Project Structure

```
auth/
├── app-backend/                     # Node.js + Express API
│   ├── server.js                    # Entry point
│   ├── package.json
│   ├── .env                         # Secrets & config (not committed)
│   ├── .env.example                 # Template for .env
│   ├── servers/
│   │   ├── start-server.bat
│   │   └── start-server.ps1
│   ├── src/
│   │   ├── app.js                   # Express app setup
│   │   ├── config/
│   │   │   ├── database.js          # PostgreSQL connection pool
│   │   │   ├── email.js             # Nodemailer config
│   │   │   ├── jwt.js               # JWT helpers
│   │   │   └── passport.js          # Google OAuth strategy
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register, login, logout, refresh, verify
│   │   │   ├── googleAuthController.js  # Google OAuth callback → URL-param redirect
│   │   │   ├── passwordController.js    # Forgot/reset password
│   │   │   └── userController.js    # Profile, change-password, admin
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Token.js
│   │   │   └── Session.js
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── auth.js
│   │   │   ├── googleAuth.js
│   │   │   └── user.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── emailService.js
│   │   │   ├── hashService.js
│   │   │   └── tokenService.js
│   │   ├── middlewares/
│   │   │   ├── auth.js              # JWT verification middleware
│   │   │   ├── validation.js        # Request body validation
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── templates/
│   │   │   ├── verificationEmail.html
│   │   │   ├── resetPassword.html
│   │   │   └── welcomeEmail.html
│   │   ├── utils/
│   │   │   ├── generators.js
│   │   │   ├── logger.js            # Winston logger
│   │   │   └── validators.js
│   │   └── database/
│   │       ├── init.js
│   │       ├── schema.sql           # Main table definitions
│   │       ├── google-auth-migration.sql  # Adds google_id, auth_provider, profile_picture
│   │       └── seed.sql
│   └── tests/
│       ├── test-complete.js
│       └── test-email.js
│
└── app-frontend/                    # React 18 + Vite 5
    ├── index.html                   # Tailwind CSS via CDN
    ├── vite.config.js               # Proxy /api → http://localhost:3000
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                  # Router — all routes
        ├── index.css
        ├── api/
        │   ├── axios.js             # Axios instance + silent refresh interceptor
        │   ├── auth.js              # Auth API calls
        │   └── user.js              # User API calls
        ├── context/
        │   └── AuthContext.jsx      # Global auth state (login, logout, loginWithTokens)
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── AdminRoute.jsx
        │   └── LoadingSpinner.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── VerifyEmailPage.jsx
            ├── ResendVerificationPage.jsx
            ├── ForgotPasswordPage.jsx
            ├── ResetPasswordPage.jsx
            ├── GoogleCallbackPage.jsx   # Reads tokens from URL → localStorage
            ├── DashboardPage.jsx
            ├── ProfilePage.jsx
            └── AdminUsersPage.jsx
```

---

## 🧪 Testing

```bash
cd app-backend
node tests/test-complete.js
node tests/test-email.js
```

**Tests cover:** registration, email verification, login/logout, token refresh, password reset, Google OAuth initiation, protected routes, admin access, rate limiting, input validation.

---

## 🐛 Troubleshooting

### `database "auth_db" does not exist`
```powershell
$env:PGPASSWORD = "your_password"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE auth_db;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d auth_db -f "src/database/schema.sql"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d auth_db -f "src/database/google-auth-migration.sql"
```

### `Error 400: redirect_uri_mismatch`
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **Credentials** → Edit your OAuth client
2. Under **Authorized redirect URIs**, add exactly:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
3. Save and wait ~30 seconds before retrying

### `"This account was created with Google. Please sign in with Google."`
This is expected — accounts created via Google OAuth have no password. Use the **Continue with Google** button on the login page.

### Email not sending
- Confirm 2-Step Verification is enabled on your Gmail account
- Use a **16-character App Password** (not your account password)
- Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`

### Port already in use
```powershell
# Find and kill the process on port 3000
netstat -ano | Select-String ":3000"
Stop-Process -Id <PID> -Force

# Or kill all node processes
Get-Process -Name node | Stop-Process -Force
```

### Frontend shows blank page / 404 on refresh
Vite dev server handles SPA routing automatically. If deploying, configure your web server to serve `index.html` for all routes.

---

## 🚀 Production Deployment Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (64+ chars)
- [ ] PostgreSQL with SSL and a dedicated user
- [ ] Production email service (SendGrid, AWS SES, etc.)
- [ ] Update `FRONTEND_URL`, `CLIENT_URL`, `GOOGLE_CALLBACK_URL` to production domains
- [ ] Add production domain to Google Console authorized origins + redirect URIs
- [ ] HTTPS on both frontend and backend
- [ ] Run frontend build: `cd app-frontend && npm run build` — deploy `dist/` to CDN or static host
- [ ] Use PM2 or Docker for backend process management
- [ ] Configure Nginx reverse proxy

---

## 📦 Key Dependencies

### Backend (`app-backend`)
| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.2.1 | Web framework |
| pg | 8.17.1 | PostgreSQL client |
| bcrypt | 6.0.0 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT generation/verification |
| passport-google-oauth20 | 2.0.0 | Google OAuth strategy |
| nodemailer | 7.0.12 | Email delivery |
| helmet | 8.1.0 | Security headers |
| express-rate-limit | 8.2.1 | Rate limiting |
| express-validator | 7.3.1 | Input validation |
| winston | — | Structured logging |

### Frontend (`app-frontend`)
| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI library |
| react-router-dom | 6.22 | Client-side routing |
| axios | — | HTTP client + refresh interceptor |
| vite | 5.1 | Build tool + dev server |
| tailwindcss | CDN | Utility-first CSS |

---

## 📄 License

MIT License

---

**⭐ Star this repository if you find it helpful!**
