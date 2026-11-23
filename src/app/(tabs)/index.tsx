import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UpcomingCard } from '@/components/upcoming-card';
import { Card, EmptyState, MonthSwitcher } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTransactions } from '@/features/transactions-provider';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney, monthKey, toISODate } from '@/lib/format';
import { forMonth, totals } from '@/lib/report';

export default function HomeScreen() {
  const theme = useTheme();
  const { transactions } = useTransactions();
  const [month, setMonth] = useState(() => monthKey(toISODate(new Date())));

  const monthTx = useMemo(() => forMonth(transactions, month), [transactions, month]);
  const t = useMemo(() => totals(monthTx), [monthTx]);

  return (
    <View style={styles.screen}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <MonthSwitcher month={month} onChange={setMonth} />

      <Card style={styles.balanceCard}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.balanceLabel}>
          SALDO DEL MESE
        </ThemedText>
        <ThemedText
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.balance, { color: t.balance >= 0 ? theme.income : theme.expense }]}>
          {formatMoney(t.balance)}
        </ThemedText>

        <View style={styles.split}>
          <FlowTile
            icon="arrow-down"
            color={theme.income}
            label="Entrate"
            value={formatMoney(t.income)}
          />
          <FlowTile
            icon="arrow-up"
            color={theme.expense}
            label="Uscite"
            value={formatMoney(t.expense)}
          />
        </View>
      </Card>

      <UpcomingCard />

      {transactions.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          text="Ancora nessun movimento. Aggiungi il primo con il pulsante qui sotto."
        />
      ) : null}
    </ScrollView>

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Aggiungi un movimento"
      onPress={() => router.push('/add')}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.accent },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
      ]}>
      <Ionicons name="add" size={28} color="#fff" />
      <ThemedText style={styles.fabText}>Nuovo movimento</ThemedText>
    </Pressable>
    </View>
  );
}

function FlowTile({
  icon,
  color,
  label,
  value,
}: {
  icon: 'arrow-down' | 'arrow-up';
  color: string;
  label: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.background }]}>
      <View style={[styles.tileIcon, { backgroundColor: color + '26' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText adjustsFontSizeToFit numberOfLines={1} style={{ color, fontWeight: '700', fontSize: 17 }}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  balanceCard: { gap: Spacing.one, padding: Spacing.four, borderRadius: 24 },
  balanceLabel: { letterSpacing: 0.8 },
  balance: { fontSize: 44, lineHeight: 54, fontWeight: '800' },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
  },
  tileIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // spazio extra in fondo: il pulsante flottante non deve coprire il contenuto
  content: { padding: Spacing.three, paddingBottom: 120 },
  split: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  flex: { flex: 1 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 14,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.four,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
