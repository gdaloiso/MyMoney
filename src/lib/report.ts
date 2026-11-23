import type { Category } from '@/lib/categories';
import { addMonths, monthKey } from '@/lib/format';
import type { Transaction } from '@/lib/types';

export type Totals = { income: number; expense: number; balance: number };

export function totals(list: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.type === 'income') income += t.amountCents;
    else expense += t.amountCents;
  }
  return { income, expense, balance: income - expense };
}

export function forMonth(list: Transaction[], key: string): Transaction[] {
  return list.filter((t) => monthKey(t.date) === key);
}

export type CategoryShare = { id: string; label: string; color: string; cents: number; pct: number };

export function expensesByCategory(
  list: Transaction[],
  getCategory: (id: string) => Category,
): CategoryShare[] {
  const map = new Map<string, number>();
  let sum = 0;
  for (const t of list) {
    if (t.type !== 'expense') continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountCents);
    sum += t.amountCents;
  }
  return [...map.entries()]
    .map(([id, cents]) => {
      const c = getCategory(id);
      return { id, label: c.label, color: c.color, cents, pct: sum ? cents / sum : 0 };
    })
    .sort((a, b) => b.cents - a.cents);
}

export type MonthPoint = { key: string; income: number; expense: number };

/** Ultimi `n` mesi (incluso `endKey`), dal più vecchio al più recente. */
export function lastMonths(list: Transaction[], endKey: string, n = 6): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = addMonths(endKey, -i);
    const t = totals(forMonth(list, key));
    points.push({ key, income: t.income, expense: t.expense });
  }
  return points;
}

export function forYear(list: Transaction[], year: number): Transaction[] {
  const prefix = `${year}-`;
  return list.filter((t) => t.date.startsWith(prefix));
}

/** I 12 mesi dell'anno, gennaio -> dicembre, con totali e saldo. */
export function yearMonths(list: Transaction[], year: number): (MonthPoint & { balance: number })[] {
  const byMonth = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  for (const t of forYear(list, year)) {
    const m = Number(t.date.slice(5, 7)) - 1;
    if (t.type === 'income') byMonth[m].income += t.amountCents;
    else byMonth[m].expense += t.amountCents;
  }
  return byMonth.map((v, i) => ({
    key: `${year}-${String(i + 1).padStart(2, '0')}`,
    income: v.income,
    expense: v.expense,
    balance: v.income - v.expense,
  }));
}
