// ─────────────────────────────────────────────────────────────────────────────
// STRESS TEST  —  spike to 100 VUs · ~5 min total
// Purpose: Push the server beyond normal capacity to find its breaking point.
//          Focuses on login + profile endpoints (computationally heaviest).
// Run:  k6 run k6/stress.test.js
// ─────────────────────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, PARAMS, randomUser, authParams } from './config.js';

// ── Test user — set these to a real verified account in your DB ────────────
// The stress test re-uses a single pre-seeded user to avoid hitting the
// register rate limiter and to test authenticated endpoints at high concurrency.
// Replace the values below with real credentials from your DB.
const STRESS_USER = {
  email: __ENV.STRESS_EMAIL || 'stress@k6test.local',
  password: __ENV.STRESS_PASSWORD || 'TestPass@1234',
};

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // Warm-up
    { duration: '1m',  target: 30  },  // Normal load
    { duration: '1m',  target: 60  },  // High load
    { duration: '30s', target: 100 },  // SPIKE — absolute max
    { duration: '1m',  target: 100 },  // Hold spike
    { duration: '30s', target: 30  },  // Recover
    { duration: '30s', target: 0   },  // Ramp down
  ],

  thresholds: {
    // Allow up to 10% failure under stress
    http_req_failed: ['rate<0.10'],
    // p95 under 3s (lenient — server is under extreme load)
    http_req_duration: ['p(95)<3000'],
  },
};

// ── Setup: Get a valid token once before all VUs start ─────────────────────
export function setup() {
  // Try to login with the pre-seeded stress user
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: STRESS_USER.email, password: STRESS_USER.password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (res.status !== 200) {
    console.warn(
      `[stress] setup login failed (${res.status}). ` +
      `Ensure a verified user exists with email="${STRESS_USER.email}". ` +
      `You can pass credentials via env: k6 run -e STRESS_EMAIL=... -e STRESS_PASSWORD=... k6/stress.test.js`,
    );
    return { accessToken: null };
  }

  const body = res.json();
  console.log(`[stress] Setup login OK — token obtained for ${STRESS_USER.email}`);
  return { accessToken: body.accessToken };
}

// ── Main VU function ───────────────────────────────────────────────────────
export default function (data) {
  const token = data.accessToken;

  // ── 1. Health check (unauthenticated, lightweight) ─────────────────────
  group('health', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health: 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── 2. Login (tests bcrypt + DB under concurrency) ─────────────────────
  let freshToken = token;
  group('login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: STRESS_USER.email, password: STRESS_USER.password }),
      PARAMS,
    );
    check(res, {
      'login: 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
    if (res.status === 200) {
      freshToken = res.json('accessToken') || token;
    }
  });

  sleep(0.3);

  // ── 3. Get profile (authenticated, tests JWT verify + DB read) ──────────
  if (freshToken) {
    group('get profile', () => {
      const res = http.get(`${BASE_URL}/api/user/profile`, authParams(freshToken));
      check(res, {
        'profile: 200 or 401': (r) => r.status === 200 || r.status === 401,
      });
    });
  }

  sleep(0.2);

  // ── 4. Forgot password (tests email rate limiter under pressure) ────────
  group('forgot password', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/forgot-password`,
      JSON.stringify({ email: STRESS_USER.email }),
      PARAMS,
    );
    check(res, {
      'forgot-password: 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
  });

  sleep(0.5);
}

// ── Summary report ─────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'k6/results/stress-summary.json': JSON.stringify(data, null, 2),
  };
}
