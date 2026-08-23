import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { decodeJwtPayload } from '../utils/jwt';

const AuthContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const userFromToken = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return { id: payload.userId || payload.id, role: payload.role, employeeId: payload.employeeId, email: payload.email, firstName: payload.firstName, lastName: payload.lastName, department: payload.department };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateToken = useCallback((nextToken) => {
    setToken(nextToken || null);
    setUser(nextToken ? userFromToken(nextToken) : null);
  }, []);

  useEffect(() => {
    let active = true;
    axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
      .then((response) => { if (active) updateToken(response.data?.data?.token); })
      .catch(() => { if (active) updateToken(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [updateToken]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password }, { withCredentials: true });
      const payload = response.data?.data || response.data || {};
      const authToken = payload.token || payload.accessToken;
      if (!authToken) return { success: false, message: 'The server did not return an access token.' };
      setToken(authToken);
      setUser(payload.user || userFromToken(authToken));
      return { success: true, user: payload.user || userFromToken(authToken) };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true, headers: { Authorization: `Bearer ${token}` } });
    } finally {
      setUser(null);
      setToken(null);
    }
  }, [token]);

  const value = useMemo(() => ({ user, token, login, logout, updateToken, loading }), [user, token, login, logout, updateToken, loading]);
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
