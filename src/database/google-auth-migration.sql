-- Google Authentication Migration
-- Adds Google OAuth support to the users table

-- Add Google OAuth columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Make password_hash nullable (Google users don't have passwords)
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add index for auth provider
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Update existing users to have 'local' as auth_provider
UPDATE users 
SET auth_provider = 'local' 
WHERE auth_provider IS NULL;

-- Comments for documentation
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: local, google, etc.';
COMMENT ON COLUMN users.profile_picture IS 'URL to user profile picture from OAuth provider';