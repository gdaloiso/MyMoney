import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, SectionList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionRow } from "@/components/transaction-row";
import { Card, EmptyState } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useCategories } from "@/features/categories-provider";
import { useTransactions } from "@/features/transactions-provider";
import { useTheme } from "@/hooks/use-theme";
import { EMPTY_FILTER, filterTransactions, isFilterActive } from "@/lib/filter";
import { dayLabel, formatMoney, monthKey, monthLabel } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type DayGroup = {
  date: string;
  label: string;
  total: number;
  items: Transaction[];
};
type MonthSection = {
  key: string;
  title: string;
  income: number;
  expense: number;
  data: DayGroup[];
};

const signed = (t: Transaction) =>
  t.type === "income" ? t.amountCents : -t.amountCents;

export default function MovementsScreen() {
  const { transactions, remove } = useTransactions();
  const theme = useTheme();
  const { getCategory } = useCategories();
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const filtering = isFilterActive(filter);

  const filtered = useMemo(
    () => filterTransactions(transactions, filter, getCategory),
    [transactions, filter, getCategory],
  );

  const sections = useMemo(() => {
    const months = new Map<string, Map<string, Transaction[]>>();
    for (const t of filtered) {
      const mk = monthKey(t.date);
      const days = months.get(mk) ?? new Map<string, Transaction[]>();
      const list = days.get(t.date) ?? [];
      list.push(t);
      days.set(t.date, list);
      months.set(mk, days);
    }
    // Ordine: mesi e giorni dal più recente
    return [...months.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map<MonthSection>(([key, days]) => {
        const data = [...days.entries()]
          .sort(([a], [b]) => b.localeCompare(a))
          .map<DayGroup>(([date, items]) => ({
            date,
            label: dayLabel(date),
            total: items.reduce((s, t) => s + signed(t), 0),
            items,
          }));
        let income = 0;
        let expense = 0;
        for (const g of data)
          for (const t of g.items) {
            if (t.type === "income") income += t.amountCents;
            else expense += t.amountCents;
          }
        return { key, title: monthLabel(key), income, expense, data };
      });
  }, [filtered]);

  const confirmDelete = (t: Transaction) =>
    Alert.alert(
      "Eliminare il movimento?",
      t.note || "Questa azione non si può annullare.",
      [
        { text: "Annulla", style: "cancel" },
        { text: "Elimina", style: "destructive", onPress: () => remove(t.id) },
      ],
    );

  return (
    <SectionList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(g) => g.date}
      stickySectionHeadersEnabled
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        transactions.length ? (
          <TransactionFilters
            filter={filter}
            onChange={setFilter}
            resultCount={filtered.length}
          />
        ) : undefined
      }
      ListEmptyComponent={
        filtering ? (
          <EmptyState
            icon="search-outline"
            text="Nessun movimento corrisponde alla ricerca."
            actionLabel="Azzera filtri"
            onAction={() => setFilter(EMPTY_FILTER)}
          />
        ) : (
          <EmptyState
            icon="receipt-outline"
            text="Ancora nessun movimento. Aggiungine uno dalla Home."
          />
        )
      }
      renderSectionHeader={({ section }) => {
        const net = section.income - section.expense;
        return (
          <View
            style={[
              styles.monthHeader,
              {
                backgroundColor: theme.background,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={styles.monthTop}>
              <ThemedText type="subtitle" style={styles.monthTitle}>
                {section.title}
              </ThemedText>
              <ThemedText
                type="default"
                style={{
                  fontWeight: "700",
                  color: net >= 0 ? theme.income : theme.expense,
                }}
              >
                {net >= 0 ? "+" : "−"} {formatMoney(Math.abs(net))}
              </ThemedText>
            </View>
            <View style={styles.monthSub}>
              <ThemedText type="small" style={{ color: theme.income }}>
                Entrate {formatMoney(section.income)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.expense }}>
                Uscite {formatMoney(section.expense)}
              </ThemedText>
            </View>
          </View>
        );
      }}
      renderItem={({ item: group }) => (
        <Card style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {group.label}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {group.total >= 0 ? "+" : "−"}{" "}
              {formatMoney(Math.abs(group.total))}
            </ThemedText>
          </View>
          {group.items.map((t, i) => (
            <View
              key={t.id}
              style={
                i > 0 && [styles.divider, { borderTopColor: theme.border }]
              }
            >
              <TransactionRow
                transaction={t}
                onPress={() =>
                  router.push({
                    pathname: "/add",
                    params: { id: String(t.id) },
                  })
                }
                onLongPress={() => confirmDelete(t)}
              />
            </View>
          ))}
        </Card>
      )}
      ListFooterComponent={
        transactions.length ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.hint}
          >
            Tocca per modificare · tieni premuto per eliminare
          </ThemedText>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.six },
  monthHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    marginBottom: Spacing.two,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitle: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  monthSub: { flexDirection: "row", gap: Spacing.three },
  dayCard: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 0,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.one,
    paddingBottom: Spacing.one,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  hint: { textAlign: "center", marginTop: Spacing.two },
});
