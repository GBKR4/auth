-- Migration 003: OAuth Provider tables
-- Run with: node src/database/runMigration.js

-- Add role column to users (developer/admin can access Developer Portal)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- OAuth registered client applications
CREATE TABLE IF NOT EXISTS oauth_clients (
  id              SERIAL PRIMARY KEY,
  client_id       VARCHAR(100) UNIQUE NOT NULL,
  client_secret   VARCHAR(255) NOT NULL,               -- SHA-256 hashed, NEVER stored raw
  name            VARCHAR(100) NOT NULL,
  redirect_uris   TEXT[] NOT NULL,                     -- array of allowed callback URLs
  developer_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- One-time OAuth authorization codes
CREATE TABLE IF NOT EXISTS oauth_auth_codes (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(255) UNIQUE NOT NULL,         -- SHA-256 hashed
  client_id       VARCHAR(100) NOT NULL,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri    TEXT NOT NULL,
  code_challenge  VARCHAR(255),                         -- PKCE S256 challenge
  expires_at      TIMESTAMP NOT NULL,                   -- 5 minutes from creation
  used_at         TIMESTAMP                             -- NULL = unused; set on exchange
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_code ON oauth_auth_codes(code);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_client ON oauth_auth_codes(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_developer ON oauth_clients(developer_id);
