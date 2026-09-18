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
        setErrorMessage(res.error || '❌ Invalid ID or password.');
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
        setErrorMessage(bioResult.error || 'Fingerprint verification failed.');
        setIsBiometricScanning(false);
        return;
      }

      // Biometric scan succeeded on device, authenticate on server
      const loginRes = await loginWithBiometric('24MIC7312');
      setIsBiometricScanning(false);

      if (!loginRes.success) {
        setErrorMessage(loginRes.error || 'Server authentication failed.');
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
      setStatusMessage('✓ Your device has been approved! Redirecting to MediaForge...');
    } else if (res.status === 'pending') {
      setStatusMessage('🟡 Waiting for administrator approval.');
    } else if (res.status === 'rejected') {
      setStatusMessage('❌ Your device request was rejected.');
      setScreen('DEVICE_REJECTED');
    } else if (res.status === 'revoked') {
      setStatusMessage('🚫 Device access has been revoked.');
      setScreen('DEVICE_REVOKED');
    } else {
      setStatusMessage('Unknown device status. Please try logging in again.');
    }
  };

  const handleResetToLogin = () => {
    setPassword('');
    setErrorMessage(null);
    setStatusMessage(null);
    setScreen('LOGIN');
  };

  const isAdminPortal = portal === 'ADMIN';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#05080c] text-slate-100 relative overflow-hidden select-none">
      {/* Dynamic Ambient Aura (Emerald for User, Rose for Admin) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-all duration-700">
        <div
          className={`absolute -top-32 -right-32 w-96 h-96 sm:w-[540px] sm:h-[540px] rounded-full blur-[150px] transition-all duration-700 ${
            isAdminPortal ? 'bg-rose-600/15' : 'bg-emerald-500/15'
          }`}
          style={{ animation: 'float 10s ease-in-out infinite' }}
        />
        <div
          className={`absolute top-1/2 -left-32 w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full blur-[150px] transition-all duration-700 ${
            isAdminPortal ? 'bg-red-700/15' : 'bg-teal-600/15'
          }`}
          style={{ animation: 'float 12s ease-in-out infinite reverse' }}
        />
        <div
          className={`absolute -bottom-40 right-1/4 w-80 h-80 rounded-full blur-[160px] transition-all duration-700 ${
            isAdminPortal ? 'bg-amber-700/10' : 'bg-cyan-600/10'
          }`}
        />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-2 right-0 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close and return to Public Home"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div
            className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr ${
              isAdminPortal
                ? 'from-rose-600 via-red-500 to-amber-500 shadow-rose-500/25'
                : 'from-emerald-500 via-teal-500 to-cyan-400 shadow-emerald-500/20'
            } p-0.5 shadow-xl mb-1 transition-all duration-500`}
          >
            <div className="w-full h-full bg-[#090e15] rounded-[14px] flex items-center justify-center">
              <Shield
                className={`w-7 h-7 transition-colors duration-500 ${
                  isAdminPortal ? 'text-rose-400' : 'text-emerald-400'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-center">
            {isAdminPortal ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold tracking-wide uppercase">
                <Shield className="w-3.5 h-3.5" />
                <span>Authorized Personnel Only</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold tracking-wide uppercase">
                <Lock className="w-3.5 h-3.5" />
                <span>Only for specified users</span>
              </div>
            )}
          </div>

          <h1
            className={`text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${
              isAdminPortal
                ? 'from-white via-rose-100 to-red-300'
                : 'from-white via-emerald-100 to-teal-300'
            }`}
          >
            {isAdminPortal ? 'ADMINISTRATOR PORTAL' : 'MEDIAFORGE USER ACCESS'}
          </h1>
          <p className="text-xs text-slate-400">
            {isAdminPortal
              ? 'Restricted Access — Admin Credentials Required'
              : 'Private Access Gateway — Enter Your Credentials to Continue'}
          </p>
        </div>

        {/* ========================================================= */}
        {/* SCREEN 1: LOGIN (CUSTOM USER VS ADMIN MODES)              */}
        {/* ========================================================= */}
        {screen === 'LOGIN' && (
          <div
            className={`p-7 rounded-3xl bg-[#090e15]/90 backdrop-blur-2xl border ${
              isAdminPortal
                ? 'border-rose-500/25 shadow-rose-950/40'
                : 'border-emerald-500/20 shadow-emerald-950/40'
            } shadow-2xl space-y-5 transition-colors duration-500`}
          >
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* User ID Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    {isAdminPortal ? 'Administrator ID' : 'User ID'}
                  </label>
                  <span
                    className={`text-[10px] font-medium ${
                      isAdminPortal ? 'text-rose-400/80' : 'text-emerald-400/80'
                    }`}
                  >
                    {isAdminPortal ? 'Admin Account' : 'Use Phone Number'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    {isAdminPortal ? <Shield className="w-4 h-4 text-rose-400" /> : <Phone className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder={isAdminPortal ? 'Enter Administrator ID' : 'Use your phone number'}
                    autoComplete="username"
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#05080c]/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      isAdminPortal
                        ? 'focus:ring-rose-500/50 focus:border-rose-500'
                        : 'focus:ring-emerald-500/50 focus:border-emerald-500'
                    } transition-all font-mono`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    {isAdminPortal ? 'Administrator Password' : 'Password'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isAdminPortal ? 'Secret Passcode' : 'Registration Number'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key className={`w-4 h-4 ${isAdminPortal ? 'text-rose-400' : 'text-emerald-400'}`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isAdminPortal ? 'Enter Administrator Password' : 'Your registration number'}
                    autoComplete="current-password"
                    className={`w-full pl-10 pr-12 py-2.5 bg-[#05080c]/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      isAdminPortal
                        ? 'focus:ring-rose-500/50 focus:border-rose-500'
                        : 'focus:ring-emerald-500/50 focus:border-emerald-500'
                    } transition-all font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !userId.trim() || !password}
                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  isAdminPortal
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 shadow-rose-600/25 hover:shadow-rose-600/40'
                    : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-emerald-600/25 hover:shadow-emerald-600/40'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>{isAdminPortal ? 'SIGN IN AS ADMINISTRATOR' : 'SIGN IN TO MEDIAFORGE'}</span>
                )}
              </button>

              {/* Biometric Fingerprint Option for Admin Portal */}
              {isAdminPortal && biometricAvailable && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleBiometricAdminLogin}
                    disabled={isBiometricScanning}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/40 hover:border-rose-400/50 text-rose-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Fingerprint className={`w-4 h-4 text-rose-400 ${isBiometricScanning ? 'animate-pulse' : ''}`} />
                    <span>
                      {isBiometricScanning
                        ? 'Scanning Fingerprint / Windows Hello...'
                        : 'Admin Fingerprint / Windows Hello Login'}
                    </span>
                  </button>
                </div>
              )}

              {/* Toggle Between User Sign-In and Admin Sign-In */}
              <div className="pt-2 text-center">
                {isAdminPortal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPortal('USER');
                      setErrorMessage(null);
                      setUserId('');
                      setPassword('');
                    }}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>← Are you a user? Sign in here</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPortal('ADMIN');
                      setErrorMessage(null);
                      setUserId('');
                      setPassword('');
                    }}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Are you an Admin? Sign in here</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </form>

            {/* Trusted Device Identity Badge */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Laptop className={`w-3.5 h-3.5 ${isAdminPortal ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span>{deviceInfo.friendlyName || 'Current Device'}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Trusted Device ID: {deviceInfo.deviceId.slice(0, 8)}...
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: NEW DEVICE DETECTED (NAME REQUEST)              */}
        {/* ========================================================= */}
        {screen === 'NEW_DEVICE_DETECTED' && (
          <div className="p-7 rounded-3xl bg-[#090e15]/95 backdrop-blur-2xl border border-amber-500/40 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-amber-300">🔐 NEW DEVICE DETECTED</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your account has not been approved on this device yet.
                <br />
                Please enter your name to request administrator approval.
              </p>
            </div>

            <form onSubmit={handleRequestApproval} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 bg-[#05080c]/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !nameInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Submitting Request...' : 'REQUEST APPROVAL'}
              </button>

              <button
                type="button"
                onClick={handleResetToLogin}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
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
          <div className="p-7 rounded-3xl bg-[#090e15]/95 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-emerald-400">✓ REQUEST SENT</h2>
              <p className="text-sm font-semibold text-white">Hello {submittedName}.</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your details and device information have been sent to the administrator.
              <br />
              You can use MediaForge after the administrator approves this device.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
              <span>Status:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>🟡 WAITING FOR APPROVAL</span>
              </span>
            </div>

            {statusMessage && (
              <div className="p-3 rounded-xl bg-slate-850 text-xs text-cyan-300">
                {statusMessage}
              </div>
            )}

            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isCheckingStatus}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>CHECK STATUS</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToLogin}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                LOGOUT
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: MAXIMUM 2 DEVICES LIMIT REACHED                 */}
        {/* ========================================================= */}
        {screen === 'DEVICE_LIMIT_REACHED' && (
          <div className="p-7 rounded-3xl bg-[#090e15]/95 backdrop-blur-2xl border border-red-500/40 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <XCircle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-red-400">🚫 DEVICE LIMIT REACHED</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your account already has 2 approved devices.
              <br />
              Ask the administrator to revoke an existing device before adding another.
            </p>

            <button
              type="button"
              onClick={handleResetToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              LOGOUT
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: DEVICE REVOKED                                  */}
        {/* ========================================================= */}
        {screen === 'DEVICE_REVOKED' && (
          <div className="p-7 rounded-3xl bg-[#090e15]/95 backdrop-blur-2xl border border-red-600/50 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <XCircle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-red-400">🚫 ACCESS REVOKED</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Access from this device has been revoked by the administrator.
            </p>

            <button
              type="button"
              onClick={handleResetToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              BACK TO LOGIN
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 6: DEVICE REQUEST REJECTED                         */}
        {/* ========================================================= */}
        {screen === 'DEVICE_REJECTED' && (
          <div className="p-7 rounded-3xl bg-[#090e15]/95 backdrop-blur-2xl border border-red-600/50 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <XCircle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-red-400">❌ REQUEST REJECTED</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your device request was rejected by the administrator.
            </p>

            <button
              type="button"
              onClick={handleResetToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              BACK TO LOGIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
