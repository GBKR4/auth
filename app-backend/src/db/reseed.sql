-- Re-seed auth_db after full truncate.
-- Restores the developer account (owner) and CollabDocs OAuth client.

-- 1. Insert developer/owner account (Google-only, no password needed)
INSERT INTO users (email, username, first_name, role, is_verified, is_active)
VALUES ('bharathkumarreddygopireddy807@gmail.com', 'bharath', 'Bharath', 'developer', true, true);

-- 2. Restore CollabDocs OAuth client using the EXISTING client_id & hashed secret
--    client_id     : app_4ba2201d2a9f3ebf
--    raw secret    : aae3601765f2936adb598fbd73ca165541a692b929b2be35913b819a578da36b
--    sha256(secret): f74eff4456a86581b688124fb45a3417385573ba69b07904c84000dc9db9c6a0f
INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris, developer_id)
VALUES (
  'app_4ba2201d2a9f3ebf',
  'f74eff4456a86581b688124fb45a3417385573ba69b07904c84000dc9db9c6a0f',
  'CollabDocs',
  ARRAY['http://localhost:5173/auth/callback'],
  (SELECT id FROM users WHERE email = 'bharathkumarreddygopireddy807@gmail.com')
);
