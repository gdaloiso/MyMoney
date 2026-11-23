export type TransactionType = 'expense' | 'income';

export type Transaction = {
  id: number;
  type: TransactionType;
  /** Importo in centesimi, sempre positivo. */
  amountCents: number;
  category: string;
  note: string;
  /** Data locale in formato YYYY-MM-DD. */
  date: string;
  /** Se il movimento è stato creato da una spesa ricorrente. */
  recurringId?: number | null;
};

export type NewTransaction = Omit<Transaction, 'id'>;
