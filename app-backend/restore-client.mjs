// Restore the CollabDocs OAuth client with the correct hashed secret.
// Run: node restore-client.js

import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host:     'localhost',
  port:     5432,
  user:     'postgres',
  password: 'abc123',
  database: 'auth_db',
});

const rawSecret   = 'aae3601765f2936adb598fbd73ca165541a692b929b2be35913b819a578da36b';
const hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
const clientId    = 'app_4ba2201d2a9f3ebf';

console.log('Raw secret:   ', rawSecret);
console.log('Hash (64 hex):', hashedSecret);
console.log('Hash length:  ', hashedSecret.length);

// Update the stored hash to the correct value
const result = await pool.query(
  `UPDATE oauth_clients SET client_secret = $1 WHERE client_id = $2 RETURNING client_id, name`,
  [hashedSecret, clientId]
);

if (result.rows.length === 0) {
  console.log('❌ Client not found — inserting fresh...');
  
  // Get developer user id
  const userRes = await pool.query(
    `SELECT id FROM users WHERE email = 'bharathkumarreddygopireddy807@gmail.com'`
  );
  
  if (userRes.rows.length === 0) {
    console.log('❌ Developer user not found either. Re-run reseed.sql first.');
    process.exit(1);
  }
  
  await pool.query(
    `INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris, developer_id)
     VALUES ($1, $2, 'CollabDocs', ARRAY['http://localhost:5173/auth/callback'], $3)`,
    [clientId, hashedSecret, userRes.rows[0].id]
  );
  console.log('✅ Client inserted fresh with correct hash.');
} else {
  console.log('✅ Client secret updated:', result.rows[0]);
}

await pool.end();
