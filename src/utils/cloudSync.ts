/**
 * MediaForge Real-Time Cross-Device Synchronization Relay
 * Connects all devices (mobile phones, laptops, desktops) across the cloud
 * without requiring any local backend server, functioning smoothly on static GitHub Pages.
 */

import { ClientDeviceInfo } from './deviceFingerprint';
import {
  getLocalDB,
  saveLocalDB,
  EXTRA_USERS_KEY,
  StoredDeviceRequest,
} from './securityVault';

export const CLOUD_SYNC_TOPIC = 'mediaforge_sync_24mic7312_live';
const NTFY_BASE_URL = 'https://ntfy.sh';

export interface CloudSyncEvent {
  type:
    | 'DEVICE_REQUEST_CREATED'
    | 'DEVICE_STATUS_UPDATED'
    | 'USER_CREATED'
    | 'DEVICE_RENAMED';
  requestId?: string;
  userId: string;
  name?: string;
  deviceId?: string;
  deviceType?: string;
  operatingSystem?: string;
  browser?: string;
  friendlyName?: string;
  requestTime?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'revoked';
  passkey?: string;
  passwordHash?: string;
  timestamp?: number;
}

/**
 * Broadcast an event to all connected devices across the cloud
 */
export async function broadcastCloudEvent(event: CloudSyncEvent): Promise<boolean> {
  const payload = {
    ...event,
    timestamp: Date.now(),
  };

  try {
    const res = await fetch(`${NTFY_BASE_URL}/${CLOUD_SYNC_TOPIC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('Cloud sync broadcast notice:', err);
    return false;
  }
}

/**
 * Apply a single cloud event to the local cryptographic database
 */
export function applyCloudEventToLocalDB(event: CloudSyncEvent): boolean {
  if (!event || !event.type || !event.userId) return false;

  const db = getLocalDB();
  let changed = false;

  if (event.type === 'DEVICE_REQUEST_CREATED' && event.deviceId) {
    const deviceKey = `${event.userId}_${event.deviceId}`;
    const trimmedId = event.userId.trim();

    // 1. Check or update deviceRequests table
    const existingReq = db.deviceRequests.find(
      (r) => r.userId === trimmedId && r.deviceId === event.deviceId
    );

    if (!existingReq) {
      const newReq: StoredDeviceRequest = {
        requestId: event.requestId || `req_${Date.now().toString(36)}`,
        userId: trimmedId,
        name: event.name?.trim() || `User ${trimmedId}`,
        deviceId: event.deviceId,
        deviceType: event.deviceType || 'Device',
        operatingSystem: event.operatingSystem || 'Unknown OS',
        browser: event.browser || 'Browser',
        friendlyName: event.friendlyName || `${event.deviceType || 'Device'} (${event.operatingSystem || 'OS'})`,
        requestTime: event.requestTime || new Date().toLocaleString(),
        status: (event.status as any) || 'pending',
      };
      db.deviceRequests.unshift(newReq);
      changed = true;
    } else if (event.status && existingReq.status !== event.status) {
      existingReq.status = event.status as any;
      changed = true;
    }

    // 2. Check or update devices table
    if (!db.devices[deviceKey]) {
      db.devices[deviceKey] = {
        deviceId: event.deviceId,
        userId: trimmedId,
        friendlyName: event.friendlyName || `${event.deviceType || 'Device'} (${event.operatingSystem || 'OS'})`,
        deviceType: event.deviceType || 'Device',
        os: event.operatingSystem || 'Unknown OS',
        browser: event.browser || 'Browser',
        status: (event.status as any) || 'pending',
        submittedName: event.name?.trim() || `User ${trimmedId}`,
        createdAt: event.requestTime || new Date().toLocaleString(),
        lastLogin: new Date().toLocaleString(),
      };
      changed = true;
    }
  } else if (event.type === 'DEVICE_STATUS_UPDATED' && event.deviceId && event.status) {
    const deviceKey = `${event.userId}_${event.deviceId}`;
    if (db.devices[deviceKey]) {
      db.devices[deviceKey].status = event.status;
      changed = true;
    } else {
      db.devices[deviceKey] = {
        deviceId: event.deviceId,
        userId: event.userId,
        friendlyName: event.friendlyName || 'Authorized Device',
        deviceType: event.deviceType || 'Device',
        os: event.operatingSystem || 'OS',
        browser: event.browser || 'Browser',
        status: event.status,
        submittedName: event.name || `User ${event.userId}`,
        createdAt: new Date().toLocaleString(),
        lastLogin: new Date().toLocaleString(),
      };
      changed = true;
    }

    db.deviceRequests.forEach((req) => {
      if (req.userId === event.userId && req.deviceId === event.deviceId) {
        req.status = event.status === 'approved' ? 'approved' : 'rejected';
        changed = true;
      }
    });
  } else if (event.type === 'USER_CREATED' && event.userId && event.passwordHash) {
    try {
      let extraUsers: Record<string, any> = {};
      const raw = localStorage.getItem(EXTRA_USERS_KEY);
      if (raw) extraUsers = JSON.parse(raw);
      if (!extraUsers[event.userId]) {
        extraUsers[event.userId] = {
          id: event.userId,
          passwordHash: event.passwordHash,
          name: event.name || `User ${event.userId}`,
        };
        localStorage.setItem(EXTRA_USERS_KEY, JSON.stringify(extraUsers));
        changed = true;
      }
    } catch {}
  } else if (event.type === 'DEVICE_RENAMED' && event.deviceId && event.friendlyName) {
    const deviceKey = `${event.userId}_${event.deviceId}`;
    if (db.devices[deviceKey]) {
      db.devices[deviceKey].friendlyName = event.friendlyName;
      changed = true;
    }
  }

  if (changed) {
    saveLocalDB(db);
  }
  return changed;
}

/**
 * Poll recent cloud events from the sync channel and update local storage
 */
export async function pullCloudSyncEvents(): Promise<boolean> {
  try {
    const res = await fetch(`${NTFY_BASE_URL}/${CLOUD_SYNC_TOPIC}/json?poll=1`, {
      method: 'GET',
    });
    if (!res.ok) return false;

    const rawText = await res.text();
    if (!rawText.trim()) return false;

    const lines = rawText.trim().split('\n');
    let anyChanged = false;

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item && item.message) {
          const evt: CloudSyncEvent =
            typeof item.message === 'string' ? JSON.parse(item.message) : item.message;
          if (applyCloudEventToLocalDB(evt)) {
            anyChanged = true;
          }
        }
      } catch {}
    }

    return anyChanged;
  } catch {
    return false;
  }
}

/**
 * Subscribe to real-time cloud sync events with automatic failover to polling
 */
export function subscribeToCloudSync(onSyncUpdated: () => void): () => void {
  let isCancelled = false;
  let eventSource: EventSource | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

  // 1. Initial Pull
  pullCloudSyncEvents().then((changed) => {
    if (changed && !isCancelled) {
      onSyncUpdated();
    }
  });

  // 2. Try EventSource SSE for instant real-time pushes
  try {
    eventSource = new EventSource(`${NTFY_BASE_URL}/${CLOUD_SYNC_TOPIC}/sse`);

    eventSource.onmessage = (e) => {
      if (isCancelled || !e.data) return;
      try {
        const item = JSON.parse(e.data);
        if (item && item.message) {
          const evt: CloudSyncEvent =
            typeof item.message === 'string' ? JSON.parse(item.message) : item.message;
          if (applyCloudEventToLocalDB(evt)) {
            onSyncUpdated();
          }
        }
      } catch {}
    };

    eventSource.onerror = () => {
      // EventSource will auto-reconnect or fallback to interval poll
    };
  } catch {}

  // 3. Robust backup interval polling (every 3.5 seconds)
  pollInterval = setInterval(async () => {
    if (isCancelled) return;
    const changed = await pullCloudSyncEvents();
    if (changed && !isCancelled) {
      onSyncUpdated();
    }
  }, 3500);

  return () => {
    isCancelled = true;
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}
