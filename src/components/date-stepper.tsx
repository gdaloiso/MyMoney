import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, parseISODate } from '@/lib/format';
import { occurrenceDate } from '@/lib/recurring';

/** Selettore data con salto di giorno (‹ ›) e di mese (« »). */
export function DateStepper({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const theme = useTheme();
  const label = parseISODate(date).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const btn = (name: 'play-back' | 'chevron-back' | 'chevron-forward' | 'play-forward', onPress: () => void) => (
    <Pressable hitSlop={10} onPress={onPress} style={styles.btn}>
      <Ionicons name={name} size={name.startsWith('play') ? 16 : 22} color={theme.text} />
    </Pressable>
  );
  return (
    <View
      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {btn('play-back', () => onChange(occurrenceDate(date, 'monthly', -1)))}
      {btn('chevron-back', () => onChange(addDays(date, -1)))}
      <ThemedText style={styles.label}>{label}</ThemedText>
      {btn('chevron-forward', () => onChange(addDays(date, 1)))}
      {btn('play-forward', () => onChange(occurrenceDate(date, 'monthly', 1)))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btn: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  label: { flex: 1, textAlign: 'center' },
});
