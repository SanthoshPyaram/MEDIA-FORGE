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
} from 'lucide-react';
import { isBiometricSupported, verifyAdminBiometric } from '@/utils/biometricAuth';

type GatewayScreen =
  | 'LOGIN'
  | 'NEW_DEVICE_DETECTED'
  | 'WAITING_APPROVAL'
  | 'DEVICE_LIMIT_REACHED'
  | 'DEVICE_REVOKED'
  | 'DEVICE_REJECTED';

export const SecurityGateway: React.FC = () => {
  const { login, loginWithBiometric, requestDeviceApproval, checkDeviceStatus, deviceInfo } = useAuth();

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#05080c] text-slate-100 relative overflow-hidden select-none">
      {/* Dynamic Cyber-Emerald & Titanium Ambient Aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 sm:w-[540px] sm:h-[540px] rounded-full blur-[150px] bg-emerald-500/15"
          style={{ animation: 'float 10s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/2 -left-32 w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full blur-[150px] bg-teal-600/15"
          style={{ animation: 'float 12s ease-in-out infinite reverse' }}
        />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 rounded-full blur-[160px] bg-cyan-600/10" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header with Emerald Accents */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-1">
            <div className="w-full h-full bg-[#090e15] rounded-[14px] flex items-center justify-center">
              <Shield className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-teal-300">
            MEDIAFORGE SECURITY
          </h1>
          <p className="text-xs text-slate-400">
            Private Device Authorization & Protected Access Gateway
          </p>
        </div>

        {/* ========================================================= */}
        {/* SCREEN 1: LOGIN (CUSTOM PHONE & REG NUMBER PLACEHOLDERS)  */}
        {/* ========================================================= */}
        {screen === 'LOGIN' && (
          <div className="p-7 rounded-3xl bg-[#090e15]/90 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl shadow-emerald-950/40 space-y-5">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* User ID Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    User ID
                  </label>
                  <span className="text-[10px] text-emerald-400/80 font-medium">Use Phone Number</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Use your phone number"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#05080c]/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Registration Number</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your registration number"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-2.5 bg-[#05080c]/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>LOGIN</span>
                )}
              </button>

              {/* Biometric Fingerprint Option for Admin */}
              {biometricAvailable && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleBiometricAdminLogin}
                    disabled={isBiometricScanning}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40 hover:border-emerald-400/50 text-emerald-300 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Fingerprint className={`w-4 h-4 text-emerald-400 ${isBiometricScanning ? 'animate-pulse' : ''}`} />
                    <span>
                      {isBiometricScanning
                        ? 'Scanning Fingerprint / Windows Hello...'
                        : 'Admin Fingerprint / Windows Hello Login'}
                    </span>
                  </button>
                </div>
              )}
            </form>

            {/* Trusted Device Identity Badge */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-emerald-400" />
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
