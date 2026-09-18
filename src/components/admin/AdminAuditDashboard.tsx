import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  AlertTriangle,
  RefreshCw,
  Clock,
  Search,
  CheckCircle2,
  Users,
  Activity,
  ArrowLeft,
  XCircle,
  Filter,
  Check,
  X,
  Edit2,
  Ban,
  Shield,
  Layers,
  FileText,
  HelpCircle,
  UserPlus,
  Key,
} from 'lucide-react';
import {
  getVaultAdminData,
  setVaultDeviceStatus,
  addVaultUser,
  renameVaultDevice,
  renameVaultUser,
} from '@/utils/securityVault';
import { subscribeToCloudSync } from '@/utils/cloudSync';

interface OverviewSummary {
  totalUsers: number;
  approvedDevices: number;
  pendingRequests: number;
  revokedDevices: number;
  todaysLogins: number;
  blockedAttempts: number;
}

interface OverviewData {
  summary: OverviewSummary;
  recentActivity: Array<{
    id: string;
    time: string;
    userId: string;
    name: string;
    device: string;
    status: string;
    reason: string;
  }>;
  newDeviceAlerts: Array<{
    id: string;
    time: string;
    userId: string;
    name: string;
    device: string;
    status: string;
    reason: string;
  }>;
}

interface UserItem {
  userId: string;
  name: string;
  approvedDevicesCount: number;
  maxDevices: number;
  status: string;
  lastLogin: string;
}

interface DeviceRequest {
  requestId: string;
  userId: string;
  name: string;
  deviceId: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  friendlyName: string;
  requestTime: string;
  status: string;
}

interface ApprovedDevice {
  userId: string;
  name: string;
  friendlyName: string;
  deviceId: string;
  browser: string;
  os: string;
  status: string;
  created: string;
  lastLogin: string;
}

interface LoginHistoryItem {
  id: string;
  time: string;
  userId: string;
  name: string;
  device: string;
  browser: string;
  os: string;
  deviceId: string;
  status: string;
  reason: string;
}

interface SecurityEventItem {
  id: string;
  eventType: string;
  userId: string;
  name: string;
  device: string;
  deviceId: string;
  time: string;
  details: string;
}

interface AdminAuditDashboardProps {
  onBackToHome: () => void;
}

type AdminSection =
  | 'dashboard'
  | 'users'
  | 'requests'
  | 'devices'
  | 'history'
  | 'events';

export const AdminAuditDashboard: React.FC<AdminAuditDashboardProps> = ({ onBackToHome }) => {
  const { token, registerFailedAttempt, resetFailedAttempts } = useAuth();

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  // Overview Data
  const [overview, setOverview] = useState<OverviewData | null>(null);

  // Users Data
  const [usersList, setUsersList] = useState<UserItem[]>([]);

  // Requests Data
  const [requests, setRequests] = useState<DeviceRequest[]>([]);

  // Approved Devices Data
  const [devices, setDevices] = useState<ApprovedDevice[]>([]);

  // History Data
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Security Events Data
  const [events, setEvents] = useState<SecurityEventItem[]>([]);

  // Feedback & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Modals State
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<DeviceRequest | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ userId: string; deviceId?: string; currentName: string; isDevice?: boolean } | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  // Add User State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserIdInput, setNewUserIdInput] = useState('');
  const [newUserPasswordInput, setNewUserPasswordInput] = useState('');
  const [newUserNameInput, setNewUserNameInput] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Focus and clear PIN inputs when modal opens
  useEffect(() => {
    if (approveConfirmTarget) {
      setPinDigits(['', '', '', '', '', '']);
      setPasskeyError(null);
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 60);
    }
  }, [approveConfirmTarget]);

  // -------------------------------------------------------------
  // Data Fetchers
  // -------------------------------------------------------------
  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch {}
  }, [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {}
  }, [token]);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/device-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const pending = (data.requests || []).filter((r: any) => r.status === 'pending');
        setRequests(pending);
      }
    } catch {}
  }, [token]);

  const fetchDevices = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/approved-devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch {}
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (historySearch) params.set('search', historySearch);
      if (historyStatusFilter && historyStatusFilter !== 'ALL') params.set('status', historyStatusFilter);

      const res = await fetch(`/api/admin/login-history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {}
  }, [token, historySearch, historyStatusFilter]);

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/security-events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {}
  }, [token]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);

    let hasServerData = false;
    if (token && !token.startsWith('vault_')) {
      try {
        await Promise.all([
          fetchOverview(),
          fetchUsers(),
          fetchRequests(),
          fetchDevices(),
          fetchHistory(),
          fetchEvents(),
        ]);
        hasServerData = true;
      } catch {}
    }

    // If server is not responding or running in static client vault mode
    if (!hasServerData || token?.startsWith('vault_')) {
      const vData = getVaultAdminData();
      const approvedDevs = vData.devices.filter((d) => d.status === 'approved');
      const pendingReqs = vData.deviceRequests.filter((r) => r.status === 'pending');
      const revokedDevs = vData.devices.filter((d) => d.status === 'revoked');

      setOverview({
        summary: {
          totalUsers: vData.users.length,
          approvedDevices: approvedDevs.length,
          pendingRequests: pendingReqs.length,
          revokedDevices: revokedDevs.length,
          todaysLogins: approvedDevs.length + 1,
          blockedAttempts: 0,
        },
        recentActivity: vData.auditLogs.slice(0, 10).map((log) => ({
          id: log.id,
          time: log.timestamp,
          userId: log.userId,
          name: log.userId,
          device: log.deviceId,
          status: log.status,
          reason: log.details,
        })),
        newDeviceAlerts: pendingReqs.map((r) => ({
          id: r.requestId,
          time: r.requestTime,
          userId: r.userId,
          name: r.name,
          device: r.friendlyName,
          status: 'PENDING',
          reason: 'Device authorization required',
        })),
      });

      setUsersList(
        vData.users.map((u) => {
          const userDevs = vData.devices.filter(
            (d) => d.userId === u.userId && d.status === 'approved'
          );
          return {
            userId: u.userId,
            name: u.registeredName,
            approvedDevicesCount: userDevs.length,
            maxDevices: 2,
            status: userDevs.length > 0 ? 'ACTIVE' : 'STANDBY',
            lastLogin: userDevs[0]?.lastLogin || 'Recently',
          };
        })
      );

      setRequests(
        vData.deviceRequests
          .filter((r) => r.status === 'pending')
          .map((r) => ({
            requestId: r.requestId,
            userId: r.userId,
            name: r.name,
            deviceId: r.deviceId,
            deviceType: r.deviceType,
            operatingSystem: r.operatingSystem,
            browser: r.browser,
            friendlyName: r.friendlyName,
            requestTime: r.requestTime,
            status: r.status,
          }))
      );

      setDevices(
        vData.devices.map((d) => ({
          userId: d.userId,
          name: d.submittedName,
          friendlyName: d.friendlyName,
          deviceId: d.deviceId,
          browser: d.browser,
          os: d.os,
          status: d.status,
          created: d.createdAt,
          lastLogin: d.lastLogin,
        }))
      );

      setHistory(
        vData.auditLogs.map((log) => ({
          id: log.id,
          time: log.timestamp,
          userId: log.userId,
          name: log.userId,
          device: log.deviceId,
          browser: 'Browser',
          os: 'OS',
          deviceId: log.deviceId,
          status: log.status === 'SUCCESS' ? 'SUCCESS' : 'BLOCKED',
          reason: log.details,
        }))
      );

      setEvents(
        vData.auditLogs.map((log) => ({
          id: log.id,
          eventType: log.action,
          userId: log.userId,
          name: log.userId,
          device: log.deviceId,
          deviceId: log.deviceId,
          time: log.timestamp,
          details: log.details,
        }))
      );
    }

    setIsLoading(false);
  }, [token, fetchOverview, fetchUsers, fetchRequests, fetchDevices, fetchHistory, fetchEvents]);

  useEffect(() => {
    refreshAll();
    const unsubscribe = subscribeToCloudSync(() => {
      refreshAll();
    });
    return () => {
      unsubscribe();
    };
  }, [refreshAll]);

  // -------------------------------------------------------------
  // PIN Input Handlers
  // -------------------------------------------------------------
  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newDigits = [...pinDigits];
      newDigits[index] = '';
      setPinDigits(newDigits);
      setPasskeyError(null);
      return;
    }

    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      const newDigits = [...pinDigits];
      for (let k = 0; k < 6; k++) {
        if (pasted[k] !== undefined) {
          newDigits[k] = pasted[k];
        }
      }
      setPinDigits(newDigits);
      setPasskeyError(null);
      const nextFocus = Math.min(pasted.length, 5);
      pinInputRefs.current[nextFocus]?.focus();
      if (newDigits.every((d) => d.length === 1)) {
        handleConfirmApproval(newDigits.join(''));
      }
      return;
    }

    const digit = cleanVal.slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);
    setPasskeyError(null);

    if (digit && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5 && newDigits.every((d) => d.length === 1)) {
      handleConfirmApproval(newDigits.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        const newDigits = [...pinDigits];
        newDigits[index - 1] = '';
        setPinDigits(newDigits);
        pinInputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...pinDigits];
        newDigits[index] = '';
        setPinDigits(newDigits);
      }
      setPasskeyError(null);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    const newDigits = ['', '', '', '', '', ''];
    for (let k = 0; k < 6; k++) {
      if (digits[k]) newDigits[k] = digits[k];
    }
    setPinDigits(newDigits);
    setPasskeyError(null);
    const nextIdx = Math.min(digits.length, 5);
    pinInputRefs.current[nextIdx]?.focus();
    if (digits.length === 6) {
      handleConfirmApproval(digits.join(''));
    }
  };

  // -------------------------------------------------------------
  // Actions: Approve / Reject / Revoke / Rename
  // -------------------------------------------------------------
  const handleConfirmApproval = async (enteredPasskey?: string) => {
    if (!token || !approveConfirmTarget) return;

    const code = (enteredPasskey !== undefined ? enteredPasskey : pinDigits.join('')).trim();

    if (code !== '630211') {
      registerFailedAttempt('Wrong admin passkey entered');
      setPasskeyError('Invalid authorization passkey. Please check the code and try again.');
      setPinDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 60);
      return;
    }

    resetFailedAttempts();
    setIsApproving(true);
    setPasskeyError(null);
    const targetReq = approveConfirmTarget;

    try {
      let serverHandled = false;
      if (!token.startsWith('vault_')) {
        try {
          const res = await fetch('/api/admin/device-requests/approve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              requestId: targetReq.requestId,
              deviceId: targetReq.deviceId,
              userId: targetReq.userId,
              passkey: '630211',
            }),
          });

          const isJson = res.headers.get('content-type')?.includes('application/json');
          if (res.ok && isJson) {
            serverHandled = true;
          }
        } catch {}
      }

      if (!serverHandled) {
        setVaultDeviceStatus(
          targetReq.userId,
          targetReq.deviceId,
          'approved',
          '630211'
        );
      }

      // Optimistically remove approved card from requests state
      setRequests((prev) =>
        prev.filter(
          (r) =>
            r.requestId !== targetReq.requestId &&
            !(r.userId === targetReq.userId && r.deviceId === targetReq.deviceId)
        )
      );

      setFeedbackMessage(
        `✓ Approved device ${targetReq.friendlyName} for ${targetReq.name}`
      );
      setApproveConfirmTarget(null);
      setPinDigits(['', '', '', '', '', '']);
      setIsApproving(false);
      refreshAll();
    } catch (e: any) {
      setIsApproving(false);
      setFeedbackMessage(`Error: ${e.message}`);
    }
  };

  const handleRejectRequest = async (reqItem: DeviceRequest) => {
    if (!token) return;
    try {
      let serverHandled = false;
      if (!token.startsWith('vault_')) {
        const res = await fetch('/api/admin/device-requests/reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requestId: reqItem.requestId,
            deviceId: reqItem.deviceId,
            userId: reqItem.userId,
          }),
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          serverHandled = true;
        }
      }

      if (!serverHandled) {
        setVaultDeviceStatus(reqItem.userId, reqItem.deviceId, 'rejected');
      }

      // Optimistically remove rejected card from requests state
      setRequests((prev) =>
        prev.filter(
          (r) =>
            r.requestId !== reqItem.requestId &&
            !(r.userId === reqItem.userId && r.deviceId === reqItem.deviceId)
        )
      );

      setFeedbackMessage(`Rejected device request for ${reqItem.name}`);
      refreshAll();
    } catch {}
  };

  const handleRevokeDevice = async (userId: string, deviceId: string, deviceName: string) => {
    if (!token) return;
    try {
      let serverHandled = false;
      if (!token.startsWith('vault_')) {
        const res = await fetch('/api/admin/devices/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, deviceId }),
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          serverHandled = true;
        }
      }

      if (!serverHandled) {
        setVaultDeviceStatus(userId, deviceId, 'revoked');
      }

      setFeedbackMessage(`🚫 Revoked device: ${deviceName}`);
      refreshAll();
    } catch {}
  };

  const handleSaveRename = async () => {
    if (!token || !renameTarget || !newNameInput.trim()) return;
    try {
      let serverHandled = false;
      if (!token.startsWith('vault_')) {
        if (renameTarget.isDevice) {
          const res = await fetch('/api/admin/devices/rename', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: renameTarget.userId,
              deviceId: renameTarget.deviceId,
              friendlyName: newNameInput.trim(),
            }),
          });
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            serverHandled = true;
          }
        } else {
          const res = await fetch('/api/admin/users/rename', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: renameTarget.userId,
              name: newNameInput.trim(),
            }),
          });
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            serverHandled = true;
          }
        }
      }

      if (!serverHandled) {
        if (renameTarget.isDevice && renameTarget.deviceId) {
          renameVaultDevice(renameTarget.userId, renameTarget.deviceId, newNameInput.trim());
        } else {
          renameVaultUser(renameTarget.userId, newNameInput.trim());
        }
      }

      setRenameTarget(null);
      setNewNameInput('');
      refreshAll();
    } catch {}
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newUserIdInput.trim() || !newUserPasswordInput.trim()) return;

    setIsAddingUser(true);
    setAddUserError(null);

    try {
      let serverSuccess = false;
      if (!token.startsWith('vault_')) {
        try {
          const res = await fetch('/api/admin/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: newUserIdInput.trim(),
              password: newUserPasswordInput.trim(),
              name: newUserNameInput.trim(),
            }),
          });

          const isJson = res.headers.get('content-type')?.includes('application/json');
          if (res.ok && isJson) {
            serverSuccess = true;
          }
        } catch {}
      }

      if (!serverSuccess) {
        await addVaultUser(
          newUserIdInput.trim(),
          newUserPasswordInput.trim(),
          newUserNameInput.trim()
        );
      }

      setIsAddingUser(false);
      setFeedbackMessage(
        `✓ User ${newUserIdInput.trim()} added! Password was hashed with SHA-256 and saved.`
      );
      setIsAddUserModalOpen(false);
      setNewUserIdInput('');
      setNewUserPasswordInput('');
      setNewUserNameInput('');
      refreshAll();
    } catch (err: any) {
      setIsAddingUser(false);
      setAddUserError(err.message || 'Failed to add user.');
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Return to MediaForge Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                ADMIN PORTAL
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Private 5-User Authentication, Device Approvals & Security Audit Log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {feedbackMessage && (
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
              <span>{feedbackMessage}</span>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="text-indigo-400 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          <button
            onClick={refreshAll}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-850">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Activity },
          { id: 'users', label: 'Users', icon: Users, badge: usersList.length },
          { id: 'requests', label: 'Device Requests', icon: ShieldAlert, badge: requests.length, alert: requests.length > 0 },
          { id: 'devices', label: 'Approved Devices', icon: Laptop, badge: devices.filter(d => d.status === 'approved').length },
          { id: 'history', label: 'Login History', icon: Clock },
          { id: 'events', label: 'Security Events', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as AdminSection)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    tab.alert
                      ? 'bg-amber-500 text-black font-extrabold animate-pulse'
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: DASHBOARD                                      */}
      {/* ========================================================= */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          {/* Security Alert: Blocked New Device Attempts */}
          {overview?.newDeviceAlerts && overview.newDeviceAlerts.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/50 shadow-lg shadow-amber-500/5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <span>🚨 NEW DEVICE LOGIN ATTEMPT</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {overview.newDeviceAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{alert.userId}</span>
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">
                        BLOCKED
                      </span>
                    </div>
                    <div className="text-slate-300">Name: <span className="font-semibold text-white">{alert.name}</span></div>
                    <div className="text-slate-300">Device: <span className="font-semibold text-white">{alert.device}</span></div>
                    <div className="text-slate-400 text-[10px]">Time: {alert.time}</div>
                    <div className="text-amber-300/90 text-[11px] font-medium pt-1">
                      Reason: {alert.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TOTAL USERS</div>
              <div className="text-2xl font-black text-indigo-400 mt-1">{overview?.summary.totalUsers || 5}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Configured in .env</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">APPROVED DEVICES</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{overview?.summary.approvedDevices || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Active trusted devices</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PENDING REQUESTS</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{overview?.summary.pendingRequests || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Awaiting admin review</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">REVOKED DEVICES</div>
              <div className="text-2xl font-black text-red-400 mt-1">{overview?.summary.revokedDevices || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Deauthorized hardware</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TODAY'S LOGINS</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">{overview?.summary.todaysLogins || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Session entries today</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">BLOCKED ATTEMPTS</div>
              <div className="text-2xl font-black text-rose-400 mt-1">{overview?.summary.blockedAttempts || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Prevented access events</div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>RECENT ACTIVITY</span>
            </h2>

            <div className="space-y-2">
              {overview?.recentActivity && overview.recentActivity.length > 0 ? (
                overview.recentActivity.map((act) => {
                  const isSuccess = act.status === 'SUCCESS';
                  const isBlocked = act.status === 'BLOCKED' || act.status === 'FAILED';
                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isBlocked ? (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-white font-mono">{act.userId}</span>
                          {act.name && act.name !== 'Unknown' && (
                            <span className="text-slate-300"> — {act.name}</span>
                          )}
                          <span className="text-slate-400 text-[11px] ml-2 font-mono">({act.device})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px]">{act.reason}</span>
                        <span className="text-slate-500 text-[10px]">{act.time}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">No recent activity recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: USERS                                          */}
      {/* ========================================================= */}
      {activeSection === 'users' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AUTHORIZED USERS ({usersList.length})
              </h2>
              <p className="text-xs text-slate-400">
                User accounts configured in server-side environment variables (.env)
              </p>
            </div>
            <button
              onClick={() => {
                setAddUserError(null);
                setIsAddUserModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Registered Name</th>
                  <th className="p-3">Approved Devices</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Login</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-300">{u.userId}</td>
                    <td className="p-3 font-semibold text-white">{u.name}</td>
                    <td className="p-3 font-mono">
                      <span className={u.approvedDevicesCount >= 2 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {u.approvedDevicesCount} / {u.maxDevices}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status.includes('Active')
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : u.status.includes('Max')
                            ? 'bg-amber-500/20 text-amber-300'
                            : u.status.includes('Pending')
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">{u.lastLogin}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setRenameTarget({ userId: u.userId, currentName: u.name, isDevice: false });
                          setNewNameInput(u.name);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Rename User Display Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: DEVICE REQUESTS                                */}
      {/* ========================================================= */}
      {activeSection === 'requests' && (() => {
        const pendingList = requests.filter((r) => r.status === 'pending');
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  PENDING DEVICE APPROVAL REQUESTS ({pendingList.length})
                </h2>
                <p className="text-xs text-slate-400">Requests created when authenticated users connect with a new device</p>
              </div>
            </div>

            {pendingList.length === 0 ? (
              <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">No Pending Requests</div>
                <p className="text-xs text-slate-400">All device connection requests have been reviewed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingList.map((req) => (
                  <div
                    key={req.requestId}
                    className="p-5 rounded-2xl bg-slate-900 border border-amber-500/50 shadow-lg shadow-amber-500/5 space-y-4"
                  >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-white text-sm">🔐 NEW DEVICE REQUEST</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      🟡 PENDING
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">User ID:</div>
                      <div className="font-mono font-bold text-cyan-300">{req.userId}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Name:</div>
                      <div className="font-bold text-white">{req.name}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Device:</div>
                      <div className="text-slate-200">{req.friendlyName}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Operating System:</div>
                      <div className="text-slate-200">{req.operatingSystem}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Browser:</div>
                      <div className="text-slate-200">{req.browser}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Request Time:</div>
                      <div className="text-slate-400 text-[11px]">{req.requestTime}</div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Trusted Device ID:</span>
                    <span className="text-indigo-300 font-semibold">{req.deviceId.slice(0, 8)}...</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setApproveConfirmTarget(req)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>✓ APPROVE</span>
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req)}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:border-red-500/50 border border-transparent text-slate-300 hover:text-red-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>✕ REJECT</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      })()}

      {/* ========================================================= */}
      {/* SECTION 4: APPROVED DEVICES                               */}
      {/* ========================================================= */}
      {activeSection === 'devices' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">DEVICE MANAGEMENT</h2>
              <p className="text-xs text-slate-400">All registered devices and authorization states</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Device Friendly Name</th>
                  <th className="p-3">Device ID</th>
                  <th className="p-3">Browser / OS</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Login</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {devices.map((d) => (
                  <tr key={`${d.userId}_${d.deviceId}`} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-300">{d.userId}</td>
                    <td className="p-3 font-semibold text-white">{d.name}</td>
                    <td className="p-3 text-slate-200 font-medium">{d.friendlyName}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{d.deviceId.slice(0, 10)}...</td>
                    <td className="p-3 text-slate-300">
                      <div>{d.browser}</div>
                      <div className="text-[10px] text-slate-500">{d.os}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : d.status === 'revoked'
                            ? 'bg-red-500/20 text-red-300'
                            : d.status === 'rejected'
                            ? 'bg-slate-800 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {d.status === 'approved'
                          ? '✓ APPROVED'
                          : d.status === 'revoked'
                          ? '🚫 REVOKED'
                          : d.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">{d.lastLogin}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setRenameTarget({
                              userId: d.userId,
                              deviceId: d.deviceId,
                              currentName: d.friendlyName,
                              isDevice: true,
                            });
                            setNewNameInput(d.friendlyName);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Rename Device"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {d.status === 'approved' && (
                          <button
                            onClick={() => handleRevokeDevice(d.userId, d.deviceId, d.friendlyName)}
                            className="p-1.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 hover:bg-red-900/80 transition-colors"
                            title="Revoke Device Access"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 5: LOGIN HISTORY                                  */}
      {/* ========================================================= */}
      {activeSection === 'history' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">LOGIN HISTORY AUDIT TRAIL</h2>
              <p className="text-xs text-slate-400">Complete immutable record of all login and authorization attempts</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search User ID / Name / Device..."
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
                />
              </div>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="PENDING">PENDING</option>
                <option value="REVOKED">REVOKED</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Device</th>
                  <th className="p-3">Browser / OS</th>
                  <th className="p-3">Device ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">{item.time}</td>
                    <td className="p-3 font-mono font-bold text-cyan-300">{item.userId}</td>
                    <td className="p-3 font-semibold text-white">{item.name}</td>
                    <td className="p-3 text-slate-200">{item.device}</td>
                    <td className="p-3 text-slate-300">
                      <div>{item.browser}</div>
                      <div className="text-[10px] text-slate-500">{item.os}</div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{item.deviceId.slice(0, 8)}...</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'FAILED'
                            ? 'bg-red-500/20 text-red-300'
                            : item.status === 'BLOCKED'
                            ? 'bg-rose-500/20 text-rose-300'
                            : item.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 6: SECURITY EVENTS                                */}
      {/* ========================================================= */}
      {activeSection === 'events' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">SECURITY EVENTS AUDIT FEED</h2>
            <p className="text-xs text-slate-400">Real-time log of device detections, approvals, revocations, and authentication states</p>
          </div>

          <div className="space-y-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                    {ev.eventType}
                  </span>
                  <span className="font-mono font-bold text-white">{ev.userId}</span>
                  {ev.name && ev.name !== 'Unknown' && (
                    <span className="text-slate-300">— {ev.name}</span>
                  )}
                  <span className="text-slate-400 font-mono text-[11px]">({ev.device})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-300 text-[11px]">{ev.details}</span>
                  <span className="text-slate-500 text-[10px] font-mono whitespace-nowrap">{ev.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: APPROVAL CONFIRMATION MODAL                      */}
      {/* ========================================================= */}
      {approveConfirmTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Key className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Approve Device Authorization</h3>
              <p className="text-xs text-slate-400">
                Enter the 6-digit administrator authorization passkey to approve hardware access.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono font-bold text-cyan-300">{approveConfirmTarget.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-bold text-white">{approveConfirmTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Device:</span>
                <span className="text-slate-200">{approveConfirmTarget.friendlyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Device ID:</span>
                <span className="font-mono text-indigo-300">{approveConfirmTarget.deviceId.slice(0, 10)}...</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmApproval();
              }}
              className="space-y-4 pt-1"
            >
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Admin 6-Digit Passkey</span>
                </label>

                {/* 6 Individual PIN Input Boxes with Animated Focus */}
                <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-1">
                  {pinDigits.map((digit, idx) => {
                    const isFilled = Boolean(digit);
                    return (
                      <input
                        key={idx}
                        ref={(el) => {
                          pinInputRefs.current[idx] = el;
                        }}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        onPaste={handleDigitPaste}
                        className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-2xl bg-slate-950 border transition-all duration-200 outline-none select-none ${
                          passkeyError
                            ? 'border-rose-500/80 text-rose-300 shadow-lg shadow-rose-500/15'
                            : isFilled
                            ? 'border-emerald-500/80 text-emerald-300 shadow-md shadow-emerald-500/20 scale-[1.03]'
                            : 'border-slate-800 text-white hover:border-slate-700'
                        } focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 focus:scale-105 focus:bg-slate-900`}
                      />
                    );
                  })}
                </div>

                {passkeyError && (
                  <p className="text-rose-400 text-[11px] font-medium text-center animate-shake">
                    {passkeyError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setApproveConfirmTarget(null);
                    setPinDigits(['', '', '', '', '', '']);
                    setPasskeyError(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving || pinDigits.some((d) => !d)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isApproving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Device</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RENAME MODAL (USER OR DEVICE)                    */}
      {/* ========================================================= */}
      {renameTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white">
              {renameTarget.isDevice ? 'Rename Device Description' : 'Edit User Display Name'}
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">
                {renameTarget.isDevice ? 'Friendly Device Name' : 'Display Name'}
              </label>
              <input
                type="text"
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                placeholder="Enter new name"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD NEW USER MODAL (AUTO-HASHED TO .ENV)         */}
      {/* ========================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Authorized User</h3>
                  <p className="text-[11px] text-slate-400">Auto SHA-256 hashed & stored into .env</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  User ID (Phone Number)
                </label>
                <input
                  type="text"
                  required
                  value={newUserIdInput}
                  onChange={(e) => setNewUserIdInput(e.target.value)}
                  placeholder="Enter phone number (e.g. 9876543210)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Password (Registration Number)
                </label>
                <input
                  type="password"
                  required
                  value={newUserPasswordInput}
                  onChange={(e) => setNewUserPasswordInput(e.target.value)}
                  placeholder="Enter registration number / password"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Display Name <span className="text-slate-500 lowercase font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newUserNameInput}
                  onChange={(e) => setNewUserNameInput(e.target.value)}
                  placeholder="Enter user full name"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 leading-relaxed">
                🔒 <strong>Security Note:</strong> The password will automatically be SHA-256 hashed and appended directly to the server <code>.env</code> file. When this user logs in for the first time, they will undergo the device approval workflow.
              </div>

              {addUserError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  {addUserError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser || !newUserIdInput.trim() || !newUserPasswordInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAddingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Hashing & Saving...</span>
                    </>
                  ) : (
                    <span>Add User to .env</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
