import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  captureClientDeviceInfo,
  getTrustedDeviceId,
  ClientDeviceInfo,
} from '@/utils/deviceFingerprint';
import {
  authenticateWithClientVault,
  authenticateBiometricWithVault,
  requestDeviceApprovalInVault,
  checkDeviceStatusInVault,
  getActiveVault,
  recordVaultSecurityEvent,
} from '@/utils/securityVault';

export interface AuthUser {
  userId: string;
  name: string;
  role: 'admin' | 'user';
}

export interface LoginResult {
  success: boolean;
  code?:
    | 'SUCCESS'
    | 'NEW_DEVICE_DETECTED'
    | 'APPROVAL_PENDING'
    | 'DEVICE_LIMIT_REACHED'
    | 'DEVICE_REVOKED'
    | 'DEVICE_REJECTED'
    | 'INVALID_CREDENTIALS'
    | 'ERROR';
  requiresApproval?: boolean;
  message?: string;
  name?: string;
  error?: string;
  user?: AuthUser;
}

export interface DeviceStatusResult {
  status: 'pending' | 'approved' | 'rejected' | 'revoked' | 'unknown';
  name?: string;
  token?: string;
  user?: AuthUser;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  deviceInfo: ClientDeviceInfo;
  login: (userId: string, password: string) => Promise<LoginResult>;
  loginWithBiometric: (adminId?: string) => Promise<LoginResult>;
  requestDeviceApproval: (
    userId: string,
    name: string
  ) => Promise<{ success: boolean; status?: string; name?: string; error?: string }>;
  checkDeviceStatus: (userId: string) => Promise<DeviceStatusResult>;
  securityAlert: string | null;
  clearSecurityAlert: () => void;
  registerFailedAttempt: (context?: string) => void;
  resetFailedAttempts: () => void;
  logout: () => Promise<void>;
  logoutWithReason: (reason: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'mediaforge_auth_session_token';
const USER_STORAGE_KEY = 'mediaforge_auth_session_user';
const SECURITY_ALERT_KEY = 'mediaforge_security_alert_msg';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<ClientDeviceInfo>(() => captureClientDeviceInfo());
  const [securityAlert, setSecurityAlert] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SECURITY_ALERT_KEY);
    } catch {
      return null;
    }
  });

  const clearSecurityAlert = useCallback(() => {
    setSecurityAlert(null);
    try {
      sessionStorage.removeItem(SECURITY_ALERT_KEY);
    } catch {}
  }, []);

  // Initialize Trusted Device ID and verify strictly ephemeral session
  useEffect(() => {
    async function initDevice() {
      // Purge any legacy localStorage tokens so exiting the browser/tab always signs out
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch {}

      const trustedId = await getTrustedDeviceId();
      const updatedInfo = captureClientDeviceInfo(trustedId);
      setDeviceInfo(updatedInfo);

      // Strictly read from sessionStorage (only alive for the current browser session/tab)
      const savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUser = sessionStorage.getItem(USER_STORAGE_KEY);

      if (savedToken) {
        await verifyToken(savedToken, savedUser ? JSON.parse(savedUser) : null);
      } else {
        setIsLoading(false);
      }
    }
    initDevice();
  }, []);

  const verifyToken = async (jwtToken: string, fallbackUser?: AuthUser | null) => {
    try {
      // If token is a client-vault token, verify locally
      if (jwtToken.startsWith('vault_')) {
        if (jwtToken.startsWith('vault_admin')) {
          const vault = getActiveVault();
          const adminUser: AuthUser = {
            userId: vault.adminId,
            name: 'Administrator',
            role: 'admin',
          };
          setUser(adminUser);
          setToken(jwtToken);
        } else if (fallbackUser) {
          setUser(fallbackUser);
          setToken(jwtToken);
        } else {
          clearTokens();
        }
        setIsLoading(false);
        return;
      }

      // Try server verification
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        if (data.valid && data.user) {
          setUser(data.user);
          setToken(jwtToken);
        } else {
          clearTokens();
        }
      } else if (fallbackUser) {
        // Retain session in offline/static environments
        setUser(fallbackUser);
        setToken(jwtToken);
      } else {
        clearTokens();
      }
    } catch {
      if (fallbackUser) {
        setUser(fallbackUser);
        setToken(jwtToken);
      } else {
        clearTokens();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const persistSession = (authToken: string, authUser: AuthUser) => {
    setUser(authUser);
    setToken(authToken);
    // Persist only in sessionStorage (automatically terminated when tab or window closes)
    sessionStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
  };

  const clearTokens = useCallback(() => {
    setUser(null);
    setToken(null);
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {}
  }, []);

  const logoutWithReason = useCallback(
    async (reason: string) => {
      const activeUserId = user?.userId || 'SESSION';
      const activeDeviceId = deviceInfo?.deviceId || 'DEVICE';
      recordVaultSecurityEvent('AUTO_SIGN_OUT', activeUserId, activeDeviceId, reason, 'WARNING');

      try {
        if (token && !token.startsWith('vault_')) {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      } catch {}
      clearTokens();
      setSecurityAlert(reason);
      try {
        sessionStorage.setItem(SECURITY_ALERT_KEY, reason);
      } catch {}
    },
    [token, user, deviceInfo, clearTokens]
  );

  // Inactivity Auto-Signout Watchdog (15 minutes idle time)
  useEffect(() => {
    if (!token || !user) return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    const handleUserActivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logoutWithReason('Session expired due to inactivity. Signed out automatically for device protection.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const trackedEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    trackedEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    handleUserActivity();

    return () => {
      clearTimeout(inactivityTimer);
      trackedEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [token, user, logoutWithReason]);

  // Track failed attempts and trigger automatic security lockout after 3 consecutive failures
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  const registerFailedAttempt = useCallback(
    (context = 'Invalid security action') => {
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          logoutWithReason(
            `⚠️ Security Alert: 3 invalid attempts detected (${context}). Automatically signed out and locked for hardware safety.`
          );
          return 0;
        }
        return next;
      });
    },
    [logoutWithReason]
  );

  const resetFailedAttempts = useCallback(() => {
    setFailedAttempts(0);
  }, []);

  const login = async (userId: string, password: string): Promise<LoginResult> => {
    try {
      const currentDeviceId = await getTrustedDeviceId();
      const currentDevice = captureClientDeviceInfo(currentDeviceId);

      // Attempt server authentication first
      let serverAvailable = false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId.trim(),
            password,
            deviceId: currentDeviceId,
            deviceInfo: currentDevice,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (isJson) {
          serverAvailable = true;
          const data = await res.json();

          if (res.ok && data.success) {
            persistSession(data.token, data.user);
            return { success: true, code: 'SUCCESS', user: data.user };
          }

          return {
            success: false,
            code: data.code || 'ERROR',
            requiresApproval: Boolean(data.requiresApproval),
            message: data.message,
            name: data.name,
            error: data.error || 'Authentication failed',
          };
        }
      } catch {
        serverAvailable = false;
      }

      // If server is not running or returned non-JSON (e.g. GitHub Pages static 404 HTML)
      // gracefully authenticate using the client cryptographic vault
      const vaultResult = await authenticateWithClientVault(
        userId,
        password,
        currentDeviceId,
        currentDevice
      );

      if (vaultResult.success && vaultResult.user && vaultResult.token) {
        persistSession(vaultResult.token, vaultResult.user);
        return {
          success: true,
          code: 'SUCCESS',
          user: vaultResult.user,
        };
      }

      return {
        success: false,
        code: vaultResult.code,
        requiresApproval: (vaultResult as any).requiresApproval,
        name: (vaultResult as any).name,
        error: (vaultResult as any).error,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'ERROR',
        error: err.message || 'Authentication error',
      };
    }
  };

  const loginWithBiometric = async (adminId = '24MIC7312'): Promise<LoginResult> => {
    try {
      const currentDeviceId = await getTrustedDeviceId();
      const currentDevice = captureClientDeviceInfo(currentDeviceId);

      // Attempt server authentication first
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: adminId.trim(),
            biometricVerified: true,
            deviceId: currentDeviceId,
            deviceInfo: currentDevice,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (isJson) {
          const data = await res.json();
          if (res.ok && data.success) {
            persistSession(data.token, data.user);
            return { success: true, code: 'SUCCESS', user: data.user };
          }
          return {
            success: false,
            code: data.code || 'ERROR',
            error: data.error || 'Biometric authentication failed on server',
          };
        }
      } catch {}

      // Fallback to client vault biometric login
      const vaultRes = await authenticateBiometricWithVault(adminId, currentDeviceId);
      if (vaultRes.success && vaultRes.user && vaultRes.token) {
        persistSession(vaultRes.token, vaultRes.user);
        return { success: true, code: 'SUCCESS', user: vaultRes.user };
      }

      return {
        success: false,
        code: 'ERROR',
        error: (vaultRes as any).error || 'Biometric authentication failed',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'ERROR',
        error: err.message || 'Biometric authentication error',
      };
    }
  };

  const requestDeviceApproval = async (userId: string, name: string) => {
    try {
      const currentDeviceId = await getTrustedDeviceId();
      const currentDevice = captureClientDeviceInfo(currentDeviceId);

      try {
        const res = await fetch('/api/auth/request-device-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId.trim(),
            name: name.trim(),
            deviceId: currentDeviceId,
            deviceInfo: currentDevice,
          }),
        });

        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (isJson) {
          const data = await res.json();
          if (res.ok && data.success) {
            return { success: true, status: data.status, name: data.name };
          }
        }
      } catch {}

      // Fallback to client vault request
      return requestDeviceApprovalInVault(userId, name, currentDeviceId, currentDevice);
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const checkDeviceStatus = async (userId: string): Promise<DeviceStatusResult> => {
    try {
      const currentDeviceId = await getTrustedDeviceId();

      try {
        const res = await fetch('/api/auth/check-device-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId.trim(),
            deviceId: currentDeviceId,
          }),
        });

        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (isJson) {
          const data = await res.json();
          if (res.ok) {
            if (data.status === 'approved' && data.token && data.user) {
              persistSession(data.token, data.user);
            }
            return {
              status: data.status,
              name: data.name,
              token: data.token,
              user: data.user,
            };
          }
        }
      } catch {}

      // Fallback to client vault
      const vaultCheck = checkDeviceStatusInVault(userId, currentDeviceId);
      if (vaultCheck.status === 'approved' && (vaultCheck as any).token && (vaultCheck as any).user) {
        persistSession((vaultCheck as any).token, (vaultCheck as any).user);
      }
      return vaultCheck as DeviceStatusResult;
    } catch (err: any) {
      return { status: 'unknown', error: err.message };
    }
  };


  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.warn('Logout request error:', e);
    } finally {
      clearTokens();
    }
  };

  const refreshSession = async () => {
    if (token) {
      await verifyToken(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isAdmin: user?.role === 'admin',
        isLoading,
        deviceInfo,
        login,
        loginWithBiometric,
        requestDeviceApproval,
        checkDeviceStatus,
        securityAlert,
        clearSecurityAlert,
        registerFailedAttempt,
        resetFailedAttempts,
        logout,
        logoutWithReason,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
