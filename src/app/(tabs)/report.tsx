import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { YearDashboard } from "@/components/year-dashboard";
import { Card, EmptyState, MonthSwitcher, SectionTitle } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useBudgets } from "@/features/budgets-provider";
import { useCategories } from "@/features/categories-provider";
import { useTransactions } from "@/features/transactions-provider";
import { useTheme } from "@/hooks/use-theme";
import { formatMoney, monthKey, monthLabel, toISODate } from "@/lib/format";
import { expensesByCategory, forMonth, lastMonths, totals } from "@/lib/report";

const CHART_HEIGHT = 120;

export default function ReportScreen() {
  const theme = useTheme();
  const { transactions } = useTransactions();
  const { getCategory } = useCategories();
  const { budgets } = useBudgets();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [month, setMonth] = useState(() => monthKey(toISODate(new Date())));

  const monthTx = useMemo(
    () => forMonth(transactions, month),
    [transactions, month],
  );
  const t = useMemo(() => totals(monthTx), [monthTx]);
  const byCategory = useMemo(
    () => expensesByCategory(monthTx, getCategory),
    [monthTx, getCategory],
  );
  const budgetRows = useMemo(() => {
    const spent = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type === "expense")
        spent.set(t.category, (spent.get(t.category) ?? 0) + t.amountCents);
    }
    return Object.entries(budgets)
      .map(([id, limit]) => {
        const c = getCategory(id);
        const sp = spent.get(id) ?? 0;
        return { id, label: c.label, limit, spent: sp, pct: sp / limit };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, monthTx, getCategory]);
  const trend = useMemo(
    () => lastMonths(transactions, month, 6),
    [transactions, month],
  );
  const maxTrend = Math.max(1, ...trend.flatMap((p) => [p.income, p.expense]));
  const savingsRate =
    t.income > 0 ? Math.round((t.balance / t.income) * 100) : null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View
        style={[styles.segment, { backgroundColor: theme.backgroundSelected }]}
      >
        {(["month", "year"] as const).map((m) => (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
            onPress={() => setMode(m)}
            style={[
              styles.segmentItem,
              mode === m && { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText
              type="smallBold"
              themeColor={mode === m ? "text" : "textSecondary"}
            >
              {m === "month" ? "Mese" : "Anno"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {mode === "year" ? (
        <YearDashboard />
      ) : (
        <>
          <MonthSwitcher month={month} onChange={setMonth} />

          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Risparmio del mese
            </ThemedText>
            <ThemedText
              type="subtitle"
              style={{ color: t.balance >= 0 ? theme.income : theme.expense }}
            >
              {formatMoney(t.balance)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {savingsRate === null
                ? "Nessuna entrata registrata in questo mese"
                : `Hai risparmiato il ${savingsRate}% di ciò che hai guadagnato`}
            </ThemedText>
          </Card>

          <View style={styles.rowBetween}>
            <SectionTitle>Budget del mese</SectionTitle>
            <Pressable hitSlop={10} onPress={() => router.push("/budgets")}>
              <ThemedText
                type="smallBold"
                style={{ color: theme.accent, marginTop: Spacing.three }}
              >
                {budgetRows.length ? "Modifica" : "Imposta"}
              </ThemedText>
            </Pressable>
          </View>
          {budgetRows.length === 0 ? (
            <EmptyState
              icon="speedometer-outline"
              text="Fissa un limite mensile per le categorie di spesa e tieni d'occhio quanto ti resta."
              actionLabel="Imposta budget"
              onAction={() => router.push("/budgets")}
            />
          ) : (
            <Card style={{ gap: Spacing.three }}>
              {budgetRows.map((b) => {
                const over = b.spent > b.limit;
                const warn = !over && b.pct >= 0.8;
                const color = over
                  ? theme.expense
                  : warn
                    ? "#F59E0B"
                    : theme.income;
                return (
                  <View key={b.id} style={{ gap: 6 }}>
                    <View style={styles.rowBetween}>
                      <ThemedText type="small">{b.label}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatMoney(b.spent)} / {formatMoney(b.limit)}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.track,
                        { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <View
                        style={{
                          width: `${Math.min(b.pct, 1) * 100}%`,
                          height: "100%",
                          backgroundColor: color,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                    <ThemedText
                      type="small"
                      style={{
                        color: over ? theme.expense : theme.textSecondary,
                      }}
                    >
                      {over
                        ? `Superato di ${formatMoney(b.spent - b.limit)}`
                        : `Restano ${formatMoney(b.limit - b.spent)}`}
                    </ThemedText>
                  </View>
                );
              })}
            </Card>
          )}

          <SectionTitle>Spese per categoria</SectionTitle>
          {byCategory.length === 0 ? (
            <EmptyState
              icon="pie-chart-outline"
              text="Nessuna spesa in questo mese."
            />
          ) : (
            <Card style={{ gap: Spacing.three }}>
              {byCategory.map((c) => (
                <View key={c.id} style={{ gap: 6 }}>
                  <View style={styles.rowBetween}>
                    <ThemedText type="small">{c.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatMoney(c.cents)} · {Math.round(c.pct * 100)}%
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.track,
                      { backgroundColor: theme.backgroundSelected },
                    ]}
                  >
                    <View
                      style={{
                        width: `${Math.max(c.pct * 100, 2)}%`,
                        height: "100%",
                        backgroundColor: c.color,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                </View>
              ))}
            </Card>
          )}

          <SectionTitle>Ultimi 6 mesi</SectionTitle>
          <Card style={{ gap: Spacing.three }}>
            <View style={styles.chart}>
              {trend.map((p) => (
                <View key={p.key} style={styles.chartCol}>
                  <View style={styles.bars}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(
                            (p.income / maxTrend) * CHART_HEIGHT,
                            p.income ? 3 : 0,
                          ),
                          backgroundColor: theme.income,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(
                            (p.expense / maxTrend) * CHART_HEIGHT,
                            p.expense ? 3 : 0,
                          ),
                          backgroundColor: theme.expense,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="small"
                    themeColor={p.key === month ? "text" : "textSecondary"}
                  >
                    {monthLabel(p.key, true)}
                  </ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <Legend color={theme.income} label="Entrate" />
              <Legend color={theme.expense} label="Uscite" />
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    marginBottom: Spacing.one,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartCol: { flex: 1, alignItems: "center", gap: Spacing.two },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: CHART_HEIGHT,
  },
  bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  legend: { flexDirection: "row", justifyContent: "center", gap: Spacing.four },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
