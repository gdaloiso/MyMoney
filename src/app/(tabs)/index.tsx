import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TransactionFilters } from '@/components/transaction-filters';
import { TransactionRow } from '@/components/transaction-row';
import { UpcomingCard } from '@/components/upcoming-card';
import { Card, EmptyState, MonthSwitcher } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/features/categories-provider';
import { useTransactions } from '@/features/transactions-provider';
import { useTheme } from '@/hooks/use-theme';
import { EMPTY_FILTER, filterTransactions, isFilterActive } from '@/lib/filter';
import { dayLabel, formatMoney, monthKey, monthLabel, toISODate } from '@/lib/format';
import { forMonth, totals } from '@/lib/report';
import type { Transaction } from '@/lib/types';

type DayGroup = { date: string; label: string; total: number; items: Transaction[] };

const signed = (t: Transaction) => (t.type === 'income' ? t.amountCents : -t.amountCents);

export default function HomeScreen() {
  const theme = useTheme();
  const { transactions, remove } = useTransactions();
  const { getCategory } = useCategories();
  const [month, setMonth] = useState(() => monthKey(toISODate(new Date())));
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const filtering = isFilterActive(filter);

  const monthTx = useMemo(() => forMonth(transactions, month), [transactions, month]);
  const t = useMemo(() => totals(monthTx), [monthTx]);

  // Il filtro agisce sul mese visualizzato; i totali in alto restano quelli dell'intero mese.
  const filtered = useMemo(
    () => filterTransactions(monthTx, filter, getCategory),
    [monthTx, filter, getCategory],
  );

  // Giorni dal più recente
  const groups = useMemo(() => {
    const days = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const list = days.get(tx.date) ?? [];
      list.push(tx);
      days.set(tx.date, list);
    }
    return [...days.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map<DayGroup>(([date, items]) => ({
        date,
        label: dayLabel(date),
        total: items.reduce((s, x) => s + signed(x), 0),
        items,
      }));
  }, [filtered]);

  const confirmDelete = (tx: Transaction) =>
    Alert.alert('Eliminare il movimento?', tx.note || 'Questa azione non si può annullare.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => remove(tx.id) },
    ]);

  const header = (
    <View style={styles.header}>
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
          <FlowTile icon="arrow-down" color={theme.income} label="Entrate" value={formatMoney(t.income)} />
          <FlowTile icon="arrow-up" color={theme.expense} label="Uscite" value={formatMoney(t.expense)} />
        </View>
      </Card>

      <UpcomingCard month={month} />

      {transactions.length > 0 ? (
        <View style={{ marginTop: Spacing.three }}>
          <TransactionFilters filter={filter} onChange={setFilter} resultCount={filtered.length} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={groups}
        keyExtractor={(g) => g.date}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListEmptyComponent={
          filtering ? (
            <EmptyState
              icon="search-outline"
              text="Nessun movimento corrisponde alla ricerca."
              actionLabel="Azzera filtri"
              onAction={() => setFilter(EMPTY_FILTER)}
            />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="wallet-outline"
              text="Ancora nessun movimento. Aggiungi il primo con il pulsante qui sotto."
            />
          ) : (
            <EmptyState icon="receipt-outline" text={`Nessun movimento a ${monthLabel(month)}.`} />
          )
        }
        renderItem={({ item: group }) => (
          <Card style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {group.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {group.total >= 0 ? '+' : '−'} {formatMoney(Math.abs(group.total))}
              </ThemedText>
            </View>
            {group.items.map((tx, i) => (
              <View key={tx.id} style={i > 0 && [styles.divider, { borderTopColor: theme.border }]}>
                <TransactionRow
                  transaction={tx}
                  onPress={() => router.push({ pathname: '/add', params: { id: String(tx.id) } })}
                  onLongPress={() => confirmDelete(tx)}
                />
              </View>
            ))}
          </Card>
        )}
        ListFooterComponent={
          groups.length ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Tocca per modificare · tieni premuto per eliminare
            </ThemedText>
          ) : undefined
        }
      />

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
  // spazio extra in fondo: il pulsante flottante non deve coprire il contenuto
  content: { paddingBottom: 120 },
  header: { padding: Spacing.three, paddingBottom: Spacing.two },
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
  split: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  flex: { flex: 1 },
  dayCard: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 0,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.one,
    paddingBottom: Spacing.one,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  hint: { textAlign: 'center', marginTop: Spacing.two },
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
