/**
 * MediaForge Client-Side Security Vault
 * Provides offline/static cryptographic authentication via Web Crypto API (SHA-256).
 * Handles static hosting environments (such as GitHub Pages) where no backend Node server is running.
 */

import { ClientDeviceInfo } from './deviceFingerprint';

declare const __MEDIAFORGE_AUTH_VAULT__: SecurityVaultConfig | undefined;

export interface VaultUser {
  id: string;
  passwordHash: string;
  name?: string;
}

export interface SecurityVaultConfig {
  adminId: string;
  adminPasswordHash: string;
  users: Record<string, VaultUser>;
}

// Fallback hashes loaded if build-time variable is not present
const DEFAULT_VAULT: SecurityVaultConfig = {
  adminId: '24MIC7312',
  adminPasswordHash: '3e94644ab2465fa603d3018413e090e7be31c99c8d77d7f6da2684117d321c33',
  users: {
    '7287954409': {
      id: '7287954409',
      passwordHash: '3289a38986bf24475396fef339666851b02204341644c41bba5aae7c0de48ab3',
      name: 'User 7287954409',
    },
    '7093340881': {
      id: '7093340881',
      passwordHash: 'f9ebea1dcd4d81193c58560292fd07f874b33c51ee5f3922ba44debaf1d40c18',
      name: 'User 7093340881',
    },
    '9618197585': {
      id: '9618197585',
      passwordHash: 'd1c46a8408f7b745d0808d5d7963cc1bfcd2456486013bb11df3566ffcc60210',
      name: 'User 9618197585',
    },
    '9676410015': {
      id: '9676410015',
      passwordHash: 'd8630d43a4b5a9589432074ffc2be811550ea1c3640b5577d095193a520df6fa',
      name: 'User 9676410015',
    },
    '6281394149': {
      id: '6281394149',
      passwordHash: '891bb62a83bf5568a4cea58531f88158a166756f9f11e76bae1fd00227e99ede',
      name: 'User 6281394149',
    },
  },
};

const LOCAL_STORE_KEY = 'mediaforge_client_security_db_v2';
const EXTRA_USERS_KEY = 'mediaforge_client_extra_users_v2';

export interface StoredDevice {
  deviceId: string;
  userId: string;
  friendlyName: string;
  deviceType: string;
  os: string;
  browser: string;
  status: 'approved' | 'rejected' | 'revoked' | 'pending';
  submittedName: string;
  createdAt: string;
  lastLogin: string;
}

export interface StoredDeviceRequest {
  requestId: string;
  userId: string;
  name: string;
  deviceId: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  friendlyName: string;
  requestTime: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ClientSecurityDB {
  devices: Record<string, StoredDevice>;
  deviceRequests: StoredDeviceRequest[];
  auditLogs: Array<{
    id: string;
    timestamp: string;
    action: string;
    userId: string;
    deviceId: string;
    details: string;
    status: 'SUCCESS' | 'BLOCKED' | 'WARNING';
  }>;
}

/**
 * Computes standard SHA-256 hex string using browser Web Crypto API
 */
export async function computeClientSha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns active vault config
 */
export function getActiveVault(): SecurityVaultConfig {
  let baseVault = DEFAULT_VAULT;
  if (typeof __MEDIAFORGE_AUTH_VAULT__ !== 'undefined' && __MEDIAFORGE_AUTH_VAULT__?.adminId) {
    baseVault = __MEDIAFORGE_AUTH_VAULT__;
  }

  // Merge extra users created dynamically by admin in client mode
  try {
    const rawExtra = localStorage.getItem(EXTRA_USERS_KEY);
    if (rawExtra) {
      const extra = JSON.parse(rawExtra);
      return {
        ...baseVault,
        users: { ...baseVault.users, ...extra },
      };
    }
  } catch {}

  return baseVault;
}

function getLocalDB(): ClientSecurityDB {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    devices: {},
    deviceRequests: [],
    auditLogs: [],
  };
}

function saveLocalDB(db: ClientSecurityDB) {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to save security DB in localStorage', e);
  }
}

/**
 * Authenticate credentials against client cryptographic vault
 */
export async function authenticateWithClientVault(
  userIdInput: string,
  passwordInput: string,
  deviceId: string,
  deviceInfo: ClientDeviceInfo
) {
  const vault = getActiveVault();
  const trimmedId = userIdInput.trim();
  const passwordHash = await computeClientSha256(passwordInput);

  // 1. Check Administrator
  if (trimmedId.toLowerCase() === vault.adminId.toLowerCase()) {
    if (passwordHash === vault.adminPasswordHash) {
      // Record audit
      logAuditEvent('ADMIN_LOGIN_SUCCESS', trimmedId, deviceId, 'Administrator signed in via client vault', 'SUCCESS');
      return {
        success: true,
        code: 'SUCCESS' as const,
        user: {
          userId: vault.adminId,
          name: 'Administrator',
          role: 'admin' as const,
        },
        token: `vault_admin_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      };
    } else {
      logAuditEvent('ADMIN_LOGIN_FAILED', trimmedId, deviceId, 'Invalid admin password attempt', 'BLOCKED');
      return {
        success: false,
        code: 'INVALID_CREDENTIALS' as const,
        error: 'Invalid Administrator ID or password.',
      };
    }
  }

  // 2. Check Authorized Users
  const matchedUser = vault.users[trimmedId];
  if (!matchedUser || matchedUser.passwordHash !== passwordHash) {
    logAuditEvent('USER_LOGIN_FAILED', trimmedId, deviceId, 'Invalid user credentials', 'BLOCKED');
    return {
      success: false,
      code: 'INVALID_CREDENTIALS' as const,
      error: 'Invalid User ID or password.',
    };
  }

  // 3. Device Approval Check for User
  const db = getLocalDB();
  const deviceKey = `${trimmedId}_${deviceId}`;
  const existingDevice = db.devices[deviceKey];

  if (!existingDevice) {
    // Check if user already has 2 approved devices
    const approvedDevices = Object.values(db.devices).filter(
      (d) => d.userId === trimmedId && d.status === 'approved'
    );
    if (approvedDevices.length >= 2) {
      return {
        success: false,
        code: 'DEVICE_LIMIT_REACHED' as const,
        error: 'Maximum 2 devices limit reached. Contact administrator.',
      };
    }

    // Check if a request is already pending
    const existingReq = db.deviceRequests.find(
      (r) => r.userId === trimmedId && r.deviceId === deviceId && r.status === 'pending'
    );
    if (existingReq) {
      return {
        success: false,
        code: 'APPROVAL_PENDING' as const,
        name: existingReq.name,
      };
    }

    return {
      success: false,
      code: 'NEW_DEVICE_DETECTED' as const,
      requiresApproval: true,
    };
  }

  if (existingDevice.status === 'revoked') {
    return {
      success: false,
      code: 'DEVICE_REVOKED' as const,
      error: 'Access from this device has been revoked by the administrator.',
    };
  }

  if (existingDevice.status === 'rejected') {
    return {
      success: false,
      code: 'DEVICE_REJECTED' as const,
      error: 'Device request was rejected by the administrator.',
    };
  }

  if (existingDevice.status === 'pending') {
    return {
      success: false,
      code: 'APPROVAL_PENDING' as const,
      name: existingDevice.submittedName,
    };
  }

  // Approved!
  existingDevice.lastLogin = new Date().toLocaleString();
  saveLocalDB(db);
  logAuditEvent('USER_LOGIN_SUCCESS', trimmedId, deviceId, 'User authenticated on approved device', 'SUCCESS');

  return {
    success: true,
    code: 'SUCCESS' as const,
    user: {
      userId: matchedUser.id,
      name: existingDevice.submittedName || matchedUser.name || `User ${matchedUser.id}`,
      role: 'user' as const,
    },
    token: `vault_user_${trimmedId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  };
}

/**
 * Biometric authentication via client vault
 */
export async function authenticateBiometricWithVault(adminId = '24MIC7312', deviceId: string) {
  const vault = getActiveVault();
  if (adminId.trim().toLowerCase() === vault.adminId.toLowerCase()) {
    logAuditEvent('ADMIN_BIOMETRIC_SUCCESS', adminId, deviceId, 'Administrator signed in via Biometrics', 'SUCCESS');
    return {
      success: true,
      code: 'SUCCESS' as const,
      user: {
        userId: vault.adminId,
        name: 'Administrator',
        role: 'admin' as const,
      },
      token: `vault_admin_bio_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
  }
  return {
    success: false,
    code: 'ERROR' as const,
    error: 'Unauthorized administrator ID for biometric login',
  };
}

/**
 * Request device approval in client vault
 */
export function requestDeviceApprovalInVault(
  userId: string,
  name: string,
  deviceId: string,
  deviceInfo: ClientDeviceInfo
) {
  const db = getLocalDB();
  const trimmedId = userId.trim();
  const trimmedName = name.trim();

  // Check if pending request exists
  const pending = db.deviceRequests.find(
    (r) => r.userId === trimmedId && r.deviceId === deviceId && r.status === 'pending'
  );

  if (!pending) {
    db.deviceRequests.unshift({
      requestId: `req_${Date.now().toString(36)}`,
      userId: trimmedId,
      name: trimmedName,
      deviceId,
      deviceType: deviceInfo.deviceType,
      operatingSystem: deviceInfo.os,
      browser: deviceInfo.browser,
      friendlyName: deviceInfo.friendlyName,
      requestTime: new Date().toLocaleString(),
      status: 'pending',
    });
  }

  // Also add to devices table as pending
  const deviceKey = `${trimmedId}_${deviceId}`;
  if (!db.devices[deviceKey]) {
    db.devices[deviceKey] = {
      deviceId,
      userId: trimmedId,
      friendlyName: deviceInfo.friendlyName,
      deviceType: deviceInfo.deviceType,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      status: 'pending',
      submittedName: trimmedName,
      createdAt: new Date().toLocaleString(),
      lastLogin: new Date().toLocaleString(),
    };
  }

  saveLocalDB(db);
  logAuditEvent('DEVICE_APPROVAL_REQUESTED', trimmedId, deviceId, `Device approval requested by ${trimmedName}`, 'WARNING');

  return {
    success: true,
    status: 'pending',
    name: trimmedName,
  };
}

/**
 * Check device status in client vault
 */
export function checkDeviceStatusInVault(userId: string, deviceId: string) {
  const db = getLocalDB();
  const trimmedId = userId.trim();
  const deviceKey = `${trimmedId}_${deviceId}`;
  const dev = db.devices[deviceKey];

  if (!dev) {
    return { status: 'unknown' as const };
  }

  if (dev.status === 'approved') {
    const vault = getActiveVault();
    const matchedUser = vault.users[trimmedId];
    return {
      status: 'approved' as const,
      name: dev.submittedName,
      token: `vault_user_${trimmedId}_${Date.now()}`,
      user: {
        userId: trimmedId,
        name: dev.submittedName || matchedUser?.name || `User ${trimmedId}`,
        role: 'user' as const,
      },
    };
  }

  return {
    status: dev.status,
    name: dev.submittedName,
  };
}

/**
 * Admin: Add a user dynamically in client mode
 */
export async function addVaultUser(userId: string, plainPass: string, name?: string) {
  const trimmedId = userId.trim();
  const hash = await computeClientSha256(plainPass);
  let extraUsers: Record<string, VaultUser> = {};

  try {
    const raw = localStorage.getItem(EXTRA_USERS_KEY);
    if (raw) extraUsers = JSON.parse(raw);
  } catch {}

  extraUsers[trimmedId] = {
    id: trimmedId,
    passwordHash: hash,
    name: name?.trim() || `User ${trimmedId}`,
  };

  localStorage.setItem(EXTRA_USERS_KEY, JSON.stringify(extraUsers));
  logAuditEvent('ADMIN_USER_CREATED', trimmedId, 'LOCAL', `User ${trimmedId} added to client vault`, 'SUCCESS');
  return { success: true, userId: trimmedId, passwordHash: hash };
}

/**
 * Admin: Fetch devices & requests in client vault
 */
export function getVaultAdminData() {
  const db = getLocalDB();
  const vault = getActiveVault();
  return {
    users: Object.values(vault.users).map((u) => ({
      userId: u.id,
      registeredName: u.name || `User ${u.id}`,
    })),
    devices: Object.values(db.devices),
    deviceRequests: db.deviceRequests,
    auditLogs: db.auditLogs,
  };
}

/**
 * Admin: Approve, Reject, or Revoke device in client vault
 */
export function setVaultDeviceStatus(
  userId: string,
  deviceId: string,
  status: 'approved' | 'rejected' | 'revoked',
  passkey?: string
) {
  if (status === 'approved' && passkey && passkey.trim() !== '630211') {
    throw new Error('Invalid Admin Passkey. Expected 630211.');
  }
  const db = getLocalDB();
  const deviceKey = `${userId}_${deviceId}`;

  if (db.devices[deviceKey]) {
    db.devices[deviceKey].status = status;
  }

  // Update requests
  db.deviceRequests.forEach((req) => {
    if (req.userId === userId && req.deviceId === deviceId) {
      req.status = status === 'approved' ? 'approved' : 'rejected';
    }
  });

  saveLocalDB(db);
  logAuditEvent('DEVICE_STATUS_CHANGED', userId, deviceId, `Device set to ${status}${passkey ? ' (Passkey 630211 Verified)' : ''}`, 'SUCCESS');
  return { success: true, status };
}

function logAuditEvent(
  action: string,
  userId: string,
  deviceId: string,
  details: string,
  status: 'SUCCESS' | 'BLOCKED' | 'WARNING'
) {
  try {
    const db = getLocalDB();
    db.auditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleString(),
      action,
      userId,
      deviceId,
      details,
      status,
    });
    if (db.auditLogs.length > 100) {
      db.auditLogs = db.auditLogs.slice(0, 100);
    }
    saveLocalDB(db);
  } catch {}
}

