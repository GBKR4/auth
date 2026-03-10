// ─────────────────────────────────────────────────────────────────────────────
// LOAD TEST  —  ramp to 25 VUs · ~4 min total
// Purpose: Simulate realistic concurrent usage. Exercises the full auth
//          lifecycle: register → login → profile read/update → logout.
// Run:  k6 run k6/load.test.js
// ─────────────────────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, PARAMS, randomUser, login, authParams } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 5  },  // Warm-up: ramp to 5 VUs
    { duration: '1m',  target: 10 },  // Ramp to 10 VUs
    { duration: '1m',  target: 25 },  // Peak: ramp to 25 VUs
    { duration: '1m',  target: 25 },  // Sustain peak load
    { duration: '30s', target: 0  },  // Ramp down
  ],

  thresholds: {
    // Less than 2% of all requests fail
    http_req_failed: ['rate<0.02'],
    // p95 under 800ms, p99 under 2s
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    // At least 95% of named checks pass
    'checks': ['rate>0.95'],
  },
};

export default function () {
  const user = randomUser();

  // ── Stage 1: Register ──────────────────────────────────────────────────────
  group('register', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ name: user.name, email: user.email, password: user.password }),
      PARAMS,
    );

    const status = res.status;
    check(res, {
      'register: 201 or 429': (r) => r.status === 201 || r.status === 429,
    });

    if (status === 429) {
      // Rate limited — back off and skip the rest of this iteration
      sleep(2);
      return;
    }
  });

  sleep(0.5);

  // ── Stage 2: Login ─────────────────────────────────────────────────────────
  let tokens = null;
  group('login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      PARAMS,
    );

    // 401 = email not verified yet (expected in test env without email verify step)
    check(res, {
      'login: 200 or 401 or 429': (r) =>
        r.status === 200 || r.status === 401 || r.status === 429,
    });

    if (res.status === 200) {
      const body = res.json();
      tokens = {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      };
    }
  });

  if (!tokens) {
    sleep(1);
    return;
  }

  sleep(0.5);

  // ── Stage 3: Read profile ──────────────────────────────────────────────────
  group('get profile', () => {
    const res = http.get(`${BASE_URL}/api/user/profile`, authParams(tokens.accessToken));
    check(res, {
      'profile GET: 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // ── Stage 4: Update profile ────────────────────────────────────────────────
  group('update profile', () => {
    const res = http.put(
      `${BASE_URL}/api/user/profile`,
      JSON.stringify({ name: `Updated ${user.name}` }),
      authParams(tokens.accessToken),
    );
    check(res, {
      'profile PUT: 200 or 400': (r) => r.status === 200 || r.status === 400,
    });
  });

  sleep(0.5);

  // ── Stage 5: Refresh token ─────────────────────────────────────────────────
  group('refresh token', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/refresh`,
      JSON.stringify({ refreshToken: tokens.refreshToken }),
      PARAMS,
    );
    const ok = check(res, {
      'refresh: 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    if (ok && res.status === 200) {
      tokens.accessToken = res.json('accessToken') || tokens.accessToken;
    }
  });

  sleep(0.5);

  // ── Stage 6: Logout ────────────────────────────────────────────────────────
  group('logout', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/logout`,
      null,
      authParams(tokens.accessToken),
    );
    check(res, {
      'logout: 200 or 204': (r) => r.status === 200 || r.status === 204,
    });
  });

  sleep(1);
}

// ── Summary report ─────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'k6/results/load-summary.json': JSON.stringify(data, null, 2),
  };
}
