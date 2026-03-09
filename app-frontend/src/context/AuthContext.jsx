import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios.js';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true until the initial cookie-based auth check resolves
  const [loading, setLoading] = useState(true);

  // On every page load: ask the server if the cookie is still valid
  useEffect(() => {
    api.get('/user/profile')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);
    // Cookies are set by the server; store only the user object in state
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // Server already clears cookies; ignore network errors
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  const updateUser = useCallback((updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
