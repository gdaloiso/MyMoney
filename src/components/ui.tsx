import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, monthKey, monthLabel, toISODate } from '@/lib/format';

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }, style]}
      {...props}
    />
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const theme = useTheme();
  const current = monthKey(toISODate(new Date()));
  const arrow = (name: 'chevron-back' | 'chevron-forward', delta: number, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => onChange(addMonths(month, delta))}
      style={({ pressed }) => [
        styles.arrow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { opacity: 0.5 },
      ]}>
      <Ionicons name={name} size={26} color={theme.text} />
    </Pressable>
  );
  return (
    <View style={styles.switcher}>
      {arrow('chevron-back', -1, 'Mese precedente')}
      <Pressable
        disabled={month === current}
        onPress={() => onChange(current)}
        style={styles.monthBox}>
        <ThemedText type="subtitle" style={styles.monthText}>
          {monthLabel(month)}
        </ThemedText>
        {month !== current ? (
          <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700' }}>
            Torna al mese corrente
          </ThemedText>
        ) : null}
      </Pressable>
      {arrow('chevron-forward', 1, 'Mese successivo')}
    </View>
  );
}

export function EmptyState({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={theme.textSecondary} />
      <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {text}
      </ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.action, { borderColor: theme.accent }]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: Spacing.three, gap: Spacing.two, borderWidth: StyleSheet.hairlineWidth },
  sectionTitle: { marginTop: Spacing.three, marginBottom: Spacing.one, letterSpacing: 0.8 },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthBox: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  monthText: { fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.five },
  action: {
    marginTop: Spacing.two,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderWidth: 1.5,
  },
});
