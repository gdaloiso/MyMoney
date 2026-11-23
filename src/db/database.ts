import type { SQLiteDatabase } from 'expo-sqlite';

import { FALLBACK_ID, DEFAULT_CATEGORIES, type Category } from '@/lib/categories';
import { dueDates, type NewRecurring, type Recurring } from '@/lib/recurring';
import type { NewTransaction, Transaction, TransactionType } from '@/lib/types';

export const DATABASE_NAME = 'mymoney.db';

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('expense','income')),
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      category TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense','income')),
      label TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS budgets (
      category_id TEXT PRIMARY KEY NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0)
    );
    CREATE TABLE IF NOT EXISTS recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('expense','income')),
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      category TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('monthly','yearly')),
      generated_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Migrazione: collegamento movimento -> regola ricorrente
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transactions)');
  if (!cols.some((c) => c.name === 'recurring_id')) {
    await db.execAsync('ALTER TABLE transactions ADD COLUMN recurring_id INTEGER');
  }

  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if (!row || row.n === 0) {
    await db.withTransactionAsync(async () => {
      for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
        await db.runAsync(
          'INSERT INTO categories (id, type, label, icon, color, sort) VALUES (?, ?, ?, ?, ?, ?)',
          c.id,
          c.type,
          c.label,
          c.icon,
          c.color,
          i,
        );
      }
    });
  }
}

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT id, type, label, icon, color FROM categories ORDER BY sort, rowid',
  );
}

export async function insertCategory(db: SQLiteDatabase, c: Category) {
  await db.runAsync(
    'INSERT INTO categories (id, type, label, icon, color, sort) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM categories))',
    c.id,
    c.type,
    c.label,
    c.icon,
    c.color,
  );
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  c: Pick<Category, 'label' | 'icon' | 'color'>,
) {
  await db.runAsync('UPDATE categories SET label = ?, icon = ?, color = ? WHERE id = ?', c.label, c.icon, c.color, id);
}

/** Elimina la categoria e sposta i suoi movimenti nella categoria "Altro" dello stesso tipo. */
export async function deleteCategory(db: SQLiteDatabase, id: string, type: TransactionType) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE transactions SET category = ? WHERE category = ?', FALLBACK_ID[type], id);
    await db.runAsync('UPDATE recurring SET category = ? WHERE category = ?', FALLBACK_ID[type], id);
    await db.runAsync('DELETE FROM budgets WHERE category_id = ?', id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
}

export async function countTransactionsInCategory(db: SQLiteDatabase, id: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transactions WHERE category = ?',
    id,
  );
  return row?.n ?? 0;
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

type Row = {
  id: number;
  type: Transaction['type'];
  amount_cents: number;
  category: string;
  note: string;
  date: string;
  recurring_id: number | null;
};

const fromRow = (r: Row): Transaction => ({
  id: r.id,
  type: r.type,
  amountCents: r.amount_cents,
  category: r.category,
  note: r.note,
  date: r.date,
  recurringId: r.recurring_id,
});

export async function listTransactions(db: SQLiteDatabase): Promise<Transaction[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM transactions ORDER BY date DESC, id DESC');
  return rows.map(fromRow);
}

export async function insertTransaction(db: SQLiteDatabase, t: NewTransaction) {
  await db.runAsync(
    'INSERT INTO transactions (type, amount_cents, category, note, date, recurring_id) VALUES (?, ?, ?, ?, ?, ?)',
    t.type,
    t.amountCents,
    t.category,
    t.note,
    t.date,
    t.recurringId ?? null,
  );
}

export async function updateTransaction(db: SQLiteDatabase, id: number, t: NewTransaction) {
  await db.runAsync(
    'UPDATE transactions SET type = ?, amount_cents = ?, category = ?, note = ?, date = ? WHERE id = ?',
    t.type,
    t.amountCents,
    t.category,
    t.note,
    t.date,
    id,
  );
}

/**
 * Inserimento di massa con INSERT multi-riga (atomico per istruzione). Evita
 * `withTransactionAsync`: sulla connessione condivisa non è isolato e, se si sovrappone ad
 * un'altra transazione (es. generateDueRecurring), fallisce con "cannot commit - no
 * transaction is active". Blocchi da 150 righe × 6 parametri = 900 (< limite 999).
 */
export async function insertMany(db: SQLiteDatabase, list: NewTransaction[]) {
  const CHUNK = 150;
  for (let i = 0; i < list.length; i += CHUNK) {
    const part = list.slice(i, i + CHUNK);
    const params: (string | number | null)[] = [];
    for (const t of part) {
      params.push(t.type, t.amountCents, t.category, t.note, t.date, t.recurringId ?? null);
    }
    await db.runAsync(
      'INSERT INTO transactions (type, amount_cents, category, note, date, recurring_id) VALUES ' +
        part.map(() => '(?, ?, ?, ?, ?, ?)').join(', '),
      params,
    );
  }
}

export async function deleteAll(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM transactions');
}

export async function deleteTransaction(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

// ---------- Budget ----------

export async function listBudgets(db: SQLiteDatabase): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ category_id: string; amount_cents: number }>(
    'SELECT category_id, amount_cents FROM budgets',
  );
  return Object.fromEntries(rows.map((r) => [r.category_id, r.amount_cents]));
}

/** `cents` null/0 = rimuove il budget della categoria. */
export async function setBudget(db: SQLiteDatabase, categoryId: string, cents: number | null) {
  if (!cents || cents <= 0) {
    await db.runAsync('DELETE FROM budgets WHERE category_id = ?', categoryId);
    return;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO budgets (category_id, amount_cents) VALUES (?, ?)',
    categoryId,
    cents,
  );
}

// ---------- Spese ricorrenti ----------

type RecurringRow = {
  id: number;
  type: TransactionType;
  amount_cents: number;
  category: string;
  note: string;
  start_date: string;
  frequency: Recurring['frequency'];
  generated_count: number;
  active: number;
};

const recurringFromRow = (r: RecurringRow): Recurring => ({
  id: r.id,
  type: r.type,
  amountCents: r.amount_cents,
  category: r.category,
  note: r.note,
  startDate: r.start_date,
  frequency: r.frequency,
  generatedCount: r.generated_count,
  active: r.active === 1,
});

export async function listRecurring(db: SQLiteDatabase): Promise<Recurring[]> {
  const rows = await db.getAllAsync<RecurringRow>('SELECT * FROM recurring ORDER BY active DESC, id');
  return rows.map(recurringFromRow);
}

export async function insertRecurring(
  db: SQLiteDatabase,
  r: NewRecurring,
  generatedCount: number,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO recurring (type, amount_cents, category, note, start_date, frequency, generated_count, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    r.type,
    r.amountCents,
    r.category,
    r.note,
    r.startDate,
    r.frequency,
    generatedCount,
    r.active ? 1 : 0,
  );
}

export async function updateRecurring(
  db: SQLiteDatabase,
  id: number,
  r: NewRecurring,
  generatedCount: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE recurring SET type = ?, amount_cents = ?, category = ?, note = ?, start_date = ?, frequency = ?, generated_count = ?, active = ? WHERE id = ?',
    r.type,
    r.amountCents,
    r.category,
    r.note,
    r.startDate,
    r.frequency,
    generatedCount,
    r.active ? 1 : 0,
    id,
  );
}

export async function deleteRecurring(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recurring WHERE id = ?', id);
}

/**
 * Registra i movimenti delle scadenze maturate (data <= oggi). Idempotente:
 * `generated_count` avanza insieme agli inserimenti, nella stessa transazione.
 * Cancellare un movimento generato NON lo fa ricomparire.
 */
export async function generateDueRecurring(db: SQLiteDatabase, today: string): Promise<number> {
  const rules = (await db.getAllAsync<RecurringRow>('SELECT * FROM recurring WHERE active = 1')).map(
    recurringFromRow,
  );
  let created = 0;
  await db.withTransactionAsync(async () => {
    for (const rule of rules) {
      const dates = dueDates(rule, today);
      for (const date of dates) {
        await insertTransaction(db, {
          type: rule.type,
          amountCents: rule.amountCents,
          category: rule.category,
          note: rule.note,
          date,
          recurringId: rule.id,
        });
      }
      if (dates.length) {
        await db.runAsync(
          'UPDATE recurring SET generated_count = generated_count + ? WHERE id = ?',
          dates.length,
          rule.id,
        );
        created += dates.length;
      }
    }
  });
  return created;
}
