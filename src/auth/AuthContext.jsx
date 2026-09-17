import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authApi from '../api/auth';
import { getToken, setToken, clearToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  // Seeded synchronously from localStorage so a page refresh doesn't flash
  // "no admin name" for a moment; re-validated against the backend below.
  const [admin, setAdmin] = useState(() => {
    try {
      const raw = localStorage.getItem('admin_identity');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    setToken(result.token);
    setTokenState(result.token);
    setAdmin(result.admin);
    localStorage.setItem('admin_identity', JSON.stringify(result.admin));
    return result.admin;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('admin_identity');
    setTokenState(null);
    setAdmin(null);
  }, []);

  // A page refresh previously kept the app "logged in" purely because a
  // token existed in localStorage, with no check that the backend still
  // considers it valid — a revoked/expired token only surfaced once some
  // API call happened to 401. Validating on load (and refreshing the
  // displayed name/role) catches that immediately instead. `request()`'s
  // own 401 handling clears the token and redirects if this fails.
  useEffect(() => {
    if (!token) return;
    authApi
      .me()
      .then((result) => {
        setAdmin(result);
        localStorage.setItem('admin_identity', JSON.stringify(result));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ token, admin, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
