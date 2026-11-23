import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { buildCsv, parseTransactionsCsv } from '@/lib/csv';
import type { Category } from '@/lib/categories';
import { toISODate } from '@/lib/format';
import type { NewTransaction, Transaction } from '@/lib/types';

/** Crea il CSV in cache e apre il foglio di condivisione (Drive, e-mail, WhatsApp, File...). */
export async function exportCsv(
  transactions: Transaction[],
  categoryLabel: (id: string) => string,
): Promise<'shared' | 'unavailable'> {
  const file = new File(Paths.cache, `MyMoney-backup-${toISODate(new Date())}.csv`);
  file.create({ overwrite: true });
  await file.write(buildCsv(transactions, categoryLabel));

  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Salva il backup di MyMoney',
    UTI: 'public.comma-separated-values-text',
  });
  return 'shared';
}

export type ImportSummary = {
  imported: number;
  duplicates: number;
  invalid: number;
  newCategories: number;
};

export type ImportDeps = {
  existing: Transaction[];
  categories: Category[];
  addCategory: (c: Omit<Category, 'id'>) => Promise<Category>;
  insertMany: (list: NewTransaction[]) => Promise<void>;
};

const key = (t: { date: string; type: string; amountCents: number; category: string; note: string }) =>
  [t.date, t.type, t.amountCents, t.category, t.note].join('|');

/** Legge il testo del file scelto: prima con `File`, poi con `fetch` (supporta anche content://). */
async function readPickedText(uri: string): Promise<string> {
  try {
    return await new File(uri).text();
  } catch (firstError) {
    try {
      return await (await fetch(uri)).text();
    } catch {
      throw firstError;
    }
  }
}

/** Sceglie un file CSV e lo importa. Restituisce null se l'utente annulla. */
export async function pickAndImportCsv(deps: ImportDeps): Promise<ImportSummary | null> {
  const pick = (copy: boolean) =>
    DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: copy, multiple: false });

  // Alcuni provider (Telegram, Recenti, Drive) non concedono il permesso di lettura sulla copia
  // in cache: in quel caso riprovo senza copia e leggo l'URI direttamente.
  let res: DocumentPicker.DocumentPickerResult;
  try {
    res = await pick(true);
  } catch {
    res = await pick(false);
  }
  if (res.canceled) return null;

  const text = await readPickedText(res.assets[0].uri);
  const { rows, invalid } = parseTransactionsCsv(text);

  // Categorie: riuso per nome (e tipo); se non esiste la creo.
  const cats = [...deps.categories];
  let newCategories = 0;
  const resolve = async (label: string, type: 'expense' | 'income') => {
    const found = cats.find((c) => c.type === type && c.label.toLowerCase() === label.toLowerCase());
    if (found) return found.id;
    const created = await deps.addCategory({
      type,
      label,
      icon: 'ellipsis-horizontal',
      color: '#94A3B8',
    });
    cats.push(created);
    newCategories++;
    return created.id;
  };

  // Conteggio per chiave: due movimenti identici nello stesso giorno restano entrambi validi,
  // ma reimportando lo stesso file non si creano doppioni.
  const existingCount = new Map<string, number>();
  for (const t of deps.existing) existingCount.set(key(t), (existingCount.get(key(t)) ?? 0) + 1);
  const toInsert: NewTransaction[] = [];
  let duplicates = 0;

  for (const r of rows) {
    const category = await resolve(r.categoryLabel, r.type);
    const t: NewTransaction = {
      type: r.type,
      amountCents: r.amountCents,
      category,
      note: r.note,
      date: r.date,
    };
    const k = key(t);
    const left = existingCount.get(k) ?? 0;
    if (left > 0) {
      existingCount.set(k, left - 1);
      duplicates++;
      continue;
    }
    toInsert.push(t);
  }

  if (toInsert.length) await deps.insertMany(toInsert);
  return { imported: toInsert.length, duplicates, invalid, newCategories };
}
