import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/features/categories-provider';
import { useRecurring } from '@/features/recurring-provider';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney, parseISODate } from '@/lib/format';
import { describeRecurrence, nextDate, type Recurring } from '@/lib/recurring';

const shortDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

export default function RecurringScreen() {
  const theme = useTheme();
  const { rules } = useRecurring();
  const active = rules.filter((r) => r.active);
  const paused = rules.filter((r) => !r.active);

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Spese ricorrenti',
          headerRight: () => (
            <Pressable hitSlop={12} onPress={() => router.push('/recurring-form')}>
              <Ionicons name="add-circle" size={28} color={theme.accent} />
            </Pressable>
          ),
        }}
      />

      {rules.length === 0 ? (
        <EmptyState
          icon="repeat"
          text="Aggiungi affitto, abbonamenti o stipendio: l'app li registra da sola alla scadenza."
          actionLabel="Nuova ricorrenza"
          onAction={() => router.push('/recurring-form')}
        />
      ) : (
        <>
          {active.length > 0 ? <SectionTitle>Attive</SectionTitle> : null}
          {active.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
          {paused.length > 0 ? <SectionTitle>In pausa</SectionTitle> : null}
          {paused.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function RuleRow({ rule }: { rule: Recurring }) {
  const theme = useTheme();
  const { getCategory } = useCategories();
  const cat = getCategory(rule.category);
  const income = rule.type === 'income';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recurring-form', params: { id: String(rule.id) } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        !rule.active && { opacity: 0.55 },
        pressed && { opacity: 0.6 },
      ]}>
      <View style={[styles.icon, { backgroundColor: cat.color + '26' }]}>
        <Ionicons name={cat.icon as never} size={20} color={cat.color} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText numberOfLines={1}>{rule.note || cat.label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {describeRecurrence(rule)}
          {rule.active ? ` · prossima: ${shortDate(nextDate(rule))}` : ''}
        </ThemedText>
      </View>
      <ThemedText style={{ fontWeight: '700', color: income ? theme.income : theme.text }}>
        {income ? '+' : '−'} {formatMoney(rule.amountCents)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
