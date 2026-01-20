# Authentication API

A robust, production-ready authentication API built with Node.js, Express, PostgreSQL, and JWT. Features include user registration, email verification, password management, role-based access control, and comprehensive security measures.

## 🚀 Features

### Authentication & Authorization
- ✅ User registration with email verification
- ✅ Login with JWT (Access + Refresh tokens)
- ✅ Token refresh mechanism
- ✅ Logout with token revocation
- ✅ Role-based access control (User/Admin)
- ✅ Protected routes with middleware

### Password Management
- ✅ Secure password hashing (bcrypt)
- ✅ Change password functionality
- ✅ Forgot password flow
- ✅ Password reset via email token
- ✅ Password strength validation

### Email Services
- ✅ Email verification on registration
- ✅ Password reset emails
- ✅ Resend verification emails
- ✅ HTML email templates
- ✅ Gmail SMTP integration

### User Management
- ✅ Get user profile
- ✅ Update user profile
- ✅ Delete account
- ✅ Admin: View all users

### Security Features
- ✅ Helmet.js security headers
- ✅ CORS enabled
- ✅ Rate limiting (login, registration, password reset)
- ✅ Input validation & sanitization
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ Session management
- ✅ Login attempt tracking

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Gmail account for SMTP (or other email service)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE auth_database;
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=auth_database

   # JWT Configuration
   JWT_ACCESS_SECRET=your-secret-access-key-min-32-chars
   JWT_REFRESH_SECRET=your-secret-refresh-key-min-32-chars
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d

   # Email Configuration (Gmail)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=noreply@yourapp.com

   # Client URL (for email links)
   CLIENT_URL=http://localhost:3000
   ```

5. **Generate Gmail App Password**
   - Enable 2-Step Verification in your Google Account
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Generate a new app password for "Mail"
   - Use the 16-character password in `EMAIL_PASSWORD`

6. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000` and automatically create database tables on first run.

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/logout` | Logout user | No |
| POST | `/refresh` | Refresh access token | No |
| GET | `/verify/:token` | Verify email | No |
| POST | `/resend-verification` | Resend verification email | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password with token | No |
| POST | `/validate-reset-token` | Validate reset token | No |

### User Routes (`/api/user`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/profile` | Get user profile | Yes | User/Admin |
| PUT | `/profile` | Update user profile | Yes | User/Admin |
| PUT | `/change-password` | Change password | Yes | User/Admin |
| DELETE | `/delete-account` | Delete user account | Yes | User/Admin |
| GET | `/users` | Get all users | Yes | Admin Only |

## 🔧 API Usage Examples

### Register a New User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "name": "John Doe"
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

### Login

```bash
POST /api/auth/login
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

### Get Profile (Protected Route)

```bash
GET /api/user/profile
Authorization: Bearer <access_token>
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
  "is_verified": true,
  "created_at": "2026-01-20T12:00:00.000Z",
  "updated_at": "2026-01-20T12:00:00.000Z"
}
```

### Change Password

```bash
PUT /api/user/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

### Forgot Password

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password

```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

## 🗄️ Database Schema

### Users Table
```sql
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE)
- username (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- first_name (VARCHAR)
- last_name (VARCHAR)
- is_verified (BOOLEAN)
- is_active (BOOLEAN)
- role (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_login (TIMESTAMP)
```

### Refresh Tokens Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- token (VARCHAR UNIQUE)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
- is_revoked (BOOLEAN)
```

### Verification Tokens Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- token (VARCHAR UNIQUE)
- token_type (VARCHAR) -- 'email_verification' or 'password_reset'
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
- used_at (TIMESTAMP)
```

### Sessions Table
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- session_token (VARCHAR UNIQUE)
- ip_address (VARCHAR)
- user_agent (TEXT)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
- last_activity_at (TIMESTAMP)
- revoked (BOOLEAN)
```

### Login Attempts Table
```sql
- id (SERIAL PRIMARY KEY)
- email (VARCHAR)
- ip_address (VARCHAR)
- attempted_at (TIMESTAMP)
- success (BOOLEAN)
```

## 🏗️ Project Structure

```
auth/
├── src/
│   ├── config/
│   │   ├── database.js       # PostgreSQL connection pool
│   │   ├── email.js          # Email configuration
│   │   └── jwt.js            # JWT configuration
│   ├── controllers/
│   │   ├── authController.js # Authentication logic
│   │   ├── userController.js # User management logic
│   │   └── passwordController.js # Password management
│   ├── database/
│   │   ├── init.js           # Database initialization
│   │   ├── schema.sql        # Database schema
│   │   └── seed.sql          # Sample data (optional)
│   ├── middlewares/
│   │   ├── auth.js           # JWT authentication middleware
│   │   ├── errorHandler.js   # Global error handler
│   │   ├── rateLimiter.js    # Rate limiting
│   │   └── validation.js     # Input validation rules
│   ├── models/
│   │   ├── User.js           # User model
│   │   ├── Token.js          # Token model
│   │   └── Session.js        # Session model
│   ├── routes/
│   │   ├── index.js          # Route aggregator
│   │   ├── auth.js           # Authentication routes
│   │   └── user.js           # User routes
│   ├── services/
│   │   ├── authService.js    # Authentication business logic
│   │   ├── emailService.js   # Email sending service
│   │   ├── hashService.js    # Password hashing
│   │   └── tokenService.js   # JWT token management
│   ├── templates/
│   │   ├── verificationEmail.html
│   │   ├── resetPassword.html
│   │   └── welcomeEmail.html
│   ├── utils/
│   │   ├── generators.js     # Token generators
│   │   ├── logger.js         # Logging utility
│   │   └── validators.js     # Custom validators
│   └── app.js                # Express app configuration
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── .env                      # Environment variables
├── .gitignore
├── package.json
├── server.js                 # Entry point
└── README.md
```

## 🔐 Security Features

### Password Security
- Passwords hashed using bcrypt with salt rounds
- Minimum 8 characters with complexity requirements
- Password history not reused

### Token Security
- JWT with short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Token revocation on logout
- Secure token storage

### Rate Limiting
- Login: 20 attempts per 15 minutes
- Registration: 10 attempts per 15 minutes
- Password Reset: 5 attempts per 15 minutes

### Headers & CORS
- Helmet.js for security headers
- XSS protection
- Clickjacking protection
- HSTS enabled
- CORS configured

### Input Validation
- Express-validator for all inputs
- Email format validation
- Username alphanumeric validation
- SQL injection prevention via parameterized queries

## 🧪 Testing

Run tests:
```bash
npm test
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production` in production
2. Use strong, unique secrets for JWT tokens
3. Configure production database credentials
4. Set up SSL/TLS for HTTPS
5. Use environment-specific email service

### Production Checklist
- [ ] Update JWT secrets with strong random values
- [ ] Configure production database
- [ ] Set up proper email service (SendGrid, AWS SES, etc.)
- [ ] Enable HTTPS
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Review and adjust rate limits
- [ ] Set proper CORS origins

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.x
- **Database:** PostgreSQL
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Email:** Nodemailer
- **Validation:** Express-validator
- **Security:** Helmet.js, CORS
- **Rate Limiting:** express-rate-limit
- **Logging:** Custom logger utility

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | Database username | postgres |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | auth_database |
| `JWT_ACCESS_SECRET` | Access token secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_ACCESS_EXPIRY` | Access token expiry | 15m |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | 7d |
| `EMAIL_HOST` | SMTP host | smtp.gmail.com |
| `EMAIL_PORT` | SMTP port | 587 |
| `EMAIL_SECURE` | Use TLS | false |
| `EMAIL_USER` | Email username | - |
| `EMAIL_PASSWORD` | Email password/app password | - |
| `EMAIL_FROM` | From email address | - |
| `CLIENT_URL` | Frontend URL | http://localhost:3000 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

Your Name

## 🙏 Acknowledgments

- Express.js team for the excellent web framework
- PostgreSQL community for the robust database
- All open-source contributors

## 📞 Support

For support, email support@yourapp.com or open an issue in the repository.

---

**Built with ❤️ using Node.js and PostgreSQL**
