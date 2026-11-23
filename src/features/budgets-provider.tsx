import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as repo from '@/db/database';

type Ctx = {
  /** categoryId -> limite mensile in centesimi */
  budgets: Record<string, number>;
  setBudget: (categoryId: string, cents: number | null) => Promise<void>;
};

const BudgetsContext = createContext<Ctx | null>(null);

export function BudgetsProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    repo.listBudgets(db).then((b) => {
      if (!cancelled) setBudgets(b);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setBudget = useCallback(
    async (categoryId: string, cents: number | null) => {
      await repo.setBudget(db, categoryId, cents);
      setBudgets(await repo.listBudgets(db));
    },
    [db],
  );

  const value = useMemo(() => ({ budgets, setBudget }), [budgets, setBudget]);
  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export function useBudgets(): Ctx {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error('useBudgets must be used inside BudgetsProvider');
  return ctx;
}
