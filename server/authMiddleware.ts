import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserCredential {
  id: string;
  passwordHash: string;
  role: 'admin' | 'user';
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'Desktop' | 'Laptop' | 'Tablet' | 'Mobile' | 'Unknown';
  os: string;
  browser: string;
  friendlyName: string;
  screen?: string;
  platform?: string;
  language?: string;
}

export interface ActiveSession {
  token: string;
  userId: string;
  name: string;
  role: 'admin' | 'user';
  deviceId: string;
  deviceType: string;
  friendlyName: string;
  os: string;
  browser: string;
  loginTime: string;
  lastActive: string;
}

export interface DeviceRecord {
  deviceId: string;
  userId: string;
  friendlyName: string;
  deviceType: string;
  os: string;
  browser: string;
  screen?: string;
  status: 'approved' | 'revoked' | 'rejected' | 'pending';
  submittedName: string;
  createdAt: string;
  lastLogin: string;
}

export interface DeviceApprovalRequest {
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

export interface LoginHistoryRecord {
  id: string;
  time: string;
  userId: string;
  name: string;
  device: string;
  browser: string;
  os: string;
  deviceId: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'PENDING' | 'REVOKED';
  reason: string;
}

export interface SecurityEventRecord {
  id: string;
  eventType:
    | 'New device detected'
    | 'Name submitted'
    | 'Approval requested'
    | 'Device approved'
    | 'Device rejected'
    | 'Device revoked'
    | 'Successful login'
    | 'Invalid password'
    | 'Blocked login'
    | 'Device limit reached'
    | 'Logout';
  userId: string;
  name: string;
  device: string;
  deviceId: string;
  time: string;
  details: string;
}

export interface SecurityDatabase {
  users: Record<string, { userId: string; registeredName?: string }>;
  devices: Record<string, DeviceRecord>; // composite key `${userId.toLowerCase()}_${deviceId}`
  deviceRequests: DeviceApprovalRequest[];
  loginHistory: LoginHistoryRecord[];
  securityEvents: SecurityEventRecord[];
  activeSessions: Record<string, ActiveSession>;
}

// -------------------------------------------------------------
// Helper: Load Credentials from .env
// -------------------------------------------------------------
function loadEnvCredentials(rootDir: string): {
  admin: UserCredential & { name: string };
  users: UserCredential[];
  authSecret: string;
} {
  const envPath = path.resolve(rootDir, '.env');
  const envVars: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        envVars[key] = val;
      }
    }
  }

  const authSecret = envVars['AUTH_SECRET'] || 'mediaforge_default_session_secret_2026_fallback';

  const adminId = (envVars['ADMIN_ID'] || 'ADMIN001').trim();
  const adminPass = envVars['ADMIN_PASSWORD_HASH'] || envVars['ADMIN_PASSWORD'] || 'aa163422e098f8a463b38e5dedbe08d133d48fac0a8693582a48d3db59cd2a06';
  const admin: UserCredential & { name: string } = {
    id: adminId,
    passwordHash: adminPass,
    name: 'Super Administrator',
    role: 'admin',
  };

  const users: UserCredential[] = [];
  const userIndices = new Set<number>();
  for (const key of Object.keys(envVars)) {
    const match = key.match(/^USER_(\d+)_ID$/);
    if (match) {
      userIndices.add(parseInt(match[1], 10));
    }
  }
  const maxIndex = userIndices.size > 0 ? Math.max(5, ...Array.from(userIndices)) : 5;
  for (let i = 1; i <= maxIndex; i++) {
    const id = (envVars[`USER_${i}_ID`] || '').trim();
    if (id) {
      const passHash = envVars[`USER_${i}_PASSWORD_HASH`] || envVars[`USER_${i}_PASSWORD`] || '';
      users.push({
        id,
        passwordHash: passHash,
        role: 'user',
      });
    }
  }

  return { admin, users, authSecret };
}

// -------------------------------------------------------------
// Helper: Add New User to .env with Auto SHA-256 Hashed Password
// -------------------------------------------------------------
function addUserToEnv(
  rootDir: string,
  userId: string,
  passwordPlain: string
): { success: boolean; userIndex: number; error?: string } {
  const envPath = path.resolve(rootDir, '.env');
  let raw = '';
  if (fs.existsSync(envPath)) {
    raw = fs.readFileSync(envPath, 'utf8');
  }

  // Check if userId already exists
  const lines = raw.split(/\r?\n/);
  const userIndices: number[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^USER_(\d+)_ID\s*=\s*(.*)$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      userIndices.push(idx);
      const existingId = match[2].trim().replace(/^["']|["']$/g, '');
      if (existingId.toLowerCase() === userId.trim().toLowerCase()) {
        return {
          success: false,
          userIndex: idx,
          error: `User ID "${userId}" already exists in .env configuration.`,
        };
      }
    }
  }

  // Determine next index
  const nextIdx = userIndices.length > 0 ? Math.max(...userIndices) + 1 : 1;

  // Compute SHA-256 hash
  const hash = crypto.createHash('sha256').update(passwordPlain.trim()).digest('hex');

  // Format entry
  const newEntry = `\n# User ${nextIdx}\nUSER_${nextIdx}_ID=${userId.trim()}\nUSER_${nextIdx}_PASSWORD_HASH=${hash}\n`;

  // Append cleanly
  const updatedContent = raw.endsWith('\n') ? raw + newEntry.trimStart() : raw + '\n' + newEntry.trimStart();
  fs.writeFileSync(envPath, updatedContent, 'utf8');

  return { success: true, userIndex: nextIdx };
}


// -------------------------------------------------------------
// Helper: Check Password against Stored Hash or Plaintext
// -------------------------------------------------------------
function verifyPassword(entered: string, storedHashOrPass: string): boolean {
  if (!storedHashOrPass) return false;
  const sha256 = crypto.createHash('sha256').update(entered).digest('hex');
  if (sha256.toLowerCase() === storedHashOrPass.toLowerCase()) {
    return true;
  }
  // Allow direct comparison if developer entered plaintext in .env
  return entered === storedHashOrPass;
}

// -------------------------------------------------------------
// Helper: Format Readable Timestamp
// -------------------------------------------------------------
function formatReadableTime(date: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');

  return `${day} ${month} ${year} ${formattedHours}:${minutes} ${ampm}`;
}

// -------------------------------------------------------------
// Helper: Friendly Device Name Formatter
// -------------------------------------------------------------
function getFriendlyDeviceName(os: string, deviceType: string): string {
  if (os.includes('Android')) return deviceType === 'Tablet' ? 'Android Tablet' : 'Android Phone';
  if (os.includes('iOS') || os.includes('iPhone')) return 'iPhone';
  if (os.includes('iPad')) return 'iPad';
  if (os.includes('macOS')) return deviceType === 'Laptop' ? 'MacBook' : 'Mac Desktop';
  if (os.includes('Windows')) return deviceType === 'Laptop' ? 'Windows Laptop' : 'Windows Desktop';
  if (os.includes('Linux')) return deviceType === 'Laptop' ? 'Linux Laptop' : 'Linux PC';
  return `${os} ${deviceType}`.trim();
}

// -------------------------------------------------------------
// Persistent Storage Manager
// -------------------------------------------------------------
class SecurityDBManager {
  private dbPath: string;
  private db: SecurityDatabase;

  constructor(rootDir: string) {
    const dataDir = path.resolve(rootDir, 'server_data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.dbPath = path.resolve(dataDir, 'security_db.json');
    this.db = this.load();
  }

  private load(): SecurityDatabase {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || {},
          devices: parsed.devices || {},
          deviceRequests: parsed.deviceRequests || [],
          loginHistory: parsed.loginHistory || [],
          securityEvents: parsed.securityEvents || [],
          activeSessions: parsed.activeSessions || {},
        };
      } catch (err) {
        console.error('[SecurityDB] Error loading database file:', err);
      }
    }
    return {
      users: {},
      devices: {},
      deviceRequests: [],
      loginHistory: [],
      securityEvents: [],
      activeSessions: {},
    };
  }

  public save(): void {
    try {
      const data = JSON.stringify(this.db, null, 2);
      fs.writeFileSync(this.dbPath, data, 'utf8');
    } catch (err) {
      console.error('[SecurityDB] Error writing database file:', err);
    }
  }

  public getDB(): SecurityDatabase {
    return this.db;
  }

  public getDeviceKey(userId: string, deviceId: string): string {
    return `${userId.trim().toLowerCase()}_${deviceId.trim()}`;
  }

  public getApprovedDevicesCount(userId: string): number {
    const uId = userId.trim().toLowerCase();
    let count = 0;
    for (const dev of Object.values(this.db.devices)) {
      if (dev.userId.toLowerCase() === uId && dev.status === 'approved') {
        count++;
      }
    }
    return count;
  }

  public recordLoginHistory(
    userId: string,
    name: string,
    device: string,
    browser: string,
    os: string,
    deviceId: string,
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'PENDING' | 'REVOKED',
    reason: string
  ): void {
    const record: LoginHistoryRecord = {
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      time: formatReadableTime(),
      userId,
      name: name || 'Unknown',
      device: device || 'Unknown Device',
      browser: browser || 'Unknown',
      os: os || 'Unknown',
      deviceId: deviceId || 'Unknown',
      status,
      reason,
    };
    this.db.loginHistory.unshift(record);
    if (this.db.loginHistory.length > 2000) {
      this.db.loginHistory.length = 2000;
    }
    this.save();
  }

  public recordSecurityEvent(
    eventType: SecurityEventRecord['eventType'],
    userId: string,
    name: string,
    device: string,
    deviceId: string,
    details: string
  ): void {
    const event: SecurityEventRecord = {
      id: 'sec_' + crypto.randomBytes(6).toString('hex'),
      eventType,
      userId,
      name: name || 'Unknown',
      device: device || 'Unknown Device',
      deviceId: deviceId || 'Unknown',
      time: formatReadableTime(),
      details,
    };
    this.db.securityEvents.unshift(event);
    if (this.db.securityEvents.length > 2000) {
      this.db.securityEvents.length = 2000;
    }
    this.save();
  }
}

// -------------------------------------------------------------
// Auth Middleware Factory
// -------------------------------------------------------------
export function createAuthMiddleware(rootDir: string) {
  const dbManager = new SecurityDBManager(rootDir);

  return function authMiddleware(req: any, res: any, next: any) {
    const url = req.url ? req.url.split('?')[0] : '';

    if (!url.startsWith('/api/auth/') && !url.startsWith('/api/admin/')) {
      return next();
    }

    const { admin, users, authSecret } = loadEnvCredentials(rootDir);
    const db = dbManager.getDB();

    // Helper: Send JSON response
    const sendJson = (status: number, data: any) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };

    // Helper: Read JSON body
    const parseBody = (callback: (body: any) => void) => {
      let bodyStr = '';
      req.on('data', (chunk: any) => {
        bodyStr += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = bodyStr ? JSON.parse(bodyStr) : {};
          callback(parsed);
        } catch (err) {
          sendJson(400, { error: 'Invalid JSON payload' });
        }
      });
    };

    // Helper: Authenticate Bearer token
    const authenticateToken = (): ActiveSession | null => {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
      const token = authHeader.slice(7).trim();
      const session = db.activeSessions[token];
      if (!session) return null;

      // Check if user's device was revoked while session was active
      if (session.role === 'user') {
        const key = dbManager.getDeviceKey(session.userId, session.deviceId);
        const dev = db.devices[key];
        if (dev && dev.status === 'revoked') {
          delete db.activeSessions[token];
          dbManager.save();
          return null;
        }
      }

      session.lastActive = formatReadableTime();
      dbManager.save();
      return session;
    };

    // =========================================================================
    // 1. POST /api/auth/login
    // =========================================================================
    if (url === '/api/auth/login' && req.method === 'POST') {
      parseBody((body) => {
        const userId = (body.userId || '').trim();
        const password = body.password || '';
        const deviceId = (body.deviceId || '').trim();
        const deviceInfo = body.deviceInfo || {};
        const deviceType = deviceInfo.deviceType || 'Laptop';
        const os = deviceInfo.os || 'Windows';
        const browser = deviceInfo.browser || 'Chrome';
        const friendlyName =
          deviceInfo.friendlyName || getFriendlyDeviceName(os, deviceType);

        const isBiometric = Boolean(body.biometricVerified);

        if (!userId || (!password && !isBiometric)) {
          return sendJson(400, {
            success: false,
            code: 'MISSING_FIELDS',
            error: 'User ID and Password are required',
          });
        }

        const normalizedInputId = userId.toLowerCase();

        // 1. Check if Admin
        if (normalizedInputId === admin.id.toLowerCase() || normalizedInputId === 'admin') {
          if (!isBiometric && !verifyPassword(password, admin.passwordHash)) {
            dbManager.recordSecurityEvent(
              'Invalid password',
              admin.id,
              admin.name,
              friendlyName,
              deviceId,
              'Failed password entry for Administrator'
            );
            dbManager.recordLoginHistory(
              admin.id,
              admin.name,
              friendlyName,
              browser,
              os,
              deviceId,
              'FAILED',
              'Invalid Password'
            );
            return sendJson(401, {
              success: false,
              code: 'INVALID_CREDENTIALS',
              error: '❌ Invalid ID or password.',
            });
          }

          // Admin authenticated successfully
          const token = crypto.randomBytes(32).toString('hex');
          const session: ActiveSession = {
            token,
            userId: admin.id,
            name: admin.name,
            role: 'admin',
            deviceId: deviceId || 'admin-console',
            deviceType: 'Desktop',
            friendlyName: 'Admin Workstation',
            os,
            browser,
            loginTime: formatReadableTime(),
            lastActive: formatReadableTime(),
          };
          db.activeSessions[token] = session;
          dbManager.save();

          dbManager.recordSecurityEvent(
            'Successful login',
            admin.id,
            admin.name,
            friendlyName,
            deviceId,
            'Administrator logged into security control center'
          );
          dbManager.recordLoginHistory(
            admin.id,
            admin.name,
            friendlyName,
            browser,
            os,
            deviceId,
            'SUCCESS',
            'Admin Authentication'
          );

          return sendJson(200, {
            success: true,
            token,
            user: {
              userId: admin.id,
              name: admin.name,
              role: 'admin',
            },
          });
        }

        // 2. Check 5 Registered Users
        const matchedUser = users.find(
          (u) => u.id.toLowerCase() === normalizedInputId
        );

        if (!matchedUser) {
          dbManager.recordSecurityEvent(
            'Invalid password',
            userId,
            'Unknown',
            friendlyName,
            deviceId,
            `Login attempt for unknown User ID: ${userId}`
          );
          dbManager.recordLoginHistory(
            userId,
            'Unknown',
            friendlyName,
            browser,
            os,
            deviceId,
            'FAILED',
            'Invalid ID or password'
          );
          return sendJson(401, {
            success: false,
            code: 'INVALID_CREDENTIALS',
            error: '❌ Invalid ID or password.',
          });
        }

        // Check user's password
        if (!verifyPassword(password, matchedUser.passwordHash)) {
          const registeredName = db.users[matchedUser.id]?.registeredName || 'User';
          dbManager.recordSecurityEvent(
            'Invalid password',
            matchedUser.id,
            registeredName,
            friendlyName,
            deviceId,
            `Failed password entry for user ${matchedUser.id}`
          );
          dbManager.recordLoginHistory(
            matchedUser.id,
            registeredName,
            friendlyName,
            browser,
            os,
            deviceId,
            'FAILED',
            'Invalid Password'
          );
          return sendJson(401, {
            success: false,
            code: 'INVALID_CREDENTIALS',
            error: '❌ Invalid ID or password.',
          });
        }

        // =====================================================================
        // Credentials are CORRECT. Now check Device Authorization status!
        // =====================================================================
        const deviceKey = dbManager.getDeviceKey(matchedUser.id, deviceId);
        const deviceRecord = db.devices[deviceKey];

        // Case A: Device is Known and REVOKED
        if (deviceRecord && deviceRecord.status === 'revoked') {
          const name = deviceRecord.submittedName || db.users[matchedUser.id]?.registeredName || 'User';
          dbManager.recordSecurityEvent(
            'Blocked login',
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            deviceId,
            'Access attempted from revoked device'
          );
          dbManager.recordLoginHistory(
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            browser,
            os,
            deviceId,
            'BLOCKED',
            'Device Revoked'
          );
          return sendJson(403, {
            success: false,
            code: 'DEVICE_REVOKED',
            error: 'Access from this device has been revoked by the administrator.',
          });
        }

        // Case B: Device is Known and REJECTED
        if (deviceRecord && deviceRecord.status === 'rejected') {
          const name = deviceRecord.submittedName || db.users[matchedUser.id]?.registeredName || 'User';
          dbManager.recordSecurityEvent(
            'Blocked login',
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            deviceId,
            'Access attempted from rejected device request'
          );
          dbManager.recordLoginHistory(
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            browser,
            os,
            deviceId,
            'BLOCKED',
            'Device Request Rejected'
          );
          return sendJson(403, {
            success: false,
            code: 'DEVICE_REJECTED',
            error: 'Your device request was rejected.',
          });
        }

        // Case C: Device is Known and PENDING
        if (deviceRecord && deviceRecord.status === 'pending') {
          const name = deviceRecord.submittedName || 'User';
          dbManager.recordSecurityEvent(
            'Blocked login',
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            deviceId,
            'Login blocked: Device waiting for administrator approval'
          );
          dbManager.recordLoginHistory(
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            browser,
            os,
            deviceId,
            'BLOCKED',
            'Device Pending Approval'
          );
          return sendJson(403, {
            success: false,
            code: 'APPROVAL_PENDING',
            name,
            error: 'Waiting for administrator approval.',
          });
        }

        // Case D: Device is Known and APPROVED -> LOGIN SUCCESS!
        if (deviceRecord && deviceRecord.status === 'approved') {
          const name =
            db.users[matchedUser.id]?.registeredName ||
            deviceRecord.submittedName ||
            'User';

          deviceRecord.lastLogin = formatReadableTime();
          const token = crypto.randomBytes(32).toString('hex');
          const session: ActiveSession = {
            token,
            userId: matchedUser.id,
            name,
            role: 'user',
            deviceId,
            deviceType: deviceRecord.deviceType || deviceType,
            friendlyName: deviceRecord.friendlyName || friendlyName,
            os: deviceRecord.os || os,
            browser: deviceRecord.browser || browser,
            loginTime: formatReadableTime(),
            lastActive: formatReadableTime(),
          };
          db.activeSessions[token] = session;
          dbManager.save();

          dbManager.recordSecurityEvent(
            'Successful login',
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            deviceId,
            'User logged in from trusted approved device'
          );
          dbManager.recordLoginHistory(
            matchedUser.id,
            name,
            deviceRecord.friendlyName || friendlyName,
            browser,
            os,
            deviceId,
            'SUCCESS',
            'Approved Device'
          );

          return sendJson(200, {
            success: true,
            token,
            user: {
              userId: matchedUser.id,
              name,
              role: 'user',
            },
          });
        }

        // Case E: Device is UNKNOWN!
        // Check maximum 2 devices limit
        const approvedCount = dbManager.getApprovedDevicesCount(matchedUser.id);

        if (approvedCount >= 2) {
          const name = db.users[matchedUser.id]?.registeredName || 'User';
          dbManager.recordSecurityEvent(
            'Device limit reached',
            matchedUser.id,
            name,
            friendlyName,
            deviceId,
            `Login blocked: 2 approved devices already reached for ${matchedUser.id}`
          );
          dbManager.recordSecurityEvent(
            'Blocked login',
            matchedUser.id,
            name,
            friendlyName,
            deviceId,
            'Device limit reached block'
          );
          dbManager.recordLoginHistory(
            matchedUser.id,
            name,
            friendlyName,
            browser,
            os,
            deviceId,
            'BLOCKED',
            'Device limit reached (max 2 approved devices)'
          );

          return sendJson(403, {
            success: false,
            code: 'DEVICE_LIMIT_REACHED',
            error:
              'Your account already has 2 approved devices. Ask the administrator to revoke an existing device before adding another.',
          });
        }

        // Unknown device and approvedCount < 2:
        // Prompt user to enter Name for administrator approval!
        const existingUserName = db.users[matchedUser.id]?.registeredName || '';
        dbManager.recordSecurityEvent(
          'New device detected',
          matchedUser.id,
          existingUserName || 'Unknown',
          friendlyName,
          deviceId,
          `New device detected for account ${matchedUser.id}`
        );
        dbManager.recordSecurityEvent(
          'Blocked login',
          matchedUser.id,
          existingUserName || 'Unknown',
          friendlyName,
          deviceId,
          'New device requires administrator approval'
        );
        dbManager.recordLoginHistory(
          matchedUser.id,
          existingUserName || 'Unknown',
          friendlyName,
          browser,
          os,
          deviceId,
          'BLOCKED',
          'New Device Approval Required'
        );

        return sendJson(403, {
          success: false,
          code: 'NEW_DEVICE_DETECTED',
          requiresApproval: true,
          message:
            'Your account has not been approved on this device yet. Please enter your name to request administrator approval.',
        });
      });
      return;
    }

    // =========================================================================
    // 2. POST /api/auth/request-device-approval
    // =========================================================================
    if (url === '/api/auth/request-device-approval' && req.method === 'POST') {
      parseBody((body) => {
        const userId = (body.userId || '').trim();
        const name = (body.name || '').trim();
        const deviceId = (body.deviceId || '').trim();
        const deviceInfo = body.deviceInfo || {};
        const deviceType = deviceInfo.deviceType || 'Laptop';
        const os = deviceInfo.os || 'Windows';
        const browser = deviceInfo.browser || 'Chrome';
        const friendlyName =
          deviceInfo.friendlyName || getFriendlyDeviceName(os, deviceType);

        if (!userId || !name || !deviceId) {
          return sendJson(400, {
            success: false,
            error: 'User ID, Name, and Device ID are required',
          });
        }

        // Check if 2 devices already approved
        const approvedCount = dbManager.getApprovedDevicesCount(userId);
        if (approvedCount >= 2) {
          dbManager.recordSecurityEvent(
            'Device limit reached',
            userId,
            name,
            friendlyName,
            deviceId,
            'Device approval request rejected: maximum 2 devices reached'
          );
          return sendJson(403, {
            success: false,
            code: 'DEVICE_LIMIT_REACHED',
            error:
              'Your account already has 2 approved devices. Ask the administrator to revoke an existing device before adding another.',
          });
        }

        const reqTime = formatReadableTime();
        const requestId = 'req_' + crypto.randomBytes(6).toString('hex');

        // Create pending request
        const requestObj: DeviceApprovalRequest = {
          requestId,
          userId,
          name,
          deviceId,
          deviceType,
          operatingSystem: os,
          browser,
          friendlyName,
          requestTime: reqTime,
          status: 'pending',
        };

        // Remove any prior pending request for the same device
        db.deviceRequests = db.deviceRequests.filter(
          (r) => !(r.userId.toLowerCase() === userId.toLowerCase() && r.deviceId === deviceId)
        );
        db.deviceRequests.unshift(requestObj);

        // Record in devices table as pending
        const deviceKey = dbManager.getDeviceKey(userId, deviceId);
        db.devices[deviceKey] = {
          deviceId,
          userId,
          friendlyName,
          deviceType,
          os,
          browser,
          screen: deviceInfo.screen || '',
          status: 'pending',
          submittedName: name,
          createdAt: reqTime,
          lastLogin: reqTime,
        };

        // Update / Seed user record with submitted name if not already set
        if (!db.users[userId]) {
          db.users[userId] = { userId, registeredName: name };
        } else if (!db.users[userId].registeredName) {
          db.users[userId].registeredName = name;
        }

        dbManager.save();

        dbManager.recordSecurityEvent(
          'Name submitted',
          userId,
          name,
          friendlyName,
          deviceId,
          `User entered display name: ${name}`
        );
        dbManager.recordSecurityEvent(
          'Approval requested',
          userId,
          name,
          friendlyName,
          deviceId,
          `Approval request created with ID: ${requestId}`
        );
        dbManager.recordLoginHistory(
          userId,
          name,
          friendlyName,
          browser,
          os,
          deviceId,
          'PENDING',
          'Approval Requested'
        );

        return sendJson(200, {
          success: true,
          status: 'pending',
          name,
          message: 'Device approval request submitted successfully.',
        });
      });
      return;
    }

    // =========================================================================
    // 3. POST /api/auth/check-device-status
    // =========================================================================
    if (url === '/api/auth/check-device-status' && req.method === 'POST') {
      parseBody((body) => {
        const userId = (body.userId || '').trim();
        const deviceId = (body.deviceId || '').trim();

        if (!userId || !deviceId) {
          return sendJson(400, { error: 'userId and deviceId are required' });
        }

        const deviceKey = dbManager.getDeviceKey(userId, deviceId);
        const dev = db.devices[deviceKey];

        if (!dev) {
          return sendJson(200, { status: 'unknown' });
        }

        const name = dev.submittedName || db.users[userId]?.registeredName || 'User';

        if (dev.status === 'approved') {
          // Device is approved! Generate authenticated session
          const token = crypto.randomBytes(32).toString('hex');
          const session: ActiveSession = {
            token,
            userId,
            name,
            role: 'user',
            deviceId,
            deviceType: dev.deviceType,
            friendlyName: dev.friendlyName,
            os: dev.os,
            browser: dev.browser,
            loginTime: formatReadableTime(),
            lastActive: formatReadableTime(),
          };
          db.activeSessions[token] = session;
          dev.lastLogin = formatReadableTime();
          dbManager.save();

          dbManager.recordSecurityEvent(
            'Successful login',
            userId,
            name,
            dev.friendlyName,
            deviceId,
            'User entered application following device approval'
          );
          dbManager.recordLoginHistory(
            userId,
            name,
            dev.friendlyName,
            dev.browser,
            dev.os,
            deviceId,
            'SUCCESS',
            'Approved Device'
          );

          return sendJson(200, {
            status: 'approved',
            token,
            user: { userId, name, role: 'user' },
          });
        }

        return sendJson(200, {
          status: dev.status,
          name,
        });
      });
      return;
    }

    // =========================================================================
    // 4. GET /api/auth/me
    // =========================================================================
    if (url === '/api/auth/me' && req.method === 'GET') {
      const session = authenticateToken();
      if (!session) {
        return sendJson(401, { valid: false, error: 'Session invalid or expired' });
      }
      return sendJson(200, {
        valid: true,
        user: {
          userId: session.userId,
          name: session.name,
          role: session.role,
        },
        session,
      });
    }

    // =========================================================================
    // 5. POST /api/auth/logout
    // =========================================================================
    if (url === '/api/auth/logout' && req.method === 'POST') {
      const session = authenticateToken();
      if (session) {
        delete db.activeSessions[session.token];
        dbManager.save();
        dbManager.recordSecurityEvent(
          'Logout',
          session.userId,
          session.name,
          session.friendlyName,
          session.deviceId,
          'User logged out of active session'
        );
      }
      return sendJson(200, { success: true });
    }

    // =========================================================================
    // ADMIN ROUTES (Require Admin Session)
    // =========================================================================
    const adminSession = authenticateToken();
    if (!adminSession || adminSession.role !== 'admin') {
      return sendJson(403, { error: 'Forbidden: Administrator privileges required.' });
    }

    // A. GET /api/admin/overview
    if (url === '/api/admin/overview' && req.method === 'GET') {
      const allDevices = Object.values(db.devices);
      const approvedCount = allDevices.filter((d) => d.status === 'approved').length;
      const revokedCount = allDevices.filter((d) => d.status === 'revoked').length;
      const pendingCount = db.deviceRequests.filter((r) => r.status === 'pending').length;

      // Filter today's logins
      const todayStr = formatReadableTime().slice(0, 11); // e.g. "18 Sep 2026"
      const todaysLogins = db.loginHistory.filter((l) => l.time.includes(todayStr)).length;
      const blockedAttempts = db.loginHistory.filter(
        (l) => l.status === 'BLOCKED' || l.status === 'FAILED'
      ).length;

      // Real-time blocked alerts (e.g. recent blocked new-device attempts)
      const newDeviceAlerts = db.loginHistory
        .filter((l) => l.status === 'BLOCKED' && l.reason.includes('Approval Required'))
        .slice(0, 5);

      return sendJson(200, {
        summary: {
          totalUsers: users.length,
          approvedDevices: approvedCount,
          pendingRequests: pendingCount,
          revokedDevices: revokedCount,
          todaysLogins,
          blockedAttempts,
        },
        recentActivity: db.loginHistory.slice(0, 12),
        newDeviceAlerts,
      });
    }

    // B. GET /api/admin/users
    if (url === '/api/admin/users' && req.method === 'GET') {
      const userList = users.map((u) => {
        const approvedCount = dbManager.getApprovedDevicesCount(u.id);
        const registeredName = db.users[u.id]?.registeredName || '';
        const userDevices = Object.values(db.devices).filter(
          (d) => d.userId.toLowerCase() === u.id.toLowerCase()
        );
        const hasPending = userDevices.some((d) => d.status === 'pending');
        const lastLogin = userDevices.length > 0 ? userDevices[0].lastLogin : 'Never';

        let status = 'No Devices';
        if (approvedCount >= 2) status = 'Max Devices (2/2)';
        else if (approvedCount === 1) status = 'Active (1/2)';
        else if (hasPending) status = 'Pending Request';

        return {
          userId: u.id,
          name: registeredName || 'Pending First Login',
          approvedDevicesCount: approvedCount,
          maxDevices: 2,
          status,
          lastLogin,
        };
      });
      return sendJson(200, { users: userList });
    }

    // C. POST /api/admin/users/rename
    if (url === '/api/admin/users/rename' && req.method === 'POST') {
      parseBody((body) => {
        const userId = (body.userId || '').trim();
        const newName = (body.name || '').trim();
        if (!userId || !newName) {
          return sendJson(400, { error: 'userId and name are required' });
        }
        if (!db.users[userId]) {
          db.users[userId] = { userId, registeredName: newName };
        } else {
          db.users[userId].registeredName = newName;
        }

        // Update in devices and active sessions
        for (const dev of Object.values(db.devices)) {
          if (dev.userId.toLowerCase() === userId.toLowerCase()) {
            dev.submittedName = newName;
          }
        }
        for (const sess of Object.values(db.activeSessions)) {
          if (sess.userId.toLowerCase() === userId.toLowerCase()) {
            sess.name = newName;
          }
        }
        dbManager.save();
        return sendJson(200, { success: true });
      });
      return;
    }

    // C2. POST /api/admin/users/create (Adds user, hashes password, saves to .env)
    if (url === '/api/admin/users/create' && req.method === 'POST') {
      parseBody((body) => {
        const userId = (body.userId || '').trim();
        const password = (body.password || '').trim();
        const name = (body.name || '').trim();

        if (!userId || !password) {
          return sendJson(400, { error: 'User ID and Password are required.' });
        }

        if (password.length < 3) {
          return sendJson(400, { error: 'Password must be at least 3 characters long.' });
        }

        const addResult = addUserToEnv(rootDir, userId, password);
        if (!addResult.success) {
          return sendJson(400, { error: addResult.error || 'Failed to add user.' });
        }

        // Save registeredName if provided
        if (name) {
          if (!db.users[userId]) {
            db.users[userId] = { userId, registeredName: name };
          } else {
            db.users[userId].registeredName = name;
          }
        }

        dbManager.recordSecurityEvent(
          'Security event' as any,
          admin.id,
          admin.name,
          'Admin Console',
          '',
          `Admin created user ${userId} (slot USER_${addResult.userIndex}) with SHA-256 hashed password saved to .env`
        );
        dbManager.save();

        return sendJson(200, {
          success: true,
          message: `User ${userId} created and saved to .env with SHA-256 hash.`,
          userIndex: addResult.userIndex,
          userId,
          name: name || 'Pending First Login',
        });
      });
      return;
    }

    // D. GET /api/admin/device-requests
    if (url === '/api/admin/device-requests' && req.method === 'GET') {
      const pending = db.deviceRequests.filter((r) => r.status === 'pending');
      return sendJson(200, { requests: pending });
    }

    // E. POST /api/admin/device-requests/approve
    if (url === '/api/admin/device-requests/approve' && req.method === 'POST') {
      parseBody((body) => {
        const requestId = (body.requestId || '').trim();
        const reqItem = db.deviceRequests.find((r) => r.requestId === requestId);
        if (!reqItem) {
          return sendJson(404, { error: 'Device request not found' });
        }

        const approvedCount = dbManager.getApprovedDevicesCount(reqItem.userId);
        if (approvedCount >= 2) {
          return sendJson(400, {
            error: 'Cannot approve: User already has maximum 2 approved devices.',
          });
        }

        reqItem.status = 'approved';
        const key = dbManager.getDeviceKey(reqItem.userId, reqItem.deviceId);
        if (db.devices[key]) {
          db.devices[key].status = 'approved';
          db.devices[key].submittedName = reqItem.name;
        } else {
          db.devices[key] = {
            deviceId: reqItem.deviceId,
            userId: reqItem.userId,
            friendlyName: reqItem.friendlyName,
            deviceType: reqItem.deviceType,
            os: reqItem.operatingSystem,
            browser: reqItem.browser,
            status: 'approved',
            submittedName: reqItem.name,
            createdAt: reqItem.requestTime,
            lastLogin: reqItem.requestTime,
          };
        }

        const passkey = (body.passkey || '').trim();
        if (passkey !== '630211') {
          return sendJson(403, { error: 'Invalid admin approval passkey. Required: 630211' });
        }

        // Save name to user record
        if (!db.users[reqItem.userId]) {
          db.users[reqItem.userId] = { userId: reqItem.userId, registeredName: reqItem.name };
        } else {
          db.users[reqItem.userId].registeredName = reqItem.name;
        }

        dbManager.save();

        dbManager.recordSecurityEvent(
          'Device approved',
          reqItem.userId,
          reqItem.name,
          reqItem.friendlyName,
          reqItem.deviceId,
          `Administrator confirmed approval for device ${reqItem.friendlyName} (Verified with Passkey 630211 🔑)`
        );

        return sendJson(200, { success: true });
      });
      return;
    }

    // F. POST /api/admin/device-requests/reject
    if (url === '/api/admin/device-requests/reject' && req.method === 'POST') {
      parseBody((body) => {
        const requestId = (body.requestId || '').trim();
        const reqItem = db.deviceRequests.find((r) => r.requestId === requestId);
        if (!reqItem) {
          return sendJson(404, { error: 'Device request not found' });
        }

        reqItem.status = 'rejected';
        const key = dbManager.getDeviceKey(reqItem.userId, reqItem.deviceId);
        if (db.devices[key]) {
          db.devices[key].status = 'rejected';
        }
        dbManager.save();

        dbManager.recordSecurityEvent(
          'Device rejected',
          reqItem.userId,
          reqItem.name,
          reqItem.friendlyName,
          reqItem.deviceId,
          `Administrator rejected device approval request`
        );

        return sendJson(200, { success: true });
      });
      return;
    }

    // G. GET /api/admin/approved-devices
    if (url === '/api/admin/approved-devices' && req.method === 'GET') {
      const list = Object.values(db.devices).map((d) => ({
        userId: d.userId,
        name: db.users[d.userId]?.registeredName || d.submittedName || 'User',
        friendlyName: d.friendlyName,
        deviceId: d.deviceId,
        browser: d.browser,
        os: d.os,
        status: d.status,
        created: d.createdAt,
        lastLogin: d.lastLogin,
      }));
      return sendJson(200, { devices: list });
    }

    // H. POST /api/admin/devices/revoke
    if (url === '/api/admin/devices/revoke' && req.method === 'POST') {
      parseBody((body) => {
        const userId = (body.userId || '').trim();
        const deviceId = (body.deviceId || '').trim();
        const key = dbManager.getDeviceKey(userId, deviceId);
        const dev = db.devices[key];
        if (!dev) {
          return sendJson(404, { error: 'Device not found' });
        }

        dev.status = 'revoked';

        // Terminate any active sessions from this device
        for (const [token, sess] of Object.entries(db.activeSessions)) {
          if (sess.userId.toLowerCase() === userId.toLowerCase() && sess.deviceId === deviceId) {
            delete db.activeSessions[token];
          }
        }

        dbManager.save();

        const name = dev.submittedName || db.users[userId]?.registeredName || 'User';
        dbManager.recordSecurityEvent(
          'Device revoked',
          userId,
          name,
          dev.friendlyName,
          deviceId,
          `Administrator revoked access for device: ${dev.friendlyName}`
        );

        return sendJson(200, { success: true });
      });
      return;
    }

    // I. POST /api/admin/devices/rename
    if (url === '/api/admin/devices/rename' && req.method === 'POST') {
      parseBody((body) => {
        const userId = (body.userId || '').trim();
        const deviceId = (body.deviceId || '').trim();
        const friendlyName = (body.friendlyName || '').trim();
        const key = dbManager.getDeviceKey(userId, deviceId);
        const dev = db.devices[key];
        if (!dev) {
          return sendJson(404, { error: 'Device not found' });
        }
        dev.friendlyName = friendlyName;
        dbManager.save();
        return sendJson(200, { success: true });
      });
      return;
    }

    // J. GET /api/admin/login-history
    if (url === '/api/admin/login-history' && req.method === 'GET') {
      const q = req.url.includes('?') ? req.url.split('?')[1] : '';
      const params = new URLSearchParams(q);
      const search = (params.get('search') || '').toLowerCase();
      const statusFilter = (params.get('status') || '').toUpperCase();
      const userIdFilter = (params.get('userId') || '').toLowerCase();

      let results = db.loginHistory;
      if (statusFilter && statusFilter !== 'ALL') {
        results = results.filter((r) => r.status === statusFilter);
      }
      if (userIdFilter) {
        results = results.filter((r) => r.userId.toLowerCase() === userIdFilter);
      }
      if (search) {
        results = results.filter(
          (r) =>
            r.userId.toLowerCase().includes(search) ||
            r.name.toLowerCase().includes(search) ||
            r.device.toLowerCase().includes(search) ||
            r.deviceId.toLowerCase().includes(search) ||
            r.reason.toLowerCase().includes(search)
        );
      }

      return sendJson(200, { history: results.slice(0, 100) });
    }

    // K. GET /api/admin/security-events
    if (url === '/api/admin/security-events' && req.method === 'GET') {
      return sendJson(200, { events: db.securityEvents.slice(0, 150) });
    }

    return next();
  };
}
