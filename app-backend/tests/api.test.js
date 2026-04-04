/**
 * Full integration test suite — Auth + User routes
 *
 * Uses Jest + Supertest with in-memory mocks for the DB pool and email service.
 * All tests share the same app instance and mockQuery so there are no module
 * cache conflicts.
 *
 * Run: npm test
 */

import { jest } from '@jest/globals';
import crypto    from 'crypto';
import jwt       from 'jsonwebtoken';

// ── Env vars must be set BEFORE any module is imported ────────────────────────
process.env.JWT_ACCESS_SECRET  = 'test-access-secret-that-is-long-enough-32chr';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-32c';
process.env.FRONTEND_URL       = 'http://localhost:5173';
process.env.ALLOWED_ORIGINS    = 'http://localhost:5173';
process.env.DB_NAME            = 'auth_test';
process.env.DB_PASSWORD        = 'test';
process.env.NODE_ENV           = 'test';

// ── Shared mock ───────────────────────────────────────────────────────────────
const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });

jest.unstable_mockModule('../src/config/database.js', () => ({
  getPool:   () => ({ query: mockQuery }),
  initPool:  () => {},
  pool:      () => ({ query: mockQuery }),
  query:     mockQuery,
  getClient: jest.fn(),
}));

const mockSendVerificationEmail  = jest.fn().mockResolvedValue(undefined);
const mockSendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  default: {
    sendVerificationEmail:  mockSendVerificationEmail,
    sendPasswordResetEmail: mockSendPasswordResetEmail,
    sendWelcomeEmail:       jest.fn().mockResolvedValue(undefined),
  },
  sendVerificationEmail:  mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

// ── Single app import shared by ALL tests ─────────────────────────────────────
const { default: app }       = await import('../src/app.js');
const { default: supertest } = await import('supertest');

const request = supertest(app);

// ── Helpers ───────────────────────────────────────────────────────────────────
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const makeUser = (overrides = {}) => ({
  id: 1,
  email:           'test@example.com',
  username:        'testuser',
  password_hash:   '$2b$10$abcdefghijklmnopqrstuvuv',
  first_name:      'Test',
  last_name:       'User',
  role:            'user',
  is_verified:     true,
  is_active:       true,
  auth_provider:   'local',
  profile_picture: null,
  created_at:      new Date().toISOString(),
  updated_at:      new Date().toISOString(),
  ...overrides,
});

const makeTokenRecord = (overrides = {}) => ({
  id:         10,
  user_id:    1,
  token:      sha256('test-token'),
  token_type: 'email_verification',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  used_at:    null,
  ...overrides,
});

const makeAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Restore safe defaults after clearAllMocks() wipes implementations
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSendVerificationEmail.mockResolvedValue(undefined);
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/health
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/health', () => {
  it('returns ok when DB is reachable', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('returns 503 when DB is down', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request.get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  const validBody = {
    email:      'new@example.com',
    username:   'newuser',
    password:   'Password1!',
    first_name: 'Alice',
    last_name:  'Smith',
  };

  it('registers a new user successfully (201)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // findByEmail → free
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // findByUsername → free
      .mockResolvedValueOnce({ rows: [makeUser({ email: validBody.email, username: validBody.username })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [makeTokenRecord()], rowCount: 1 }); // createVerificationToken

    const res = await request.post('/api/auth/register').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(validBody.email);
  });

  it('returns 409 when email is already registered', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeUser()], rowCount: 1 });
    const res = await request.post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email.*registered/i);
  });

  it('returns 409 when username is already taken', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [makeUser()], rowCount: 1 }); // username conflict
    const res = await request.post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username.*taken/i);
  });

  it('returns 400 for a weak password', async () => {
    const res = await request.post('/api/auth/register').send({ ...validBody, password: 'weak' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid email', async () => {
    const res = await request.post('/api/auth/register').send({ ...validBody, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  const validBody = { email: 'test@example.com', password: 'Password1!' };

  it('returns 401 for a non-existent email', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // findByEmail miss
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // insert failed attempt
    const res = await request.post('/api/auth/login').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing password', async () => {
    const res = await request.post('/api/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('returns 429 when account is locked out', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeUser()], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ count: '5', last_attempt: new Date(Date.now() - 5000).toISOString() }],
        rowCount: 1,
      });
    const res = await request.post('/api/auth/login').send(validBody);
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/logout', () => {
  it('clears cookies and returns 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // revokeRefreshToken
    const res = await request.post('/api/auth/logout').set('Cookie', 'refreshToken=some-token');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logout/i);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('succeeds even with no refresh cookie', async () => {
    const res = await request.post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/verify/:token
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/auth/verify/:token', () => {
  it('verifies a valid token (200)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeTokenRecord()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [makeUser({ is_verified: true })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request.get('/api/auth/verify/some-valid-token');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
  });

  it('returns 400 for an invalid token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request.get('/api/auth/verify/bad-token');
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/forgot-password', () => {
  it('returns 200 with generic message for unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request.post('/api/auth/forgot-password').send({ email: 'unknown@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email/i);
  });

  it('sends reset email for known email (200)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeUser()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [makeTokenRecord({ token_type: 'password_reset' })], rowCount: 1 });
    const res = await request.post('/api/auth/forgot-password').send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for missing email', async () => {
    const res = await request.post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/reset-password', () => {
  it('returns 400 for an invalid token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request.post('/api/auth/reset-password').send({ token: 'bad', newPassword: 'NewPass1!' });
    expect(res.status).toBe(400);
  });

  it('resets password for a valid token (200)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeTokenRecord({ token_type: 'password_reset' })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [makeUser()], rowCount: 1 })  // updateById
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })             // markTokenAsUsed
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });            // revokeAllUserTokens
    const res = await request.post('/api/auth/reset-password').send({ token: 'valid-tok', newPassword: 'NewPass1!' });
    expect(res.status).toBe(200);
  });

  it('returns 400 for a weak new password', async () => {
    const res = await request.post('/api/auth/reset-password').send({ token: 'tok', newPassword: 'weak' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/resend-verification
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/resend-verification', () => {
  it('returns 200 (generic) for unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request.post('/api/auth/resend-verification').send({ email: 'x@x.com' });
    expect(res.status).toBe(200);
  });

  it('returns 200 (generic) when already verified', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeUser({ is_verified: true })], rowCount: 1 });
    const res = await request.post('/api/auth/resend-verification').send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
  });

  it('sends new verification email for unverified user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeUser({ is_verified: false })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [makeTokenRecord()], rowCount: 1 });
    const res = await request.post('/api/auth/resend-verification').send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/google/exchange
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/google/exchange', () => {
  it('returns 400 when code is missing', async () => {
    const res = await request.post('/api/auth/google/exchange').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid/expired code', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request.post('/api/auth/google/exchange').send({ code: 'bad' });
    expect(res.status).toBe(400);
  });

  it('exchanges a valid code for JWT tokens (200)', async () => {
    const user = makeUser();
    mockQuery
      .mockResolvedValueOnce({ rows: [makeTokenRecord({ token_type: 'oauth_code' })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [user], rowCount: 1 })    // findById
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })         // markTokenAsUsed
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });        // createRefreshToken
    const res = await request.post('/api/auth/google/exchange').send({ code: 'valid-code' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(user.email);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/user/profile
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/user/profile', () => {
  it('returns 401 without a token', async () => {
    const res = await request.get('/api/user/profile');
    expect(res.status).toBe(401);
  });

  it('returns the profile for an authenticated user (200)', async () => {
    const user = makeUser();
    // Simulate what the DB returns — the SELECT explicitly excludes password_hash
    const { password_hash, ...publicProfile } = user;
    mockQuery.mockResolvedValueOnce({ rows: [publicProfile], rowCount: 1 });
    const res = await request
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body.password_hash).toBeUndefined();
  });


  it('returns 404 when user no longer exists', async () => {
    const user = makeUser();
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`);
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/user/profile
// ══════════════════════════════════════════════════════════════════════════════
describe('PUT /api/user/profile', () => {
  it('returns 401 without a token', async () => {
    const res = await request.put('/api/user/profile').send({ first_name: 'X' });
    expect(res.status).toBe(401);
  });

  it('updates first_name (no username in body → only updateById called)', async () => {
    const user = makeUser();
    // username not in body → findByUsername NOT called → only updateById (1 query)
    mockQuery.mockResolvedValueOnce({ rows: [{ ...user, first_name: 'Updated' }], rowCount: 1 });
    const res = await request
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`)
      .send({ first_name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('Updated');
  });


  it('updates username when it is free (200)', async () => {
    const user = makeUser();
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                                    // findByUsername → free
      .mockResolvedValueOnce({ rows: [{ ...user, username: 'newname' }], rowCount: 1 });   // updateById
    const res = await request
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`)
      .send({ username: 'newname' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('newname');
  });

  it('returns 409 when username is already taken', async () => {
    const user  = makeUser();
    const other = makeUser({ id: 99, username: 'takenname' });
    mockQuery.mockResolvedValueOnce({ rows: [other], rowCount: 1 });
    const res = await request
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`)
      .send({ username: 'takenname' });
    expect(res.status).toBe(409);
  });

  it('returns 400 when no fields are provided', async () => {
    const user = makeUser();
    const res  = await request
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for a username that is too short', async () => {
    const user = makeUser();
    const res  = await request
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`)
      .send({ username: 'ab' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/user/change-password
// ══════════════════════════════════════════════════════════════════════════════
describe('PUT /api/user/change-password', () => {
  it('returns 401 without a token', async () => {
    const res = await request.put('/api/user/change-password').send({});
    expect(res.status).toBe(401);
  });

  it('returns 404 when user does not exist', async () => {
    const user = makeUser();
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request
      .put('/api/user/change-password')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`)
      .send({ currentPassword: 'Old1!pass', newPassword: 'New1!pass' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for a Google OAuth account (no password hash)', async () => {
    const user = makeUser({ password_hash: null, auth_provider: 'google' });
    mockQuery.mockResolvedValueOnce({ rows: [user], rowCount: 1 });
    const res = await request
      .put('/api/user/change-password')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`)
      .send({ currentPassword: 'any', newPassword: 'NewPass1!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/google/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/user/delete-account
// ══════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/user/delete-account', () => {
  it('returns 401 without a token', async () => {
    const res = await request.delete('/api/user/delete-account');
    expect(res.status).toBe(401);
  });

  it('deletes the account and clears cookies (200)', async () => {
    const user = makeUser();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: user.id }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request
      .delete('/api/user/delete-account')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 when user no longer exists', async () => {
    const user = makeUser();
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request
      .delete('/api/user/delete-account')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`);
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/user/users  (admin only, paginated)
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/user/users', () => {
  it('returns 401 without a token', async () => {
    const res = await request.get('/api/user/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin user', async () => {
    const user = makeUser({ role: 'user' });
    const res  = await request
      .get('/api/user/users')
      .set('Authorization', `Bearer ${makeAccessToken(user)}`);
    expect(res.status).toBe(403);
  });

  it('returns paginated list for an admin (200)', async () => {
    const admin = makeUser({ id: 99, role: 'admin' });
    const rows  = [makeUser(), makeUser({ id: 2, email: 'b@b.com', username: 'user2' })];
    mockQuery
      .mockResolvedValueOnce({ rows, rowCount: rows.length })
      .mockResolvedValueOnce({ rows: [{ total: '2' }], rowCount: 1 });
    const res = await request
      .get('/api/user/users?page=1&limit=20')
      .set('Authorization', `Bearer ${makeAccessToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 2 });
  });

  it('caps limit at 100', async () => {
    const admin = makeUser({ id: 99, role: 'admin' });
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 });
    const res = await request
      .get('/api/user/users?page=1&limit=9999')
      .set('Authorization', `Bearer ${makeAccessToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });
});
