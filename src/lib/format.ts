const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

export function formatMoney(cents: number): string {
  return eur.format(cents / 100);
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Data locale -> YYYY-MM-DD (senza passare da UTC). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** YYYY-MM */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return capitalize(
    short
      ? date.toLocaleDateString('it-IT', { month: 'short' })
      : date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
  );
}

export function dayLabel(iso: string): string {
  const today = toISODate(new Date());
  if (iso === today) return 'Oggi';
  if (iso === addDays(today, -1)) return 'Ieri';
  return capitalize(
    parseISODate(iso).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );
}

/** Accetta "12,50", "12.50", "1.250,00", "12". Restituisce centesimi, NaN se non valido. */
export function parseAmountToCents(input: string): number {
  let s = input.trim().replace(/\s/g, '');
  if (!s) return NaN;
  if (s.includes(',')) {
    // formato italiano: il punto è separatore delle migliaia
    s = s.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}
