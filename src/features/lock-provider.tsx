import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

const KEY_HASH = 'mymoney_pin_hash';
const KEY_SALT = 'mymoney_pin_salt';
const KEY_BIO = 'mymoney_lock_biometric';

/** Dopo quanto tempo in background l'app si blocca di nuovo. */
const RELOCK_AFTER_MS = 30_000;

type Ctx = {
  ready: boolean;
  /** PIN impostato e blocco attivo. */
  enabled: boolean;
  locked: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricLabel: string;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  disableLock: () => Promise<void>;
  setBiometricEnabled: (on: boolean) => Promise<boolean>;
  tryBiometric: () => Promise<boolean>;
  unlock: () => void;
};

const LockContext = createContext<Ctx | null>(null);

const hashPin = (salt: string, pin: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricState] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('impronta');

  const enabledRef = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hash, bio, hasHw, enrolled, types] = await Promise.all([
        SecureStore.getItemAsync(KEY_HASH),
        SecureStore.getItemAsync(KEY_BIO),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      if (cancelled) return;
      const isOn = !!hash;
      enabledRef.current = isOn;
      setEnabled(isOn);
      setLocked(isOn);
      setBiometricState(bio === '1');
      setBiometricAvailable(hasHw && enrolled);
      setBiometricLabel(
        types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
          ? 'Face ID / riconoscimento facciale'
          : 'impronta digitale',
      );
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ribloccare quando si torna da lontano. Uso 'background' (non 'inactive'): su iOS
  // 'inactive' scatta anche durante il prompt di Face ID.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now();
      else if (state === 'active') {
        const at = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabledRef.current && at && Date.now() - at >= RELOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    const salt = Crypto.randomUUID();
    await SecureStore.setItemAsync(KEY_SALT, salt);
    await SecureStore.setItemAsync(KEY_HASH, await hashPin(salt, pin));
    enabledRef.current = true;
    setEnabled(true);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const [salt, hash] = await Promise.all([
      SecureStore.getItemAsync(KEY_SALT),
      SecureStore.getItemAsync(KEY_HASH),
    ]);
    if (!salt || !hash) return false;
    return (await hashPin(salt, pin)) === hash;
  }, []);

  const disableLock = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_HASH),
      SecureStore.deleteItemAsync(KEY_SALT),
      SecureStore.deleteItemAsync(KEY_BIO),
    ]);
    enabledRef.current = false;
    setEnabled(false);
    setBiometricState(false);
    setLocked(false);
  }, []);

  const authenticate = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sblocca MyMoney',
      cancelLabel: 'Usa il PIN',
      disableDeviceFallback: true,
    });
    return res.success;
  }, []);

  const setBiometricEnabled = useCallback(
    async (on: boolean) => {
      if (on && !(await authenticate())) return false;
      if (on) await SecureStore.setItemAsync(KEY_BIO, '1');
      else await SecureStore.deleteItemAsync(KEY_BIO);
      setBiometricState(on);
      return true;
    },
    [authenticate],
  );

  const tryBiometric = useCallback(async () => {
    if (!(await authenticate())) return false;
    setLocked(false);
    return true;
  }, [authenticate]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      enabled,
      locked,
      biometricAvailable,
      biometricEnabled,
      biometricLabel,
      setupPin,
      verifyPin,
      disableLock,
      setBiometricEnabled,
      tryBiometric,
      unlock: () => setLocked(false),
    }),
    [
      ready,
      enabled,
      locked,
      biometricAvailable,
      biometricEnabled,
      biometricLabel,
      setupPin,
      verifyPin,
      disableLock,
      setBiometricEnabled,
      tryBiometric,
    ],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): Ctx {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside LockProvider');
  return ctx;
}
