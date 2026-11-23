import { parseAmountToCents, pad } from '@/lib/format';
import type { Transaction, TransactionType } from '@/lib/types';

/** Separatore ';' + importi con virgola: si apre correttamente in Excel italiano. */
const SEP = ';';
const HEADER = ['Data', 'Tipo', 'Importo', 'Categoria', 'Nota'];

function escapeField(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function buildCsv(list: Transaction[], categoryLabel: (id: string) => string): string {
  const lines = [HEADER.join(SEP)];
  for (const t of list) {
    const amount = `${Math.floor(t.amountCents / 100)},${pad(t.amountCents % 100)}`;
    lines.push(
      [
        t.date,
        t.type === 'expense' ? 'Spesa' : 'Entrata',
        amount,
        categoryLabel(t.category),
        t.note,
      ]
        .map(escapeField)
        .join(SEP),
    );
  }
  // BOM: fa riconoscere l'UTF-8 (accenti) a Excel
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Parser CSV minimale: gestisce virgolette, separatori e a capo dentro i campi. */
export function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function parseDate(s: string): string | null {
  const v = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v))) {
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

function parseType(s: string): TransactionType | null {
  const v = s.trim().toLowerCase();
  if (['spesa', 'uscita', 'expense'].includes(v)) return 'expense';
  if (['entrata', 'income'].includes(v)) return 'income';
  return null;
}

export type ParsedRow = {
  type: TransactionType;
  amountCents: number;
  categoryLabel: string;
  note: string;
  date: string;
};

export type ParseResult = { rows: ParsedRow[]; invalid: number };

export function parseTransactionsCsv(text: string): ParseResult {
  const raw = parseCsvRows(text);
  if (raw.length === 0) return { rows: [], invalid: 0 };

  // Salta l'intestazione se presente
  const body = parseDate(raw[0][0] ?? '') ? raw : raw.slice(1);
  const rows: ParsedRow[] = [];
  let invalid = 0;

  for (const r of body) {
    const date = parseDate(r[0] ?? '');
    const type = parseType(r[1] ?? '');
    const amountCents = parseAmountToCents(r[2] ?? '');
    const categoryLabel = (r[3] ?? '').trim();
    if (!date || !type || !Number.isFinite(amountCents) || amountCents <= 0 || !categoryLabel) {
      invalid++;
      continue;
    }
    rows.push({ date, type, amountCents, categoryLabel, note: (r[4] ?? '').trim() });
  }
  return { rows, invalid };
}
