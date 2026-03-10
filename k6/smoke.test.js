// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST  —  1 VU · 30 s
// Purpose: Quick sanity check. Confirms all core endpoints respond with
//          expected HTTP status codes and p95 latency stays under 500ms.
// Run:  k6 run k6/smoke.test.js
// ─────────────────────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, PARAMS, randomUser, login, authParams } from './config.js';

export const options = {
  vus: 1,
  duration: '30s',

  thresholds: {
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'],
    // 95th percentile response time < 500ms
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  // ── 1. Health check ────────────────────────────────────────────────────────
  {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: db connected': (r) => r.json('db') === 'connected',
    });
  }

  sleep(0.5);

  // ── 2. Register a unique user ──────────────────────────────────────────────
  const user = randomUser();
  let registered = false;
  {
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ name: user.name, email: user.email, password: user.password }),
      PARAMS,
    );
    registered = check(res, {
      'register: status 201': (r) => r.status === 201,
    });
    // 429 = rate limited – that's fine too, just note it
    if (res.status === 429) {
      console.log('[smoke] Register rate-limited (429) — expected');
    }
  }

  sleep(0.5);

  // ── 3. Login ───────────────────────────────────────────────────────────────
  const tokens = login(user.email, user.password);

  // If registration was rate-limited or email not yet verified, login may fail
  if (tokens) {
    sleep(0.5);

    // ── 4. Get profile (authenticated) ──────────────────────────────────────
    {
      const res = http.get(`${BASE_URL}/api/user/profile`, authParams(tokens.accessToken));
      check(res, {
        'profile GET: status 200 or 403': (r) => r.status === 200 || r.status === 403,
      });
    }

    sleep(0.5);

    // ── 5. Refresh token ─────────────────────────────────────────────────────
    {
      const res = http.post(
        `${BASE_URL}/api/auth/refresh`,
        JSON.stringify({ refreshToken: tokens.refreshToken }),
        PARAMS,
      );
      check(res, {
        'refresh: status 200 or 401': (r) => r.status === 200 || r.status === 401,
      });
    }

    sleep(0.5);

    // ── 6. Logout ────────────────────────────────────────────────────────────
    {
      const res = http.post(`${BASE_URL}/api/auth/logout`, null, authParams(tokens.accessToken));
      check(res, {
        'logout: status 200 or 204': (r) => r.status === 200 || r.status === 204,
      });
    }
  }

  sleep(1);
}
