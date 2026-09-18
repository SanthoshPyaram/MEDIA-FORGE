import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  XCircle,
  RefreshCw,
  Fingerprint,
  Phone,
  Key,
  X,
  ArrowRight,
} from 'lucide-react';
import { isBiometricSupported, verifyAdminBiometric } from '@/utils/biometricAuth';

type GatewayScreen =
  | 'LOGIN'
  | 'NEW_DEVICE_DETECTED'
  | 'WAITING_APPROVAL'
  | 'DEVICE_LIMIT_REACHED'
  | 'DEVICE_REVOKED'
  | 'DEVICE_REJECTED';

export interface SecurityGatewayProps {
  initialPortal?: 'USER' | 'ADMIN';
  onClose?: () => void;
  onSuccess?: () => void;
}

export const SecurityGateway: React.FC<SecurityGatewayProps> = ({
  initialPortal = 'USER',
  onClose,
  onSuccess,
}) => {
  const { login, loginWithBiometric, requestDeviceApproval, checkDeviceStatus, deviceInfo } = useAuth();

  // Portal State: USER vs ADMIN
  const [portal, setPortal] = useState<'USER' | 'ADMIN'>(initialPortal);

  useEffect(() => {
    setPortal(initialPortal);
  }, [initialPortal]);

  // Screen State Machine
  const [screen, setScreen] = useState<GatewayScreen>('LOGIN');

  // Form Fields
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittedName, setSubmittedName] = useState('');
  const [nameInput, setNameInput] = useState('');

  // Biometric Support State
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    isBiometricSupported().then((supported) => {
      setBiometricAvailable(supported);
    });
  }, []);

  // -------------------------------------------------------------
  // 1. Handle Normal Login (ID + Password)
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await login(userId.trim(), password);
    setIsSubmitting(false);

    if (res.success) {
      onSuccess?.();
      return;
    }

    switch (res.code) {
      case 'NEW_DEVICE_DETECTED':
        setScreen('NEW_DEVICE_DETECTED');
        break;
      case 'APPROVAL_PENDING':
        setSubmittedName(res.name || 'User');
        setScreen('WAITING_APPROVAL');
        break;
      case 'DEVICE_LIMIT_REACHED':
        setScreen('DEVICE_LIMIT_REACHED');
        break;
      case 'DEVICE_REVOKED':
        setErrorMessage(res.error || 'Access from this device has been revoked by the administrator.');
        setScreen('DEVICE_REVOKED');
        break;
      case 'DEVICE_REJECTED':
        setErrorMessage(res.error || 'Your device request was rejected.');
        setScreen('DEVICE_REJECTED');
        break;
      default:
        setErrorMessage(res.error || 'Invalid ID or password.');
    }
  };

  // -------------------------------------------------------------
  // 2. Handle Admin Biometric Fingerprint Login
  // -------------------------------------------------------------
  const handleBiometricAdminLogin = async () => {
    if (isBiometricScanning) return;
    setIsBiometricScanning(true);
    setErrorMessage(null);

    try {
      const bioResult = await verifyAdminBiometric('24MIC7312');
      if (!bioResult.success) {
        setErrorMessage(bioResult.error || 'Fingerprint verification cancelled.');
        setIsBiometricScanning(false);
        return;
      }

      // Biometric scan succeeded on device, authenticate
      const loginRes = await loginWithBiometric('24MIC7312');
      setIsBiometricScanning(false);

      if (!loginRes.success) {
        setErrorMessage(loginRes.error || 'Biometric authentication failed.');
      } else {
        onSuccess?.();
      }
    } catch (err: any) {
      setIsBiometricScanning(false);
      setErrorMessage(err.message || 'Biometric authentication error.');
    }
  };

  // -------------------------------------------------------------
  // 3. Handle Name Submission for New Device Approval
  // -------------------------------------------------------------
  const handleRequestApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await requestDeviceApproval(userId.trim(), nameInput.trim());
    setIsSubmitting(false);

    if (res.success) {
      setSubmittedName(nameInput.trim());
      setScreen('WAITING_APPROVAL');
    } else {
      setErrorMessage(res.error || 'Failed to submit approval request.');
    }
  };

  // -------------------------------------------------------------
  // 4. Handle Status Check
  // -------------------------------------------------------------
  const handleCheckStatus = async () => {
    if (isCheckingStatus) return;
    setIsCheckingStatus(true);
    setStatusMessage(null);

    const res = await checkDeviceStatus(userId.trim());
    setIsCheckingStatus(false);

    if (res.status === 'approved') {
      onSuccess?.();
    } else if (res.status === 'rejected') {
      setScreen('DEVICE_REJECTED');
    } else if (res.status === 'revoked') {
      setScreen('DEVICE_REVOKED');
    } else {
      setStatusMessage('Request is still pending administrator approval.');
    }
  };

  const handleResetToLogin = () => {
    setScreen('LOGIN');
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const isAdminPortal = portal === 'ADMIN';

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 relative select-none animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Brand Icon & Heading */}
      <div className="text-center space-y-1.5 mb-5">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 mb-1">
          {isAdminPortal ? <Shield className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        </div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          {isAdminPortal ? 'Administrator Portal' : 'MediaForge Sign In'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isAdminPortal
            ? 'Restricted to system administrators'
            : 'Private access for authorized personnel'}
        </p>
      </div>

      {/* Segmented Switcher: User vs Admin */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-5">
        <button
          type="button"
          onClick={() => {
            setPortal('USER');
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            !isAdminPortal
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>User Access</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPortal('ADMIN');
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            isAdminPortal
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Administrator</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SCREEN 1: LOGIN                                           */}
      {/* ========================================================= */}
      {screen === 'LOGIN' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* User / Admin ID Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isAdminPortal ? 'Administrator ID' : 'User ID'}
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                {isAdminPortal ? 'Admin Account' : 'Phone Number'}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                {isAdminPortal ? <Shield className="w-4 h-4 text-indigo-500" /> : <Phone className="w-4 h-4 text-indigo-500" />}
              </div>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={isAdminPortal ? 'Enter Administrator ID' : 'Use your phone number'}
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                {isAdminPortal ? 'Admin Passcode' : 'Registration Number'}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4 text-indigo-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAdminPortal ? 'Enter Password' : 'Your registration number'}
                autoComplete="current-password"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !userId.trim() || !password}
            className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>{isAdminPortal ? 'Sign In as Administrator' : 'Sign In to MediaForge'}</span>
            )}
          </button>

          {/* Biometric Fingerprint Option for Admin */}
          {isAdminPortal && biometricAvailable && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleBiometricAdminLogin}
                disabled={isBiometricScanning}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className={`w-4 h-4 text-indigo-500 ${isBiometricScanning ? 'animate-pulse' : ''}`} />
                <span>
                  {isBiometricScanning
                    ? 'Scanning Fingerprint / Windows Hello...'
                    : 'Fingerprint / Windows Hello Login'}
                </span>
              </button>
            </div>
          )}

          {/* Device Identifier Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-slate-400" />
              <span>{deviceInfo.friendlyName || 'Current Device'}</span>
            </span>
            <span className="font-mono text-[10px]">
              ID: {deviceInfo.deviceId.slice(0, 8)}...
            </span>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* SCREEN 2: NEW DEVICE DETECTED (NAME INPUT)                */}
      {/* ========================================================= */}
      {screen === 'NEW_DEVICE_DETECTED' && (
        <div className="space-y-4">
          <div className="text-center space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">New Device Detected</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This device hasn't been approved yet. Enter your name to request administrator approval.
            </p>
          </div>

          <form onSubmit={handleRequestApproval} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !nameInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-sm shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Submitting Request...' : 'Request Device Approval'}
            </button>

            <button
              type="button"
              onClick={handleResetToLogin}
              className="w-full py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 3: WAITING FOR APPROVAL                            */}
      {/* ========================================================= */}
      {screen === 'WAITING_APPROVAL' && (
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Submitted</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hello <strong className="font-semibold text-slate-800 dark:text-slate-200">{submittedName}</strong>. Your device request is awaiting administrator approval.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 inline-flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Status: Pending Approval</span>
          </div>

          {statusMessage && (
            <p className="text-xs text-slate-600 dark:text-slate-400">{statusMessage}</p>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={isCheckingStatus}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCheckingStatus ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Status...</span>
                </>
              ) : (
                <span>Check Approval Status</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetToLogin}
              className="w-full py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 4: MAXIMUM 2 DEVICES REACHED                       */}
      {/* ========================================================= */}
      {screen === 'DEVICE_LIMIT_REACHED' && (
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto text-red-500">
            <XCircle className="w-5 h-5" />
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">Device Limit Reached</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your account already has 2 approved devices. Contact the administrator to revoke an existing device.
          </p>

          <button
            type="button"
            onClick={handleResetToLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 5: DEVICE REVOKED                                  */}
      {/* ========================================================= */}
      {screen === 'DEVICE_REVOKED' && (
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto text-red-500">
            <XCircle className="w-5 h-5" />
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">Access Revoked</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Access from this device has been revoked by the administrator.
          </p>

          <button
            type="button"
            onClick={handleResetToLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 6: DEVICE REJECTED                                 */}
      {/* ========================================================= */}
      {screen === 'DEVICE_REJECTED' && (
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto text-red-500">
            <XCircle className="w-5 h-5" />
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Rejected</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your device access request was not approved by the administrator.
          </p>

          <button
            type="button"
            onClick={handleResetToLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
};
export default SecurityGateway;
