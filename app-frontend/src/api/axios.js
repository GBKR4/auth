import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly cookies on every request
});

// ── Response interceptor: silent token refresh on 401 ─────────────────────────
let isRefreshing = false;
let waitingQueue = [];

const processQueue = (error) => {
  waitingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve()
  );
  waitingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only handle 401s that have not already been retried
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Queue additional requests while a refresh is already in flight
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitingQueue.push({ resolve, reject });
      })
        .then(() => api(original))
        .catch((e) => Promise.reject(e));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Cookie (refreshToken) is sent automatically — no body needed
      await axios.post('/api/auth/refresh', {}, { withCredentials: true });
      processQueue(null);
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError);
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
