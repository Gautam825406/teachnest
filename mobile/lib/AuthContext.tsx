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
  /** True when the last OTP was a demo OTP (SMS not configured by the institute),
   * false when a real SMS was sent, null when no OTP has been requested yet. */
  otpDemo: boolean | null;
  /** Demo OTP value from the backend, if any — shown only when otpDemo is true. */
  otpDemoValue: string | null;
  requestOtp: (orgCode: string, phone: string) => Promise<string | null>;
  verifyOtp: (otp: string, name?: string) => Promise<void>;
  /** Create an account with a password (no OTP) and log in directly. */
  register: (orgCode: string, name: string, phone: string, password: string) => Promise<void>;
  /** Log in a registered student with a password (no OTP). */
  loginWithPassword: (orgCode: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgCode, setOrgCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otpDemo, setOtpDemo] = useState<boolean | null>(null);
  const [otpDemoValue, setOtpDemoValue] = useState<string | null>(null);

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
    // The backend is the source of truth: demo:true means SMS is not
    // configured. Older backends omit `demo` but return a demo_otp value.
    const isDemo = res.demo ?? (res.demo_otp ? true : false);
    setOtpDemo(isDemo);
    setOtpDemoValue(isDemo ? (res.demo_otp ?? null) : null);
    return res.demo_otp ?? null;
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

  const storeSession = useCallback(async (accessToken: string, nextStudent: Student) => {
    setAuthToken(accessToken);
    setToken(accessToken);
    setStudent(nextStudent);
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(STUDENT_KEY, JSON.stringify(nextStudent));
  }, []);

  const register = useCallback(
    async (org: string, name: string, ph: string, password: string) => {
      const res = await api.registerStudent(org, name, ph, password);
      setOrgCode(org);
      setPhone(ph);
      await storeSession(res.access_token, res.student);
    },
    [storeSession],
  );

  const loginWithPassword = useCallback(
    async (org: string, ph: string, password: string) => {
      const res = await api.loginWithPassword(org, ph, password);
      setOrgCode(org);
      setPhone(ph);
      await storeSession(res.access_token, res.student);
    },
    [storeSession],
  );

  const logout = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setStudent(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, STUDENT_KEY]);
  }, []);

  const value = useMemo(
    () => ({
      token,
      student,
      loading,
      orgCode,
      phone,
      otpDemo,
      otpDemoValue,
      requestOtp,
      verifyOtp,
      register,
      loginWithPassword,
      logout,
    }),
    [token, student, loading, orgCode, phone, otpDemo, otpDemoValue, requestOtp, verifyOtp, register, loginWithPassword, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
