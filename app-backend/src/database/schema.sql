-- Database schema SQL

-- ── Users Table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),                  -- NULL for OAuth-only accounts
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    role            VARCHAR(50) DEFAULT 'user',
    google_id       VARCHAR(255) UNIQUE,
    auth_provider   VARCHAR(50) DEFAULT 'local',   -- 'local' | 'google'
    profile_picture TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login      TIMESTAMP
);

-- ── Refresh Tokens Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

-- ── Verification Tokens Table ─────────────────────────────────────────────────
-- Covers: email_verification, password_reset, oauth_code
CREATE TABLE IF NOT EXISTS verification_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at    TIMESTAMP
);

-- ── Sessions Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token    VARCHAR(500) UNIQUE NOT NULL,
    ip_address       VARCHAR(45),
    user_agent       TEXT,
    expires_at       TIMESTAMP NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked          BOOLEAN DEFAULT FALSE
);

-- ── Login Attempts Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
    id           SERIAL PRIMARY KEY,
    email        VARCHAR(255) NOT NULL,
    ip_address   VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success      BOOLEAN DEFAULT FALSE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username   ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_google_id  ON users(google_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token     ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires   ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token   ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(session_token);

-- Composite index covering the account-lockout query:
--   WHERE email = $1 AND success = false AND attempted_at > $2
CREATE INDEX IF NOT EXISTS idx_login_attempts_lockout
    ON login_attempts(email, success, attempted_at DESC);

-- For IP-based rate limiting / abuse detection
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip
    ON login_attempts(ip_address, attempted_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update updated_at on users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();