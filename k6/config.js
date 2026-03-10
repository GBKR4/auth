// ─────────────────────────────────────────────────────────────────────────────
// k6 Shared Config & Helpers
// ─────────────────────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = 'http://localhost:3000';

// ── Default request parameters ─────────────────────────────────────────────
export const PARAMS = {
  headers: { 'Content-Type': 'application/json' },
};

/**
 * Login and return { accessToken, refreshToken } or null on failure.
 * @param {string} email
 * @param {string} password
 */
export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    PARAMS,
  );

  const ok = check(res, {
    'login: status 200': (r) => r.status === 200,
  });

  if (!ok) return null;

  const body = res.json();
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  };
}

/**
 * Build Authorization header params for authenticated requests.
 * @param {string} token  - JWT access token
 */
export function authParams(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    // forward cookies so the server can read the refresh cookie
    redirects: 5,
  };
}

/**
 * Generate a unique test user email to avoid DB conflicts across VUs.
 * @returns {{ email: string, password: string, name: string }}
 */
export function randomUser() {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Test User ${id}`,
    email: `testuser_${id}@k6test.local`,
    password: 'TestPass@1234',
  };
}
