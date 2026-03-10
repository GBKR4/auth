// Shared configuration for all k6 test scripts

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Reusable thresholds applied to every scenario
export const THRESHOLDS = {
  // 95% of all requests must complete within 500 ms
  http_req_duration: ['p(95)<500'],
  // Less than 1% of requests may fail
  http_req_failed: ['rate<0.01'],
};

// Test user credentials — must exist in the DB before running load/stress tests.
// The smoke test creates and tears down its own user automatically.
export const TEST_USER = {
  email: __ENV.TEST_EMAIL || 'loadtest@example.com',
  password: __ENV.TEST_PASSWORD || 'LoadTest@1234',
};

// Admin credentials — needed for the admin endpoint test
export const ADMIN_USER = {
  email: __ENV.ADMIN_EMAIL || 'admin@example.com',
  password: __ENV.ADMIN_PASSWORD || 'Admin@1234',
};

// Cookie helpers: extract a named Set-Cookie value from a response
export function getCookie(res, name) {
  const header = res.headers['Set-Cookie'] || res.headers['set-cookie'] || '';
  const cookies = Array.isArray(header) ? header : [header];
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    if (match) return match[1];
  }
  return null;
}

// Build a jar-compatible cookie string from a response for subsequent requests
export function extractCookies(res) {
  const header = res.headers['Set-Cookie'] || res.headers['set-cookie'] || '';
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  return cookies
    .map((c) => c.split(';')[0])
    .join('; ');
}
