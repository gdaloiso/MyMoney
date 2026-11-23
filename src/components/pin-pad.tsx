import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const PIN_LENGTH = 4;

type Props = {
  title: string;
  subtitle?: string;
  error?: string;
  disabled?: boolean;
  /** Chiamato a PIN completo. Il tastierino si svuota subito dopo. */
  onComplete: (pin: string) => void;
  /** Se presente, mostra il tasto biometrico in basso a sinistra. */
  onBiometric?: () => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'] as const;

export function PinPad({ title, subtitle, error, disabled, onComplete, onBiometric }: Props) {
  const theme = useTheme();
  const [digits, setDigits] = useState('');

  const press = (k: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (k === 'bio') return onBiometric?.();
    if (k === 'del') return setDigits((d) => d.slice(0, -1));
    const next = digits + k;
    if (next.length < PIN_LENGTH) return setDigits(next);
    setDigits('');
    onComplete(next);
  };

  return (
    <View style={styles.wrap}>
      <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
        {title}
      </ThemedText>
      <ThemedText
        type="small"
        style={{ textAlign: 'center', color: error ? theme.expense : theme.textSecondary, minHeight: 20 }}>
        {error ?? subtitle ?? ''}
      </ThemedText>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: error ? theme.expense : theme.accent },
              i < digits.length && { backgroundColor: error ? theme.expense : theme.accent },
            ]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {KEYS.map((k) => {
          if (k === 'bio' && !onBiometric) return <View key={k} style={styles.key} />;
          return (
            <Pressable
              key={k}
              disabled={disabled}
              onPress={() => press(k)}
              style={({ pressed }) => [
                styles.key,
                k !== 'bio' && k !== 'del' && { backgroundColor: theme.backgroundElement },
                pressed && { opacity: 0.5 },
              ]}>
              {k === 'del' ? (
                <Ionicons name="backspace-outline" size={26} color={theme.text} />
              ) : k === 'bio' ? (
                <Ionicons name="finger-print" size={30} color={theme.accent} />
              ) : (
                <ThemedText style={styles.keyText}>{k}</ThemedText>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four },
  dots: { flexDirection: 'row', gap: Spacing.three, marginVertical: Spacing.four },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 84 + 2 * 16, gap: 16, justifyContent: 'center' },
  key: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 30, lineHeight: 36, fontWeight: '500' },
});
