export interface ClientDeviceInfo {
  deviceId: string;
  deviceType: 'Desktop' | 'Laptop' | 'Tablet' | 'Mobile' | 'Unknown';
  os: string;
  browser: string;
  friendlyName: string;
  screen: string;
  platform: string;
  language: string;
}

const DB_NAME = 'MediaForgeSecurityDB';
const DB_VERSION = 1;
const STORE_NAME = 'deviceStore';
const IDB_KEY = 'trustedDeviceId';
const LS_FALLBACK_KEY = 'mediaforge_trusted_device_id';

let cachedDeviceId: string | null = null;

/**
 * Generates a cryptographically secure random UUID.
 */
function generateSecureUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40; // Version 4
    buf[8] = (buf[8] & 0x3f) | 0x80; // Variant 10
    const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}

/**
 * Accesses IndexedDB to retrieve or store the Trusted Device ID.
 */
function getFromIndexedDB(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get(IDB_KEY);
          getReq.onsuccess = () => resolve((getReq.result as string) || null);
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function saveToIndexedDB(id: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve();
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(id, IDB_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieves the Trusted Device ID from IndexedDB with localStorage persistence.
 * If none exists, generates a secure random UUID and stores it.
 */
export async function getTrustedDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  // 1. Try IndexedDB
  const idbVal = await getFromIndexedDB();
  if (idbVal && typeof idbVal === 'string' && idbVal.length > 8) {
    cachedDeviceId = idbVal;
    try {
      localStorage.setItem(LS_FALLBACK_KEY, idbVal);
    } catch {}
    return idbVal;
  }

  // 2. Try localStorage fallback
  try {
    const lsVal = localStorage.getItem(LS_FALLBACK_KEY);
    if (lsVal && lsVal.length > 8) {
      cachedDeviceId = lsVal;
      await saveToIndexedDB(lsVal);
      return lsVal;
    }
  } catch {}

  // 3. Generate new secure UUID
  const newId = generateSecureUUID();
  cachedDeviceId = newId;

  try {
    localStorage.setItem(LS_FALLBACK_KEY, newId);
  } catch {}
  await saveToIndexedDB(newId);

  return newId;
}

/**
 * Synchronous getter returning cached or localStorage device ID.
 */
export function getSyncTrustedDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const lsVal = localStorage.getItem(LS_FALLBACK_KEY);
    if (lsVal) {
      cachedDeviceId = lsVal;
      return lsVal;
    }
  } catch {}
  const newId = generateSecureUUID();
  cachedDeviceId = newId;
  try {
    localStorage.setItem(LS_FALLBACK_KEY, newId);
  } catch {}
  // asynchronously write to IDB as well
  saveToIndexedDB(newId).catch(() => {});
  return newId;
}

/**
 * Computes a friendly description for the device (e.g. "Windows Laptop", "Android Phone", "MacBook").
 */
export function computeFriendlyDeviceName(
  os: string,
  deviceType: 'Desktop' | 'Laptop' | 'Tablet' | 'Mobile' | 'Unknown'
): string {
  if (os.includes('Android')) {
    return deviceType === 'Tablet' ? 'Android Tablet' : 'Android Phone';
  }
  if (os.includes('iOS') || os.includes('iPhone')) {
    return 'iPhone';
  }
  if (os.includes('iPad')) {
    return 'iPad';
  }
  if (os.includes('macOS')) {
    return deviceType === 'Laptop' ? 'MacBook' : 'Mac Desktop';
  }
  if (os.includes('Windows')) {
    return deviceType === 'Laptop' ? 'Windows Laptop' : 'Windows Desktop';
  }
  if (os.includes('Linux')) {
    return deviceType === 'Laptop' ? 'Linux Laptop' : 'Linux PC';
  }
  return `${os} ${deviceType !== 'Unknown' ? deviceType : 'Device'}`.trim();
}

/**
 * Captures detailed device specifications and assigns a friendly name.
 */
export function captureClientDeviceInfo(overrideDeviceId?: string): ClientDeviceInfo {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const platform =
    typeof navigator !== 'undefined'
      ? (navigator as any).userAgentData?.platform || navigator.platform || 'Unknown'
      : 'Unknown';
  const language = typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en';
  const screenWidth = typeof window !== 'undefined' ? window.screen.width : 0;
  const screenHeight = typeof window !== 'undefined' ? window.screen.height : 0;
  const screen = `${screenWidth}×${screenHeight}`;

  // 1. Detect Operating System
  let os = 'Unknown OS';
  if (/windows phone/i.test(userAgent)) {
    os = 'Windows Phone';
  } else if (/win(dows|98|me|nt|2000|xp|vista|7|8|10|11)/i.test(userAgent)) {
    if (/windows nt 10\.0/i.test(userAgent)) os = 'Windows 11/10';
    else if (/windows nt 6\.3/i.test(userAgent)) os = 'Windows 8.1';
    else if (/windows nt 6\.1/i.test(userAgent)) os = 'Windows 7';
    else os = 'Windows';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  } else if (/ipad/i.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iPadOS';
  } else if (/iphone/i.test(userAgent)) {
    os = 'iOS';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    os = 'macOS';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  } else if (/cros/i.test(userAgent)) {
    os = 'ChromeOS';
  }

  // 2. Detect Browser
  let browser = 'Unknown Browser';
  if (/edg\//i.test(userAgent)) {
    browser = 'Microsoft Edge';
  } else if (/opr\/|opera/i.test(userAgent)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = 'Safari';
  }

  // 3. Detect Device Category (Mobile, Tablet, Laptop, Desktop)
  let deviceType: 'Desktop' | 'Laptop' | 'Tablet' | 'Mobile' | 'Unknown' = 'Desktop';
  const isMobileUa = /mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTabletUa = /tablet|ipad|android(?!.*mobile)/i.test(userAgent);

  if (isTabletUa || os === 'iPadOS') {
    deviceType = 'Tablet';
  } else if (isMobileUa) {
    deviceType = 'Mobile';
  } else if (
    (screenWidth <= 1440 && screenHeight <= 900 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) ||
    (screenWidth >= 1200 && screenWidth <= 1680 && screenHeight <= 1050)
  ) {
    deviceType = 'Laptop';
  } else {
    deviceType = 'Desktop';
  }

  const deviceId = overrideDeviceId || getSyncTrustedDeviceId();
  const friendlyName = computeFriendlyDeviceName(os, deviceType);

  return {
    deviceId,
    deviceType,
    os,
    browser,
    friendlyName,
    screen,
    platform,
    language,
  };
}
