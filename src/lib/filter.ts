import type { Category } from "@/lib/categories";
import type { Transaction, TransactionType } from "@/lib/types";

export type TypeFilter = "all" | TransactionType;

export type TransactionFilter = {
  query: string;
  type: TypeFilter;
  categoryIds: string[];
};

export const EMPTY_FILTER: TransactionFilter = {
  query: "",
  type: "all",
  categoryIds: [],
};

export function isFilterActive(f: TransactionFilter): boolean {
  return f.query.trim() !== "" || f.type !== "all" || f.categoryIds.length > 0;
}

/**
 * Filtra per testo (nota, categoria, importo), tipo e categorie.
 * L'importo si cerca sia con la virgola ("12,5") sia col punto ("12.5").
 */
export function filterTransactions(
  list: Transaction[],
  f: TransactionFilter,
  getCategory: (id: string) => Category,
): Transaction[] {
  const q = f.query.trim().toLowerCase();
  const qAmount = q.replace(",", ".");
  const ids = f.categoryIds.length ? new Set(f.categoryIds) : null;
  if (!q && f.type === "all" && !ids) return list;

  return list.filter((t) => {
    if (f.type !== "all" && t.type !== f.type) return false;
    if (ids && !ids.has(t.category)) return false;
    if (!q) return true;
    if (t.note.toLowerCase().includes(q)) return true;
    if (getCategory(t.category).label.toLowerCase().includes(q)) return true;
    return (t.amountCents / 100).toFixed(2).includes(qAmount);
  });
}
