-- Run this ONCE as the postgres superuser to create a least-privilege app user.
-- Then update DB_USER and DB_PASSWORD in your .env accordingly.
--
-- Usage (PowerShell):
--   $env:PGPASSWORD = "abc123"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d auth_db -f "src/database/create-limited-user.sql"

-- 1. Create the app user (choose a strong password)
CREATE USER auth_app WITH PASSWORD 'replace_with_strong_password';

-- 2. Grant connect to the database
GRANT CONNECT ON DATABASE auth_db TO auth_app;

-- 3. Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO auth_app;

-- 4. Grant only what the app needs on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users,
  refresh_tokens,
  verification_tokens,
  sessions,
  login_attempts
TO auth_app;

-- 5. Allow the app to use sequences (needed for SERIAL primary keys)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO auth_app;

-- 6. Apply the same grants to any future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO auth_app;
