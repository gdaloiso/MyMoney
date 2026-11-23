import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/features/categories-provider';
import { useRecurring } from '@/features/recurring-provider';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney, parseISODate, toISODate } from '@/lib/format';
import { nextDate } from '@/lib/recurring';

const MAX_ITEMS = 4;
const WINDOW_DAYS = 30;

function daysFromToday(iso: string, today: string): number {
  return Math.round((parseISODate(iso).getTime() - parseISODate(today).getTime()) / 86_400_000);
}

function whenLabel(days: number, iso: string): string {
  if (days <= 0) return 'Oggi';
  if (days === 1) return 'Domani';
  if (days <= 14) return `Tra ${days} giorni`;
  return parseISODate(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

/** Prossime scadenze delle ricorrenze attive. Non appare se non ci sono ricorrenze. */
export function UpcomingCard() {
  const theme = useTheme();
  const { rules } = useRecurring();
  const { getCategory } = useCategories();

  const { items, dueExpenses, dueIncome } = useMemo(() => {
    const today = toISODate(new Date());
    const all = rules
      .filter((r) => r.active)
      .map((r) => {
        const date = nextDate(r);
        return { rule: r, date, days: daysFromToday(date, today) };
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.rule.id - b.rule.id);
    const inWindow = all.filter((x) => x.days <= WINDOW_DAYS);
    return {
      items: all.slice(0, MAX_ITEMS),
      dueExpenses: inWindow.filter((x) => x.rule.type === 'expense').reduce((s, x) => s + x.rule.amountCents, 0),
      dueIncome: inWindow.filter((x) => x.rule.type === 'income').reduce((s, x) => s + x.rule.amountCents, 0),
    };
  }, [rules]);

  if (items.length === 0) return null;

  return (
    <>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
          PROSSIME SCADENZE
        </ThemedText>
        <Pressable hitSlop={10} onPress={() => router.push('/recurring')}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            Tutte
          </ThemedText>
        </Pressable>
      </View>

      <Card style={{ gap: 0, paddingVertical: Spacing.two }}>
        {items.map(({ rule, date, days }, i) => {
          const cat = getCategory(rule.category);
          const income = rule.type === 'income';
          return (
            <Pressable
              key={rule.id}
              onPress={() => router.push({ pathname: '/recurring-form', params: { id: String(rule.id) } })}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                pressed && { opacity: 0.6 },
              ]}>
              <View style={[styles.icon, { backgroundColor: cat.color + '26' }]}>
                <Ionicons name={cat.icon as never} size={18} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText numberOfLines={1}>{rule.note || cat.label}</ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: days <= 1 ? theme.accent : theme.textSecondary, fontWeight: days <= 1 ? '700' : '500' }}>
                  {whenLabel(days, date)}
                </ThemedText>
              </View>
              <ThemedText style={{ fontWeight: '700', color: income ? theme.income : theme.text }}>
                {income ? '+' : '−'} {formatMoney(rule.amountCents)}
              </ThemedText>
            </Pressable>
          );
        })}

        {dueExpenses > 0 || dueIncome > 0 ? (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Nei prossimi {WINDOW_DAYS} giorni
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {dueExpenses > 0 ? `−${formatMoney(dueExpenses)}` : ''}
              {dueExpenses > 0 && dueIncome > 0 ? '  ·  ' : ''}
              {dueIncome > 0 ? `+${formatMoney(dueIncome)}` : ''}
            </ThemedText>
          </View>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  title: { letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
