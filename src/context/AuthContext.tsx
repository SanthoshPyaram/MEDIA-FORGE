import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  captureClientDeviceInfo,
  getTrustedDeviceId,
  ClientDeviceInfo,
} from '@/utils/deviceFingerprint';

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
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'mediaforge_auth_session_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<ClientDeviceInfo>(() => captureClientDeviceInfo());

  // Initialize Trusted Device ID and verify existing session
  useEffect(() => {
    async function initDevice() {
      const trustedId = await getTrustedDeviceId();
      const updatedInfo = captureClientDeviceInfo(trustedId);
      setDeviceInfo(updatedInfo);

      const savedToken =
        sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);

      if (savedToken) {
        await verifyToken(savedToken);
      } else {
        setIsLoading(false);
      }
    }
    initDevice();
  }, []);

  const verifyToken = async (jwtToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.user) {
          setUser(data.user);
          setToken(jwtToken);
        } else {
          clearTokens();
        }
      } else {
        clearTokens();
      }
    } catch {
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const clearTokens = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const login = async (userId: string, password: string): Promise<LoginResult> => {
    try {
      const currentDeviceId = await getTrustedDeviceId();
      const currentDevice = captureClientDeviceInfo(currentDeviceId);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          password,
          deviceId: currentDeviceId,
          deviceInfo: currentDevice,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
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
    } catch (err: any) {
      return {
        success: false,
        code: 'ERROR',
        error: err.message || 'Connection error with security server',
      };
    }
  };

  const loginWithBiometric = async (adminId = '24MIC7312'): Promise<LoginResult> => {
    try {
      const currentDeviceId = await getTrustedDeviceId();
      const currentDevice = captureClientDeviceInfo(currentDeviceId);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminId.trim(),
          biometricVerified: true,
          deviceId: currentDeviceId,
          deviceInfo: currentDevice,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        return { success: true, code: 'SUCCESS', user: data.user };
      }

      return {
        success: false,
        code: data.code || 'ERROR',
        error: data.error || 'Biometric authentication failed on server',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'ERROR',
        error: err.message || 'Connection error',
      };
    }
  };

  const requestDeviceApproval = async (userId: string, name: string) => {
    try {
      const currentDeviceId = await getTrustedDeviceId();
      const currentDevice = captureClientDeviceInfo(currentDeviceId);

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

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, status: data.status, name: data.name };
      }
      return { success: false, error: data.error || 'Failed to submit request' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const checkDeviceStatus = async (userId: string): Promise<DeviceStatusResult> => {
    try {
      const currentDeviceId = await getTrustedDeviceId();
      const res = await fetch('/api/auth/check-device-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          deviceId: currentDeviceId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.status === 'approved' && data.token && data.user) {
          setUser(data.user);
          setToken(data.token);
          sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }
        return {
          status: data.status,
          name: data.name,
          token: data.token,
          user: data.user,
        };
      }
      return { status: 'unknown', error: data.error };
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
        logout,
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
