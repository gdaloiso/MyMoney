import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { ThemedText } from '@/components/themed-text';
import { useLock } from '@/features/lock-provider';
import { useTheme } from '@/hooks/use-theme';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

/** Copre tutta l'app finché non è stato inserito il PIN (o la biometria). */
export function LockGate() {
  const { ready, locked } = useLock();
  if (ready && !locked) return null;
  return <LockOverlay />;
}

// Esiste solo mentre l'app è bloccata: errori e tentativi si azzerano a ogni nuovo blocco.
function LockOverlay() {
  const theme = useTheme();
  const lock = useLock();
  const [error, setError] = useState<string>();
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const autoTried = useRef(false);

  const useBio = lock.biometricEnabled && lock.biometricAvailable;

  // Biometria automatica appena possibile
  useEffect(() => {
    if (lock.ready && useBio && !autoTried.current) {
      autoTried.current = true;
      lock.tryBiometric();
    }
  }, [lock, useBio]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async (pin: string) => {
    if (await lock.verifyPin(pin)) {
      lock.unlock();
      return;
    }
    const n = attempts + 1;
    if (n >= MAX_ATTEMPTS) {
      setAttempts(0);
      setCooldown(LOCKOUT_SECONDS);
      setError(undefined);
    } else {
      setAttempts(n);
      setError(`PIN errato · ${MAX_ATTEMPTS - n} tentativi rimasti`);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]}>
      {lock.ready ? (
        <SafeAreaView style={styles.center}>
          <PinPad
            title="MyMoney"
            subtitle={cooldown > 0 ? undefined : 'Inserisci il PIN'}
            error={cooldown > 0 ? `Troppi tentativi. Riprova tra ${cooldown}s` : error}
            disabled={cooldown > 0}
            onComplete={submit}
            onBiometric={useBio ? lock.tryBiometric : undefined}
          />
          {useBio ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 16 }}>
              Puoi anche usare {lock.biometricLabel}
            </ThemedText>
          ) : null}
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { zIndex: 1000, elevation: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
