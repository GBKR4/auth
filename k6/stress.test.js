/**
 * Stress Test — auth API
 *
 * Purpose : Find the breaking point and verify graceful degradation.
 *           Pushes the server well beyond normal load, then checks it
 *           recovers when load drops.
 *
 * Stages:
 *   Ramp-up   0 → 50 VUs  (1 min)
 *   Sustain   50 VUs       (2 min)
 *   Spike     50 → 100 VUs (30 s)
 *   Hold      100 VUs      (1 min)
 *   Recovery  100 → 0 VUs  (1 min)
 *
 * Pre-requisite: TEST_USER and ADMIN_USER must exist in the DB.
 *
 * Run:
 *   k6 run k6/stress.test.js
 *   k6 run --env BASE_URL=http://host:3000 k6/stress.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, TEST_USER, THRESHOLDS, extractCookies } from './config.js';

// ── Custom metrics ──────────────────────────────────────────────────────────
const loginSuccessRate = new Rate('stress_login_success_rate');
const errorRate        = new Rate('stress_error_rate');
const loginDuration    = new Trend('stress_login_duration', true);
const profileDuration  = new Trend('stress_profile_duration', true);
const refreshDuration  = new Trend('stress_refresh_duration', true);
const totalErrors      = new Counter('stress_total_errors');

// ── Options ──────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '1m',  target: 50  }, // ramp-up to 50 VUs
    { duration: '2m',  target: 50  }, // sustain
    { duration: '30s', target: 100 }, // spike
    { duration: '1m',  target: 100 }, // hold at peak
    { duration: '1m',  target: 0   }, // recovery
  ],
  thresholds: {
    // Relax latency thresholds for stress — we care about errors, not speed
    http_req_duration:         ['p(95)<2000'],
    http_req_failed:           ['rate<0.10'],   // allow up to 10% failure under extreme load
    stress_login_success_rate: ['rate>0.85'],   // at least 85% of logins must succeed
    stress_error_rate:         ['rate<0.15'],   // total error rate cap
    stress_login_duration:     ['p(99)<3000'],
    stress_profile_duration:   ['p(99)<2000'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function () {
  group('Stress: Auth Cycle', () => {

    // ── Login ───────────────────────────────────────────────────────────────
    let cookies = null;
    group('Login', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
        { headers: JSON_HEADERS },
      );
      loginDuration.add(Date.now() - start);

      const ok = res.status === 200;
      loginSuccessRate.add(ok);

      if (!ok) {
        errorRate.add(true);
        totalErrors.add(1);
        check(res, {
          'stress login: accepts 200 or 429': (r) =>
            r.status === 200 || r.status === 429 || r.status === 401,
        });
        return;
      }

      errorRate.add(false);
      cookies = extractCookies(res);

      check(res, {
        'login 200':       (r) => r.status === 200,
        'login has user':  (r) => r.json('user') !== null,
      });
    });

    if (!cookies) {
      sleep(1);
      return;
    }

    sleep(0.2);

    // ── Get profile ─────────────────────────────────────────────────────────
    group('Get Profile', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/user/profile`, {
        headers: { Cookie: cookies },
      });
      profileDuration.add(Date.now() - start);

      const ok = res.status === 200;
      errorRate.add(!ok);
      if (!ok) totalErrors.add(1);

      check(res, {
        'profile 200':       (r) => r.status === 200,
        'profile has email': (r) => r.json('email') !== undefined,
      });
    });

    sleep(0.2);

    // ── Refresh token ───────────────────────────────────────────────────────
    group('Refresh Token', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/api/auth/refresh`,
        null,
        { headers: { Cookie: cookies } },
      );
      refreshDuration.add(Date.now() - start);

      const ok = res.status === 200;
      errorRate.add(!ok);
      if (!ok) totalErrors.add(1);

      check(res, { 'refresh 200': (r) => r.status === 200 });

      if (ok) cookies = extractCookies(res) || cookies;
    });

    sleep(0.2);

    // ── Health check (mid-cycle) ────────────────────────────────────────────
    group('Health', () => {
      const res = http.get(`${BASE_URL}/api/health`);
      check(res, {
        'health 200':          (r) => r.status === 200,
        'db still connected':  (r) => r.json('db') === 'connected',
      });
    });

    sleep(0.2);

    // ── Logout ──────────────────────────────────────────────────────────────
    group('Logout', () => {
      const res = http.post(
        `${BASE_URL}/api/auth/logout`,
        null,
        { headers: { Cookie: cookies } },
      );
      check(res, { 'logout 200': (r) => r.status === 200 });
    });
  });

  // Shorter sleep under stress to maximise pressure
  sleep(0.5);
}

// ── Setup: verify the server is reachable before hammering it ───────────────
export function setup() {
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`Server not reachable at ${BASE_URL} — aborting stress test`);
  }
  console.log(`Stress test starting against ${BASE_URL}`);
}

// ── Teardown: print a summary note ──────────────────────────────────────────
export function teardown() {
  console.log('Stress test complete. Review stress_* custom metrics above.');
}
