import type { TransactionType } from '@/lib/types';

export type Category = {
  id: string;
  type: TransactionType;
  label: string;
  icon: string;
  color: string;
};

/** Categorie che non si possono eliminare: raccolgono i movimenti delle categorie cancellate. */
export const FALLBACK_ID: Record<TransactionType, string> = {
  expense: 'altro_spesa',
  income: 'altro_entrata',
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'casa', type: 'expense', label: 'Casa', icon: 'home', color: '#6366F1' },
  { id: 'spesa', type: 'expense', label: 'Spesa', icon: 'cart', color: '#22C55E' },
  { id: 'trasporti', type: 'expense', label: 'Trasporti', icon: 'car', color: '#F59E0B' },
  { id: 'ristoranti', type: 'expense', label: 'Ristoranti', icon: 'restaurant', color: '#EF4444' },
  { id: 'svago', type: 'expense', label: 'Svago', icon: 'game-controller', color: '#EC4899' },
  { id: 'salute', type: 'expense', label: 'Salute', icon: 'medkit', color: '#14B8A6' },
  { id: 'shopping', type: 'expense', label: 'Shopping', icon: 'bag', color: '#8B5CF6' },
  { id: 'bollette', type: 'expense', label: 'Bollette', icon: 'flash', color: '#EAB308' },
  { id: 'viaggi', type: 'expense', label: 'Viaggi', icon: 'airplane', color: '#0EA5E9' },
  { id: 'altro_spesa', type: 'expense', label: 'Altro', icon: 'ellipsis-horizontal', color: '#94A3B8' },
  { id: 'stipendio', type: 'income', label: 'Stipendio', icon: 'briefcase', color: '#16A34A' },
  { id: 'extra', type: 'income', label: 'Extra', icon: 'sparkles', color: '#0EA5E9' },
  { id: 'regali', type: 'income', label: 'Regali', icon: 'gift', color: '#EC4899' },
  { id: 'investimenti', type: 'income', label: 'Investimenti', icon: 'trending-up', color: '#8B5CF6' },
  { id: 'altro_entrata', type: 'income', label: 'Altro', icon: 'ellipsis-horizontal', color: '#94A3B8' },
];

export const COLOR_CHOICES = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#22C55E', '#14B8A6',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#94A3B8',
];

export const ICON_CHOICES = [
  'home', 'cart', 'car', 'restaurant', 'cafe', 'game-controller', 'medkit', 'bag',
  'flash', 'airplane', 'briefcase', 'gift', 'paw', 'school', 'fitness', 'musical-notes',
  'shirt', 'phone-portrait', 'wifi', 'construct', 'book', 'bus', 'beer', 'heart',
  'wallet', 'cash', 'card', 'trending-up', 'sparkles', 'ellipsis-horizontal',
];

export function newCategoryId(): string {
  return `c_${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
