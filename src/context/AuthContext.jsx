import { createContext, useContext, useState, useCallback } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('majd_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [error, setError] = useState(null);

  const persist = (user, token) => {
    localStorage.setItem('majd_token', token);
    localStorage.setItem('majd_user', JSON.stringify(user));
    setUser(user);
  };

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { user, token } = await authApi.login({ email, password });
      persist(user, token);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'تعذر تسجيل الدخول');
      return false;
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setError(null);
    try {
      const { user, token } = await authApi.register({ name, email, password });
      persist(user, token);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'تعذر إنشاء الحساب');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('majd_token');
    localStorage.removeItem('majd_user');
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    setError(null);
    try {
      const { message } = await authApi.forgotPassword({ email });
      return { ok: true, message };
    } catch (err) {
      const msg = err.response?.data?.error || 'تعذر إرسال طلب الاستعادة';
      setError(msg);
      return { ok: false, message: msg };
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    setError(null);
    try {
      const { message } = await authApi.resetPassword({ token, newPassword });
      return { ok: true, message };
    } catch (err) {
      const msg = err.response?.data?.error || 'تعذر تغيير كلمة المرور';
      setError(msg);
      return { ok: false, message: msg };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, error, login, register, logout, forgotPassword, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth لازم يُستخدم داخل AuthProvider');
  return ctx;
}
