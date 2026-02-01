# 🔐 Enterprise Authentication API

A production-ready authentication API with **dual authentication** (Local + Google OAuth 2.0), built with Node.js, Express, PostgreSQL, and JWT.

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2.1-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Features

### 🔑 Dual Authentication System
- ✅ **Local Authentication** (Email/Password)
- ✅ **Google OAuth 2.0** (Sign in with Google)
- ✅ Smart email linking between accounts
- ✅ Auto-verification for OAuth users
- ✅ Profile picture integration from Google

### 🛡️ Security (11 Layers)
- ✅ JWT tokens (Access + Refresh)
- ✅ Bcrypt password hashing
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Rate limiting (4 limiters)
- ✅ Input validation & sanitization
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ HttpOnly cookies
- ✅ Token revocation
- ✅ Session tracking

### 📧 Email System
- ✅ Email verification on registration
- ✅ Password reset via email
- ✅ HTML email templates
- ✅ Gmail SMTP integration
- ✅ Resend verification emails

### 👤 User Management
- ✅ User registration & login
- ✅ Profile management (view, update, delete)
- ✅ Password change & reset
- ✅ Role-based access control (User/Admin)
- ✅ Admin panel (view all users)

### 📊 Monitoring & Logging
- ✅ Login attempt tracking
- ✅ IP address logging
- ✅ User agent tracking
- ✅ Session management
- ✅ Winston logger

---

## 📋 Prerequisites

- **Node.js** v14 or higher
- **PostgreSQL** v12 or higher
- **Gmail account** (for SMTP) or other email service
- **Google Cloud Console** account (for OAuth)

---

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd auth
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup PostgreSQL Database
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE auth_database;

-- Exit psql
\q
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=auth_database

# JWT Configuration
JWT_ACCESS_SECRET=your-secret-access-key-minimum-32-characters
JWT_REFRESH_SECRET=your-secret-refresh-key-minimum-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@yourapp.com

# Frontend URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### 5. Setup Gmail App Password

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification → App passwords
3. Generate an app password
4. Use it as `EMAIL_PASSWORD` in `.env`

### 6. Setup Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
7. Copy **Client ID** and **Client Secret** to `.env`

### 7. Initialize Database
```bash
npm start
```

The server will automatically create all database tables on first run.

---

## 🚀 Usage

### Start Development Server
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

### Run Tests
```bash
npm test
```

### Start Server Permanently (Windows)
```bash
# Double-click start-server.bat
# OR
.\start-server.ps1
```

Server will be available at: `http://localhost:5000`

---

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

#### Local Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | ❌ |
| POST | `/login` | Login with email/password | ❌ |
| POST | `/logout` | Logout & revoke tokens | ❌ |
| POST | `/refresh` | Refresh access token | ❌ |
| GET | `/verify/:token` | Verify email address | ❌ |
| POST | `/resend-verification` | Resend verification email | ❌ |

#### Password Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/forgot-password` | Request password reset | ❌ |
| POST | `/reset-password` | Reset password with token | ❌ |
| POST | `/validate-reset-token` | Validate reset token | ❌ |

#### Google OAuth 2.0
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/google` | Initiate Google OAuth | ❌ |
| GET | `/google/callback` | OAuth callback handler | ❌ |
| GET | `/google/failure` | OAuth failure handler | ❌ |

### User Management Routes (`/api/user`)

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/profile` | Get user profile | ✅ JWT | User/Admin |
| PUT | `/profile` | Update user profile | ✅ JWT | User/Admin |
| PUT | `/change-password` | Change password | ✅ JWT | User/Admin |
| DELETE | `/delete-account` | Delete user account | ✅ JWT | User/Admin |
| GET | `/users` | Get all users | ✅ JWT | Admin |

---

## 📝 API Examples

### 1. Register User (Local Auth)
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email to verify your account.",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### 2. Login User (Local Auth)
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user"
  }
}
```

### 3. Google OAuth Login
```bash
# Open in browser:
GET http://localhost:5000/api/auth/google
```

This will redirect to Google login page. After successful login, Google redirects back to your app with JWT tokens.

### 4. Get User Profile (Protected Route)
```bash
GET http://localhost:5000/api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "auth_provider": "local",
  "is_verified": true,
  "is_active": true,
  "created_at": "2026-02-01T10:00:00.000Z",
  "last_login": "2026-02-01T15:30:00.000Z"
}
```

### 5. Forgot Password
```bash
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 6. Reset Password
```bash
POST http://localhost:5000/api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123def456...",
  "newPassword": "NewSecurePass123!"
}
```

---

## 🗄️ Database Schema

### Users Table
```sql
id              SERIAL PRIMARY KEY
email           VARCHAR(255) UNIQUE NOT NULL
username        VARCHAR(100) UNIQUE NOT NULL
password_hash   VARCHAR(255) -- Nullable for OAuth users
first_name      VARCHAR(100)
last_name       VARCHAR(100)
google_id       VARCHAR(255) UNIQUE -- For Google OAuth
auth_provider   VARCHAR(50) DEFAULT 'local' -- 'local' or 'google'
profile_picture TEXT -- Google profile photo URL
is_verified     BOOLEAN DEFAULT FALSE
is_active       BOOLEAN DEFAULT TRUE
role            VARCHAR(50) DEFAULT 'user'
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
last_login      TIMESTAMP
```

**Indexes:** email, username, google_id, auth_provider

### Other Tables
- **refresh_tokens** - JWT refresh token management
- **verification_tokens** - Email verification & password reset tokens
- **sessions** - Session tracking with IP & user agent
- **login_attempts** - Login attempt tracking for security

---

## 🔒 Security Features

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 requests | 15 minutes |
| Register | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| API | 100 requests | 15 minutes |

### Password Requirements
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter
- ✅ At least 1 number
- ✅ At least 1 special character

### JWT Tokens
- **Access Token:** 15 minutes expiry
- **Refresh Token:** 7 days expiry
- Stored in httpOnly cookies (XSS protection)

---

## 📁 Project Structure

```
auth/
├── server.js                    # Entry point
├── package.json                 # Dependencies
├── .env                         # Environment variables
├── README.md                    # Documentation
├── start-server.bat             # Windows startup script
├── start-server.ps1             # PowerShell startup script
├── test-complete.js             # Comprehensive test suite
│
├── src/
│   ├── app.js                   # Express app setup
│   │
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection
│   │   ├── email.js             # Nodemailer configuration
│   │   ├── jwt.js               # JWT configuration
│   │   └── passport.js          # Google OAuth strategy
│   │
│   ├── controllers/
│   │   ├── authController.js        # Local auth logic
│   │   ├── passwordController.js    # Password management
│   │   ├── userController.js        # User CRUD operations
│   │   └── googleAuthController.js  # Google OAuth handlers
│   │
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Token.js             # Token model
│   │   └── Session.js           # Session model
│   │
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── auth.js              # Auth routes
│   │   ├── user.js              # User routes
│   │   └── googleAuth.js        # Google OAuth routes
│   │
│   ├── services/
│   │   ├── authService.js       # Business logic
│   │   ├── emailService.js      # Email sending
│   │   ├── hashService.js       # Password hashing
│   │   └── tokenService.js      # JWT generation
│   │
│   ├── middlewares/
│   │   ├── auth.js              # JWT authentication
│   │   ├── validation.js        # Input validation
│   │   ├── rateLimiter.js       # Rate limiting
│   │   └── errorHandler.js      # Error handling
│   │
│   ├── templates/
│   │   ├── verificationEmail.html
│   │   ├── resetPassword.html
│   │   └── welcomeEmail.html
│   │
│   ├── utils/
│   │   ├── generators.js        # Token generation
│   │   ├── logger.js            # Winston logger
│   │   └── validators.js        # Custom validators
│   │
│   └── database/
│       ├── init.js              # Database initialization
│       ├── schema.sql           # Database schema
│       └── seed.sql             # Sample data (optional)
```

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
node test-complete.js
```

**Tests Include:**
- ✅ Local user registration
- ✅ Email verification flow
- ✅ Local login & JWT generation
- ✅ Token refresh mechanism
- ✅ Password reset flow
- ✅ Google OAuth initiation
- ✅ Protected route access
- ✅ User profile management
- ✅ Admin functionality
- ✅ Rate limiting validation
- ✅ Input validation
- ✅ Error handling

---

## 🚀 Deployment

### Production Checklist

#### Environment
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Configure production database
- [ ] Set up production email service (SendGrid, AWS SES)
- [ ] Update `GOOGLE_CALLBACK_URL` to production domain
- [ ] Add production domain to Google Console redirect URIs

#### Security
- [ ] Enable HTTPS/SSL
- [ ] Use environment variable management (AWS Secrets Manager, etc.)
- [ ] Set secure cookie flags
- [ ] Configure CORS for production domain
- [ ] Enable database SSL connections
- [ ] Set up firewall rules

#### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging aggregation (ELK Stack)
- [ ] Set up uptime monitoring
- [ ] Enable database backups
- [ ] Set up alerting (PagerDuty, etc.)

#### Performance
- [ ] Use process manager (PM2, Docker)
- [ ] Enable database connection pooling
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up CDN for static assets
- [ ] Enable compression middleware

---

## 📦 Dependencies

### Core
- **express** (5.2.1) - Web framework
- **pg** (8.17.1) - PostgreSQL client
- **bcrypt** (6.0.0) - Password hashing
- **jsonwebtoken** (9.0.3) - JWT authentication
- **passport** (0.7.0) - Authentication middleware
- **passport-google-oauth20** (2.0.0) - Google OAuth

### Security
- **helmet** (8.1.0) - Security headers
- **express-rate-limit** (8.2.1) - Rate limiting
- **express-validator** (7.3.1) - Input validation
- **cors** (2.8.5) - CORS handling

### Utilities
- **nodemailer** (7.0.12) - Email sending
- **dotenv** (17.2.3) - Environment variables
- **cookie-parser** (1.4.7) - Cookie parsing
- **express-session** (1.19.0) - Session management

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
# Windows:
Get-Service -Name postgresql*

# Test connection
psql -U postgres -d auth_database
```

### Email Not Sending
- Verify Gmail app password is correct
- Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Ensure 2-factor authentication is enabled on Gmail
- Check spam folder for test emails

### Google OAuth Errors

**redirect_uri_mismatch:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Credentials → Edit OAuth Client
3. Add `http://localhost:5000/api/auth/google/callback` to authorized redirect URIs
4. Save and wait 10-30 seconds

**Invalid client:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Ensure Google+ API is enabled

### Server Won't Start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill existing process
Get-Process -Name node | Stop-Process -Force

# Restart server
npm run dev
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Built with ❤️ by [Your Name]

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Passport.js](http://www.passportjs.org/) - Authentication middleware
- [PostgreSQL](https://www.postgresql.org/) - Database
- [JWT](https://jwt.io/) - Token-based authentication
- [Nodemailer](https://nodemailer.com/) - Email sending

---

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@yourapp.com
- Documentation: [Link to docs]

---

## 🔄 Version History

### v1.0.0 (2026-02-01)
- ✅ Initial release
- ✅ Local authentication (email/password)
- ✅ Google OAuth 2.0 integration
- ✅ Email verification system
- ✅ Password reset functionality
- ✅ JWT token management
- ✅ Role-based access control
- ✅ Comprehensive security features
- ✅ Production-ready deployment

---

**⭐ Star this repository if you find it helpful!**
