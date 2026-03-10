/**
 * Smoke Test — auth API
 *
 * Purpose : Verify every endpoint works correctly under minimal load (1 VU).
 * Scope   : Full happy-path walk-through + key error-path checks.
 * Run     : k6 run k6/smoke.test.js
 *           k6 run --env BASE_URL=http://your-host:3000 k6/smoke.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, extractCookies } from './config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    // Smoke test deliberately exercises error paths (4xx), so http_req_failed
    // is not meaningful here. Only assert on latency.
    // p(95) is generous to allow for SMTP sending time on forgot-password.
    http_req_duration: ['p(95)<5000'],
  },
};

// Unique suffix per test run so the smoke test is idempotent
const RUN_ID   = Date.now();
const EMAIL    = `smoke_${RUN_ID}@example.com`;
const USERNAME = `smokeuser${RUN_ID}`;
const PASSWORD = 'Smoke@Test1234';
const NEW_PWD  = 'Smoke@NewPass5678';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function () {

  // ── 1. Health check ─────────────────────────────────────────────────────
  group('Health', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health status 200':  (r) => r.status === 200,
      'health db connected':(r) => r.json('db') === 'connected',
    });
  });

  sleep(0.2);

  // ── 2. Register ──────────────────────────────────────────────────────────
  // NOTE: registerLimiter (max 10 / 15 min). If the smoke test is run many
  // times in the same window, 429 is an acceptable response here.
  let userCreated = false;
  let userId;
  group('Register', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ email: EMAIL, username: USERNAME, password: PASSWORD }),
      { headers: JSON_HEADERS },
    );
    userCreated = res.status === 201;
    check(res, {
      'register 201 (or 429 if rate-limited)':    (r) => r.status === 201 || r.status === 429,
      'register returns user (when 201)': (r) => r.status !== 201 || r.json('user.email') === EMAIL,
    });
    if (userCreated) userId = res.json('user.id');

    // Duplicate registration must be rejected — 409 or 429 if rate-limited
    const dup = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ email: EMAIL, username: `dup${USERNAME}`, password: PASSWORD }),
      { headers: JSON_HEADERS },
    );
    check(dup, { 'duplicate email 409/429': (r) => r.status === 409 || r.status === 429 });
  });

  sleep(0.2);

  // ── 3. Login before verification (must fail) ────────────────────────────
  // 403 = user exists but unverified; 401 = user wasn't created (rate-limited above)
  group('Login – unverified', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      { headers: JSON_HEADERS },
    );
    check(res, {
      'unverified login 403 (or 401 if not created)': (r) =>
        r.status === 403 || (r.status === 401 && !userCreated),
    });
  });

  sleep(0.2);

  // ── 4. Resend verification ───────────────────────────────────────────────
  group('Resend verification', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/resend-verification`,
      JSON.stringify({ email: EMAIL }),
      { headers: JSON_HEADERS },
    );
    // 200 regardless of whether the email is registered (anti-enumeration)
    check(res, { 'resend-verification 200': (r) => r.status === 200 });
  });

  sleep(0.2);

  // ── 5. Forgot password (anti-enumeration — always 200, or 429 if rate-limited) ─
  group('Forgot password', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/forgot-password`,
      JSON.stringify({ email: EMAIL }),
      { headers: JSON_HEADERS },
    );
    // passwordResetLimiter is max 5 / 15 min — accept 429 on repeated dev runs
    check(res, { 'forgot-password 200/429': (r) => r.status === 200 || r.status === 429 });

    // Non-existent email must also return 200 (or 429 if rate-limited from prior runs)
    const unknown = http.post(
      `${BASE_URL}/api/auth/forgot-password`,
      JSON.stringify({ email: `noone_${RUN_ID}@example.com` }),
      { headers: JSON_HEADERS },
    );
    check(unknown, { 'forgot-password unknown 200/429': (r) => r.status === 200 || r.status === 429 });
  });

  sleep(0.2);

  // ── 6. Validate reset token (invalid token) ─────────────────────────────
  group('Validate reset token', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/validate-reset-token`,
      JSON.stringify({ token: 'invalid-token-abc123' }),
      { headers: JSON_HEADERS },
    );
    check(res, { 'invalid reset token 400': (r) => r.status === 400 });
  });

  sleep(0.2);

  // ── 7. Reset password (invalid token) ───────────────────────────────────
  group('Reset password – invalid token', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/reset-password`,
      JSON.stringify({ token: 'invalid-token-abc123', newPassword: NEW_PWD }),
      { headers: JSON_HEADERS },
    );
    check(res, { 'invalid reset-password 400': (r) => r.status === 400 });
  });

  sleep(0.2);

  // ── 8. Login with wrong password ─────────────────────────────────────────
  group('Login – wrong password', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: EMAIL, password: 'WrongPass@99' }),
      { headers: JSON_HEADERS },
    );
    // 401 or 403 (user not verified yet, but wrong-password path is hit first)
    check(res, { 'bad credentials 4xx': (r) => r.status >= 400 && r.status < 500 });
  });

  sleep(0.2);

  // ── 9. Refresh without a cookie (must fail) ──────────────────────────────
  group('Refresh – no cookie', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/refresh`,
      null,
      { headers: JSON_HEADERS },
    );
    check(res, { 'refresh no-cookie 401': (r) => r.status === 401 });
  });

  sleep(0.2);

  // ── 10. Protected route — no auth ────────────────────────────────────────
  group('Profile – no auth', () => {
    const res = http.get(`${BASE_URL}/api/user/profile`);
    check(res, { 'profile no-auth 401': (r) => r.status === 401 });
  });

  sleep(0.2);

  // ── 11. Input validation checks ──────────────────────────────────────────
  group('Validation', () => {
    // Weak password — expect 400 (validation) or 429 (rate-limited from prior runs)
    const weakPw = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ email: `val_${RUN_ID}@example.com`, username: `val${RUN_ID}`, password: '123' }),
      { headers: JSON_HEADERS },
    );
    check(weakPw, { 'weak password 400/429': (r) => r.status === 400 || r.status === 429 });

    // Bad email format
    const badEmail = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: 'not-an-email', password: PASSWORD }),
      { headers: JSON_HEADERS },
    );
    check(badEmail, { 'bad email format 400': (r) => r.status === 400 });
  });

  sleep(0.2);

  // ── 12. Logout without auth (should succeed gracefully) ──────────────────
  group('Logout – no session', () => {
    const res = http.post(`${BASE_URL}/api/auth/logout`);
    // Server clears cookies either way
    check(res, { 'logout no-session 200': (r) => r.status === 200 });
  });
}
