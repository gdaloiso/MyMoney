import { addMonths, pad } from '@/lib/format';
import type { TransactionType } from '@/lib/types';

export type Frequency = 'monthly' | 'yearly';

export type Recurring = {
  id: number;
  type: TransactionType;
  amountCents: number;
  category: string;
  note: string;
  /** Data della prima scadenza (YYYY-MM-DD). Il giorno del mese deriva da qui. */
  startDate: string;
  frequency: Frequency;
  /** Quante scadenze sono già state registrate (le scadenze sono numerate da 0). */
  generatedCount: number;
  active: boolean;
};

export type NewRecurring = Omit<Recurring, 'id' | 'generatedCount'>;

/** Data della scadenza numero `i` (0 = la prima). Un giorno 31 in un mese corto diventa l'ultimo del mese. */
export function occurrenceDate(startDate: string, frequency: Frequency, i: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  const key = addMonths(`${y}-${pad(m)}`, (frequency === 'monthly' ? 1 : 12) * i);
  const [ky, km] = key.split('-').map(Number);
  const daysInMonth = new Date(ky, km, 0).getDate();
  return `${key}-${pad(Math.min(d, daysInMonth))}`;
}

/** Limite di sicurezza: evita di generare migliaia di righe per una data di inizio sbagliata. */
const MAX_CATCH_UP = 120;

/** Scadenze maturate (data <= oggi) e non ancora registrate. */
export function dueDates(
  r: Pick<Recurring, 'startDate' | 'frequency' | 'generatedCount'>,
  today: string,
): string[] {
  const out: string[] = [];
  for (let i = r.generatedCount; out.length < MAX_CATCH_UP; i++) {
    const date = occurrenceDate(r.startDate, r.frequency, i);
    if (date > today) break;
    out.push(date);
  }
  return out;
}

/** Quante scadenze cadono entro oggi (incluso). */
export function countUpTo(startDate: string, frequency: Frequency, today: string): number {
  let n = 0;
  while (n < 5000 && occurrenceDate(startDate, frequency, n) <= today) n++;
  return n;
}

export function nextDate(r: Pick<Recurring, 'startDate' | 'frequency' | 'generatedCount'>): string {
  return occurrenceDate(r.startDate, r.frequency, r.generatedCount);
}

export function describeRecurrence(r: Pick<Recurring, 'startDate' | 'frequency'>): string {
  const [, m, d] = r.startDate.split('-').map(Number);
  if (r.frequency === 'monthly') return `Ogni mese il ${d}`;
  const month = new Date(2000, m - 1, 1).toLocaleDateString('it-IT', { month: 'long' });
  return `Ogni anno il ${d} ${month}`;
}
