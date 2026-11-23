import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as repo from '@/db/database';
import { useTransactions } from '@/features/transactions-provider';
import { toISODate } from '@/lib/format';
import { countUpTo, type NewRecurring, type Recurring } from '@/lib/recurring';

type Ctx = {
  rules: Recurring[];
  /**
   * `backfill`: se la prima scadenza è nel passato, registra anche le scadenze già trascorse.
   * Con `false` parte dalla prossima scadenza futura.
   */
  addRule: (r: NewRecurring, backfill: boolean) => Promise<void>;
  updateRule: (rule: Recurring, patch: NewRecurring) => Promise<void>;
  removeRule: (id: number) => Promise<void>;
};

const RecurringContext = createContext<Ctx | null>(null);

export function RecurringProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { reload } = useTransactions();
  const [rules, setRules] = useState<Recurring[]>([]);
  const running = useRef(false);

  /** Genera le scadenze maturate e aggiorna lo stato. */
  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const created = await repo.generateDueRecurring(db, toISODate(new Date()));
      setRules(await repo.listRecurring(db));
      if (created > 0) await reload();
    } finally {
      running.current = false;
    }
  }, [db, reload]);

  // All'avvio e ogni volta che si torna nell'app (il giorno potrebbe essere cambiato)
  useEffect(() => {
    sync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);

  const value = useMemo<Ctx>(
    () => ({
      rules,
      addRule: async (r, backfill) => {
        const today = toISODate(new Date());
        // Senza backfill le scadenze già passate vengono considerate "fatte"
        const skip = backfill ? 0 : countUpTo(r.startDate, r.frequency, today);
        await repo.insertRecurring(db, r, skip);
        await sync();
      },
      updateRule: async (rule, patch) => {
        let count = rule.generatedCount;
        // Riattivando una regola messa in pausa non si recuperano le scadenze saltate
        if (!rule.active && patch.active) {
          count = Math.max(count, countUpTo(patch.startDate, patch.frequency, toISODate(new Date())));
        }
        await repo.updateRecurring(db, rule.id, patch, count);
        await sync();
      },
      removeRule: async (id) => {
        await repo.deleteRecurring(db, id);
        setRules(await repo.listRecurring(db));
      },
    }),
    [db, rules, sync],
  );

  return <RecurringContext.Provider value={value}>{children}</RecurringContext.Provider>;
}

export function useRecurring(): Ctx {
  const ctx = useContext(RecurringContext);
  if (!ctx) throw new Error('useRecurring must be used inside RecurringProvider');
  return ctx;
}
