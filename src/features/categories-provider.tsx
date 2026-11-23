import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as repo from '@/db/database';
import { FALLBACK_ID, newCategoryId, type Category } from '@/lib/categories';
import type { TransactionType } from '@/lib/types';

type Ctx = {
  categories: Category[];
  /** Sempre un risultato: se la categoria non esiste più usa "Altro". */
  getCategory: (id: string) => Category;
  categoriesFor: (type: TransactionType) => Category[];
  addCategory: (c: Omit<Category, 'id'>) => Promise<Category>;
  editCategory: (id: string, c: Pick<Category, 'label' | 'icon' | 'color'>) => Promise<void>;
  removeCategory: (id: string, type: TransactionType) => Promise<void>;
  /** Ricarica dal DB (es. dopo un import che ha creato nuove categorie). */
  reloadCategories: () => Promise<void>;
};

const CategoriesContext = createContext<Ctx | null>(null);

const PLACEHOLDER: Category = {
  id: 'altro_spesa',
  type: 'expense',
  label: 'Altro',
  icon: 'ellipsis-horizontal',
  color: '#94A3B8',
};

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);

  const reloadCategories = useCallback(async () => {
    setCategories(await repo.listCategories(db));
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    repo.listCategories(db).then((rows) => {
      if (!cancelled) setCategories(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const value = useMemo<Ctx>(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return {
      categories,
      getCategory: (id) => byId.get(id) ?? byId.get(FALLBACK_ID.expense) ?? PLACEHOLDER,
      categoriesFor: (type) => categories.filter((c) => c.type === type),
      addCategory: async (c) => {
        const created = { ...c, id: newCategoryId() };
        await repo.insertCategory(db, created);
        await reloadCategories();
        return created;
      },
      editCategory: async (id, c) => {
        await repo.updateCategory(db, id, c);
        await reloadCategories();
      },
      removeCategory: async (id, type) => {
        await repo.deleteCategory(db, id, type);
        await reloadCategories();
      },
      reloadCategories,
    };
  }, [db, categories, reloadCategories]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): Ctx {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used inside CategoriesProvider');
  return ctx;
}
