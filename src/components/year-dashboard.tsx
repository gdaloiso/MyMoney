import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useCategories } from "@/features/categories-provider";
import { useTransactions } from "@/features/transactions-provider";
import { useTheme } from "@/hooks/use-theme";
import { formatMoney, monthLabel } from "@/lib/format";
import { expensesByCategory, forYear, totals, yearMonths } from "@/lib/report";

const CHART_HEIGHT = 140;

export function YearDashboard() {
  const theme = useTheme();
  const { transactions } = useTransactions();
  const { getCategory } = useCategories();
  const [year, setYear] = useState(() => new Date().getFullYear());

  const yearTx = useMemo(
    () => forYear(transactions, year),
    [transactions, year],
  );
  const t = useMemo(() => totals(yearTx), [yearTx]);
  const months = useMemo(
    () => yearMonths(transactions, year),
    [transactions, year],
  );
  const prev = useMemo(
    () => totals(forYear(transactions, year - 1)),
    [transactions, year],
  );
  const byCategory = useMemo(
    () => expensesByCategory(yearTx, getCategory),
    [yearTx, getCategory],
  );

  const active = months.filter((m) => m.income > 0 || m.expense > 0);
  const maxBar = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const maxAbsBalance = Math.max(1, ...months.map((m) => Math.abs(m.balance)));
  const savingsRate =
    t.income > 0 ? Math.round((t.balance / t.income) * 100) : null;
  const avgExpense = active.length ? Math.round(t.expense / active.length) : 0;
  const costliest = active.length
    ? active.reduce((a, b) => (b.expense > a.expense ? b : a))
    : null;
  const best = active.length
    ? active.reduce((a, b) => (b.balance > a.balance ? b : a))
    : null;
  const expenseDelta =
    prev.expense > 0
      ? Math.round(((t.expense - prev.expense) / prev.expense) * 100)
      : null;

  const arrow = (
    name: "chevron-back" | "chevron-forward",
    delta: number,
    label: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => setYear((y) => y + delta)}
      style={({ pressed }) => [
        styles.arrow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={name} size={26} color={theme.text} />
    </Pressable>
  );

  return (
    <View>
      <View style={styles.switcher}>
        {arrow("chevron-back", -1, "Anno precedente")}
        <ThemedText type="subtitle" style={styles.yearText}>
          {year}
        </ThemedText>
        {arrow("chevron-forward", 1, "Anno successivo")}
      </View>

      {yearTx.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          text={`Nessun movimento nel ${year}.`}
        />
      ) : (
        <>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Saldo dell&apos;anno
            </ThemedText>
            <ThemedText
              type="subtitle"
              style={{ color: t.balance >= 0 ? theme.income : theme.expense }}
            >
              {formatMoney(t.balance)}
            </ThemedText>
            <View style={styles.split}>
              <View style={styles.splitItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  Entrate
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.income }}>
                  {formatMoney(t.income)}
                </ThemedText>
              </View>
              <View style={styles.splitItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  Uscite
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.expense }}>
                  {formatMoney(t.expense)}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {savingsRate === null
                ? "Nessuna entrata registrata quest’anno"
                : `Hai risparmiato il ${savingsRate}% di ciò che hai guadagnato`}
            </ThemedText>
          </Card>

          <View style={styles.stats}>
            <Stat label="Spesa media mensile" value={formatMoney(avgExpense)} />
            <Stat
              label={`vs ${year - 1}`}
              value={
                expenseDelta === null
                  ? "—"
                  : `${expenseDelta > 0 ? "+" : ""}${expenseDelta}%`
              }
              hint="uscite"
              color={
                expenseDelta === null
                  ? undefined
                  : expenseDelta > 0
                    ? theme.expense
                    : theme.income
              }
            />
          </View>
          <View style={styles.stats}>
            <Stat
              label="Mese più caro"
              value={costliest ? monthLabel(costliest.key) : "—"}
              hint={costliest ? formatMoney(costliest.expense) : undefined}
            />
            <Stat
              label="Mese migliore"
              value={best ? monthLabel(best.key) : "—"}
              hint={best ? formatMoney(best.balance) : undefined}
            />
          </View>

          <SectionTitle>Andamento mensile</SectionTitle>
          <Card style={{ gap: Spacing.three }}>
            <View style={styles.chart}>
              {months.map((m) => (
                <View key={m.key} style={styles.chartCol}>
                  <View style={styles.bars}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(
                            (m.income / maxBar) * CHART_HEIGHT,
                            m.income ? 3 : 0,
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
                            (m.expense / maxBar) * CHART_HEIGHT,
                            m.expense ? 3 : 0,
                          ),
                          backgroundColor: theme.expense,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    style={styles.chartLabel}
                    themeColor="textSecondary"
                  >
                    {monthLabel(m.key, true).charAt(0)}
                  </ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <Legend color={theme.income} label="Entrate" />
              <Legend color={theme.expense} label="Uscite" />
            </View>
          </Card>

          <SectionTitle>Saldo per mese</SectionTitle>
          <Card style={{ gap: Spacing.two }}>
            {months.map((m) => {
              const empty = m.income === 0 && m.expense === 0;
              const pos = m.balance >= 0;
              return (
                <View key={m.key} style={styles.monthRow}>
                  <ThemedText
                    type="small"
                    style={styles.monthName}
                    themeColor="textSecondary"
                  >
                    {monthLabel(m.key, true)}
                  </ThemedText>
                  <View
                    style={[
                      styles.track,
                      styles.flex,
                      { backgroundColor: theme.backgroundSelected },
                    ]}
                  >
                    {!empty && (
                      <View
                        style={{
                          width: `${Math.max((Math.abs(m.balance) / maxAbsBalance) * 100, 2)}%`,
                          height: "100%",
                          borderRadius: 4,
                          backgroundColor: pos ? theme.income : theme.expense,
                        }}
                      />
                    )}
                  </View>
                  <ThemedText
                    type="small"
                    style={[
                      styles.monthValue,
                      {
                        color: empty
                          ? theme.textSecondary
                          : pos
                            ? theme.income
                            : theme.expense,
                      },
                    ]}
                  >
                    {empty ? "—" : formatMoney(m.balance)}
                  </ThemedText>
                </View>
              );
            })}
          </Card>

          <SectionTitle>Spese per categoria</SectionTitle>
          {byCategory.length === 0 ? (
            <EmptyState
              icon="pie-chart-outline"
              text={`Nessuna spesa nel ${year}.`}
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
        </>
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <Card style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        style={color ? { color } : undefined}
        numberOfLines={1}
      >
        {value}
      </ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </Card>
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
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.two,
  },
  yearText: { fontSize: 24, lineHeight: 30, fontWeight: "700" },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  split: { flexDirection: "row", gap: Spacing.four },
  splitItem: { gap: 2 },
  stats: { flexDirection: "row", gap: Spacing.three, marginTop: Spacing.three },
  stat: { flex: 1, gap: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  flex: { flex: 1 },
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
    gap: 2,
    height: CHART_HEIGHT,
  },
  bar: { width: 7, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  chartLabel: { fontSize: 12, fontWeight: "600" },
  legend: { flexDirection: "row", justifyContent: "center", gap: Spacing.four },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  monthName: { width: 36 },
  monthValue: { width: 92, textAlign: "right" },
});
