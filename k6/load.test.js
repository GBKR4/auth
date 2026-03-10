/**
 * Load Test — auth API
 *
 * Purpose : Simulate normal expected traffic using realistic user flows.
 *           Pre-requisite: TEST_USER and ADMIN_USER must already exist in
 *           the DB and be email-verified before running this test.
 *
 * Scenarios:
 *   auth_flow  — login → get profile → update profile → refresh → logout
 *   read_only  — health check + profile reads (simulates session-keepalive)
 *   admin_flow — login as admin → list all users → logout
 *
 * Run:
 *   k6 run k6/load.test.js
 *   k6 run --env BASE_URL=http://host:3000 \
 *           --env TEST_EMAIL=user@example.com \
 *           --env TEST_PASSWORD=Pass@1234 \
 *           --env ADMIN_EMAIL=admin@example.com \
 *           --env ADMIN_PASSWORD=Admin@1234 \
 *           k6/load.test.js
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, TEST_USER, ADMIN_USER, THRESHOLDS, extractCookies } from './config.js';

// ── Custom metrics ──────────────────────────────────────────────────────────
const loginSuccess   = new Counter('login_success');
const loginFailure   = new Counter('login_failure');
const loginRate      = new Rate('login_success_rate');
const refreshLatency = new Trend('refresh_token_duration', true);
const profileLatency = new Trend('get_profile_duration', true);

// ── Options ─────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Ramp up to 20 VUs, hold for 2 min, ramp down
    auth_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '2m',  target: 20 },
        { duration: '30s', target: 0  },
      ],
      exec: 'authFlow',
    },
    // Constant 10 VUs doing lightweight read work
    read_only: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      exec: 'readOnly',
      startTime: '10s',
    },
    // 2 VUs cycling through admin operations
    admin_flow: {
      executor: 'constant-vus',
      vus: 2,
      duration: '3m',
      exec: 'adminFlow',
      startTime: '15s',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    // Tighter latency for profile reads
    get_profile_duration: ['p(95)<300'],
    // Token refresh should be fast
    refresh_token_duration: ['p(95)<400'],
    // At least 95% of login attempts should succeed
    login_success_rate: ['rate>0.95'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ── Helper: login and return cookie string ───────────────────────────────────
function loginAs(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS },
  );

  if (res.status !== 200) {
    loginFailure.add(1);
    loginRate.add(false);
    return null;
  }

  loginSuccess.add(1);
  loginRate.add(true);
  return extractCookies(res);
}

// ── Scenario: full authenticated user flow ───────────────────────────────────
export function authFlow() {
  group('Auth Flow', () => {

    // 1. Login
    let cookies;
    group('Login', () => {
      cookies = loginAs(TEST_USER.email, TEST_USER.password);
      if (!cookies) {
        fail('Login failed — aborting iteration');
      }
    });

    sleep(0.5);

    // 2. Get profile
    group('Get Profile', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/user/profile`, {
        headers: { Cookie: cookies },
      });
      profileLatency.add(Date.now() - start);
      check(res, {
        'profile 200':          (r) => r.status === 200,
        'profile has email':    (r) => r.json('email') !== undefined,
        'profile has username': (r) => r.json('username') !== undefined,
      });
    });

    sleep(0.3);

    // 3. Update profile (first_name only)
    group('Update Profile', () => {
      const res = http.put(
        `${BASE_URL}/api/user/profile`,
        JSON.stringify({ first_name: 'LoadTest' }),
        { headers: { 'Content-Type': 'application/json', Cookie: cookies } },
      );
      check(res, { 'update profile 200': (r) => r.status === 200 });
    });

    sleep(0.3);

    // 4. Refresh tokens
    group('Refresh Token', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/api/auth/refresh`,
        null,
        { headers: { Cookie: cookies } },
      );
      refreshLatency.add(Date.now() - start);
      check(res, { 'refresh 200': (r) => r.status === 200 });
      // Update cookies after rotation
      if (res.status === 200) {
        cookies = extractCookies(res) || cookies;
      }
    });

    sleep(0.3);

    // 5. Get profile again with new token
    group('Get Profile (after refresh)', () => {
      const res = http.get(`${BASE_URL}/api/user/profile`, {
        headers: { Cookie: cookies },
      });
      check(res, { 'profile after refresh 200': (r) => r.status === 200 });
    });

    sleep(0.3);

    // 6. Logout
    group('Logout', () => {
      const res = http.post(
        `${BASE_URL}/api/auth/logout`,
        null,
        { headers: { Cookie: cookies } },
      );
      check(res, { 'logout 200': (r) => r.status === 200 });
    });

    // 7. Verify token is invalidated after logout
    group('Access after logout (must fail)', () => {
      const res = http.get(`${BASE_URL}/api/user/profile`, {
        headers: { Cookie: cookies },
      });
      check(res, { 'post-logout 401': (r) => r.status === 401 });
    });
  });

  sleep(1);
}

// ── Scenario: lightweight read-only flow ─────────────────────────────────────
export function readOnly() {
  group('Read-Only Flow', () => {

    // Health check
    group('Health', () => {
      const res = http.get(`${BASE_URL}/api/health`);
      check(res, {
        'health 200':         (r) => r.status === 200,
        'health db connected':(r) => r.json('db') === 'connected',
      });
    });

    sleep(0.5);

    // Login
    let cookies;
    group('Login', () => {
      cookies = loginAs(TEST_USER.email, TEST_USER.password);
    });

    if (!cookies) {
      sleep(2);
      return;
    }

    sleep(0.3);

    // Repeated profile reads (simulates a keep-alive / SPA polling)
    for (let i = 0; i < 3; i++) {
      group('Profile Read', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/user/profile`, {
          headers: { Cookie: cookies },
        });
        profileLatency.add(Date.now() - start);
        check(res, { 'profile 200': (r) => r.status === 200 });
      });
      sleep(0.5);
    }

    // Logout
    http.post(`${BASE_URL}/api/auth/logout`, null, { headers: { Cookie: cookies } });
  });

  sleep(1);
}

// ── Scenario: admin management flow ─────────────────────────────────────────
export function adminFlow() {
  group('Admin Flow', () => {

    // Login as admin
    let cookies;
    group('Admin Login', () => {
      cookies = loginAs(ADMIN_USER.email, ADMIN_USER.password);
      if (!cookies) {
        fail('Admin login failed — aborting iteration');
      }
    });

    sleep(0.5);

    // List all users
    group('List Users', () => {
      const res = http.get(`${BASE_URL}/api/user/users`, {
        headers: { Cookie: cookies },
      });
      check(res, {
        'list users 200':        (r) => r.status === 200,
        'list users is array':   (r) => Array.isArray(r.json()),
      });
    });

    sleep(0.5);

    // Admin can also read their own profile
    group('Admin Profile', () => {
      const res = http.get(`${BASE_URL}/api/user/profile`, {
        headers: { Cookie: cookies },
      });
      check(res, {
        'admin profile 200':       (r) => r.status === 200,
        'admin role is admin':     (r) => r.json('role') === 'admin',
      });
    });

    sleep(0.3);

    // Logout
    group('Admin Logout', () => {
      const res = http.post(
        `${BASE_URL}/api/auth/logout`,
        null,
        { headers: { Cookie: cookies } },
      );
      check(res, { 'admin logout 200': (r) => r.status === 200 });
    });
  });

  sleep(2);
}
