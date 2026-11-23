import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { PinPad } from '@/components/pin-pad';
import { useLock } from '@/features/lock-provider';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'setup' | 'change' | 'disable';
type Step = 'verify' | 'new' | 'confirm';

const TITLES: Record<Mode, string> = {
  setup: 'Imposta PIN',
  change: 'Cambia PIN',
  disable: 'Disattiva blocco',
};

export default function PinScreen() {
  const theme = useTheme();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: Mode }>();
  const mode: Mode = modeParam === 'change' || modeParam === 'disable' ? modeParam : 'setup';
  const lock = useLock();

  const [step, setStep] = useState<Step>(mode === 'setup' ? 'new' : 'verify');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string>();

  const onComplete = async (pin: string) => {
    setError(undefined);

    if (step === 'verify') {
      if (!(await lock.verifyPin(pin))) return setError('PIN errato');
      if (mode === 'disable') {
        await lock.disableLock();
        router.back();
        return;
      }
      return setStep('new');
    }

    if (step === 'new') {
      setFirstPin(pin);
      return setStep('confirm');
    }

    // confirm
    if (pin !== firstPin) {
      setFirstPin('');
      setStep('new');
      return setError('I PIN non coincidono, riprova');
    }
    try {
      await lock.setupPin(pin);
      router.back();
      if (mode === 'setup') {
        Alert.alert(
          'Blocco attivato',
          lock.biometricAvailable
            ? `Ora puoi anche abilitare ${lock.biometricLabel} dalle impostazioni.`
            : 'MyMoney chiederà il PIN a ogni apertura.',
        );
      }
    } catch {
      setError('Non sono riuscito a salvare il PIN');
    }
  };

  const subtitle =
    step === 'verify'
      ? 'Inserisci il PIN attuale'
      : step === 'new'
        ? mode === 'change'
          ? 'Scegli il nuovo PIN (4 cifre)'
          : 'Scegli un PIN di 4 cifre'
        : 'Conferma il PIN';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: TITLES[mode] }} />
      <PinPad
        key={step}
        title={TITLES[mode]}
        subtitle={subtitle}
        error={error}
        onComplete={onComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
});
