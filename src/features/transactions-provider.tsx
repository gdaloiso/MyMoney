import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as repo from '@/db/database';
import type { NewTransaction, Transaction } from '@/lib/types';

type Ctx = {
  transactions: Transaction[];
  loading: boolean;
  add: (t: NewTransaction) => Promise<void>;
  update: (id: number, t: NewTransaction) => Promise<void>;
  remove: (id: number) => Promise<void>;
  addMany: (list: NewTransaction[]) => Promise<void>;
  reload: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const TransactionsContext = createContext<Ctx | null>(null);

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setTransactions(await repo.listTransactions(db));
    setLoading(false);
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    repo.listTransactions(db).then((rows) => {
      if (cancelled) return;
      setTransactions(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const value = useMemo<Ctx>(
    () => ({
      transactions,
      loading,
      add: async (t) => {
        await repo.insertTransaction(db, t);
        await reload();
      },
      update: async (id, t) => {
        await repo.updateTransaction(db, id, t);
        await reload();
      },
      remove: async (id) => {
        await repo.deleteTransaction(db, id);
        await reload();
      },
      reload,
      addMany: async (list) => {
        await repo.insertMany(db, list);
        await reload();
      },
      clearAll: async () => {
        await repo.deleteAll(db);
        await reload();
      },
    }),
    [db, transactions, loading, reload],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions(): Ctx {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used inside TransactionsProvider');
  return ctx;
}
