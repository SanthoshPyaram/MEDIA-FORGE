/**
 * WebAuthn Platform Biometric Authenticator (Fingerprint, Touch ID, Windows Hello)
 * Enables hardware-level biometric authentication for Administrator verification.
 */

const STORAGE_KEY_BIO_CRED = 'mediaforge_admin_bio_cred_id';

/**
 * Checks whether the browser and OS platform support biometric verification (Fingerprint / Windows Hello).
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Checks whether an admin biometric credential has already been enrolled on this device.
 */
export function isBiometricEnrolled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return Boolean(localStorage.getItem(STORAGE_KEY_BIO_CRED));
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Enrolls the Administrator's biometric hardware (Windows Hello Fingerprint / Touch ID).
 */
export async function registerAdminBiometric(adminId = '24MIC7312'): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(adminId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'MediaForge Security Control Center',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: adminId,
          displayName: 'Administrator (MediaForge)',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Biometric enrollment was cancelled.' };
    }

    const rawIdBase64 = bufferToBase64(credential.rawId);
    localStorage.setItem(STORAGE_KEY_BIO_CRED, rawIdBase64);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'NotAllowedError' ? 'Biometric scan was cancelled or timed out.' : err.message,
    };
  }
}

/**
 * Prompts the Administrator to touch their fingerprint / authenticate with Windows Hello.
 */
export async function verifyAdminBiometric(adminId = '24MIC7312'): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const savedCredId = localStorage.getItem(STORAGE_KEY_BIO_CRED);
    const allowCredentials: PublicKeyCredentialDescriptor[] = savedCredId
      ? [
          {
            id: base64ToBuffer(savedCredId),
            type: 'public-key',
            transports: ['internal'],
          },
        ]
      : [];

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: 'Biometric scan was cancelled.' };
    }

    // Save/update credential on success
    if (assertion.rawId) {
      localStorage.setItem(STORAGE_KEY_BIO_CRED, bufferToBase64(assertion.rawId));
    }

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Fingerprint scan was cancelled or not recognized.' };
    }
    // If credential was not registered yet, auto-attempt registration
    if (err.name === 'InvalidStateError' || !localStorage.getItem(STORAGE_KEY_BIO_CRED)) {
      return await registerAdminBiometric(adminId);
    }
    return { success: false, error: err.message || 'Biometric authentication failed.' };
  }
}
