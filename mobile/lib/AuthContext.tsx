import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken, type Student } from './api';

const TOKEN_KEY = 'teachnest_student_token';
const STUDENT_KEY = 'teachnest_student';

interface AuthState {
  token: string | null;
  student: Student | null;
  loading: boolean;
  orgCode: string;
  phone: string;
  requestOtp: (orgCode: string, phone: string) => Promise<string>;
  verifyOtp: (otp: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgCode, setOrgCode] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [t, s] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(STUDENT_KEY)]);
        if (t) {
          setAuthToken(t);
          setToken(t);
          if (s) setStudent(JSON.parse(s) as Student);
          try {
            const me = await api.me();
            setStudent(me);
            await AsyncStorage.setItem(STUDENT_KEY, JSON.stringify(me));
          } catch {
            // Stored token invalid/expired — stay logged out silently; user re-logs in.
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestOtp = useCallback(async (org: string, ph: string) => {
    const res = await api.requestOtp(org, ph);
    setOrgCode(org);
    setPhone(ph);
    return res.demo_otp;
  }, []);

  const verifyOtp = useCallback(
    async (otp: string, name?: string) => {
      const res = await api.verifyOtp(orgCode, phone, otp, name);
      setAuthToken(res.access_token);
      setToken(res.access_token);
      setStudent(res.student);
      await AsyncStorage.setItem(TOKEN_KEY, res.access_token);
      await AsyncStorage.setItem(STUDENT_KEY, JSON.stringify(res.student));
    },
    [orgCode, phone],
  );

  const logout = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setStudent(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, STUDENT_KEY]);
  }, []);

  const value = useMemo(
    () => ({ token, student, loading, orgCode, phone, requestOtp, verifyOtp, logout }),
    [token, student, loading, orgCode, phone, requestOtp, verifyOtp, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
