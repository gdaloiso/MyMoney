import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTransactions } from '@/features/transactions-provider';
import { useTheme } from '@/hooks/use-theme';
import { useBudgets } from '@/features/budgets-provider';
import { useCategories } from '@/features/categories-provider';
import {
  addDays,
  dayLabel,
  formatMoney,
  monthKey,
  parseAmountToCents,
  toISODate,
} from '@/lib/format';
import type { TransactionType } from '@/lib/types';

export default function AddScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { transactions, add, update, remove } = useTransactions();
  const { categoriesFor, getCategory } = useCategories();
  const { budgets } = useBudgets();
  const editing = id ? transactions.find((t) => t.id === Number(id)) : undefined;

  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [amount, setAmount] = useState(
    editing ? (editing.amountCents / 100).toFixed(2).replace('.', ',') : '',
  );
  const [category, setCategory] = useState(editing?.category ?? categoriesFor('expense')[0].id);
  const [note, setNote] = useState(editing?.note ?? '');
  const [date, setDate] = useState(editing?.date ?? toISODate(new Date()));
  const [saving, setSaving] = useState(false);

  const cents = parseAmountToCents(amount);
  const valid = Number.isFinite(cents) && cents > 0;
  const today = toISODate(new Date());

  // Avviso budget: quanto si arriva a spendere in questa categoria nel mese della data scelta
  const budgetNote = useMemo(() => {
    const limit = budgets[category];
    if (type !== 'expense' || !valid || !limit) return null;
    const m = monthKey(date);
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === category && monthKey(t.date) === m && t.id !== editing?.id)
      .reduce((sum, t) => sum + t.amountCents, 0);
    const after = spent + cents;
    return { limit, after, over: after > limit };
  }, [budgets, category, type, valid, date, cents, transactions, editing?.id]);

  const switchType = (next: TransactionType) => {
    setType(next);
    setCategory(categoriesFor(next)[0].id);
  };

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = { type, amountCents: cents, category, note: note.trim(), date };
      if (editing) await update(editing.id, payload);
      else await add(payload);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Errore', 'Non sono riuscito a salvare il movimento.');
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert('Eliminare il movimento?', 'Questa azione non si può annullare.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await remove(editing.id);
          router.back();
        },
      },
    ]);
  };

  const accent = type === 'income' ? theme.income : theme.expense;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editing ? 'Modifica movimento' : 'Nuovo movimento' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {(['expense', 'income'] as const).map((tp) => {
            const active = type === tp;
            return (
              <Pressable
                key={tp}
                onPress={() => switchType(tp)}
                style={[styles.segmentItem, active && { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold" style={active ? { color: accent } : undefined}>
                  {tp === 'expense' ? 'Spesa' : 'Entrata'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.amountBox}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            autoFocus={!editing}
            style={[styles.amountInput, { color: accent }]}
          />
          <ThemedText type="subtitle" style={{ color: accent }}>
            €
          </ThemedText>
        </View>
        {amount.length > 0 && !valid ? (
          <ThemedText type="small" style={{ color: theme.expense, textAlign: 'center' }}>
            Importo non valido
          </ThemedText>
        ) : valid ? (
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {formatMoney(cents)}
          </ThemedText>
        ) : null}
        {budgetNote ? (
          <ThemedText
            type="smallBold"
            style={{ textAlign: 'center', color: budgetNote.over ? theme.expense : theme.textSecondary }}>
            {budgetNote.over ? 'Supererai il budget' : 'Budget'} {getCategory(category).label}:{' '}
            {formatMoney(budgetNote.after)} su {formatMoney(budgetNote.limit)}
          </ThemedText>
        ) : null}

        <SectionTitle>Categoria</SectionTitle>
        <View style={styles.grid}>
          {categoriesFor(type).map((c) => {
            const active = c.id === category;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.chip,
                  { backgroundColor: theme.backgroundElement },
                  active && { borderColor: c.color, backgroundColor: c.color + '26' },
                ]}>
                <Ionicons name={c.icon as never} size={18} color={c.color} />
                <ThemedText type="small">{c.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Data</SectionTitle>
        <View style={[styles.dateRow, { backgroundColor: theme.backgroundElement }]}>
          <Pressable hitSlop={12} onPress={() => setDate(addDays(date, -1))}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="default">{dayLabel(date)}</ThemedText>
          <Pressable
            hitSlop={12}
            disabled={date >= today}
            onPress={() => setDate(addDays(date, 1))}
            style={date >= today && { opacity: 0.3 }}>
            <Ionicons name="chevron-forward" size={22} color={theme.text} />
          </Pressable>
        </View>

        <SectionTitle>Nota (facoltativa)</SectionTitle>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Es. Cena con amici"
          placeholderTextColor={theme.textSecondary}
          style={[styles.note, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          maxLength={80}
        />

        <Pressable
          onPress={save}
          disabled={!valid || saving}
          style={[styles.save, { backgroundColor: accent }, (!valid || saving) && { opacity: 0.4 }]}>
          <ThemedText type="default" style={{ color: '#fff', fontWeight: '700' }}>
            {editing ? 'Salva modifiche' : 'Aggiungi'}
          </ThemedText>
        </Pressable>

        {editing ? (
          <Pressable onPress={confirmDelete} style={styles.delete}>
            <ThemedText type="default" style={{ color: theme.expense }}>
              Elimina movimento
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  amountInput: { fontSize: 48, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 12,
  },
  note: { padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  save: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: 14, alignItems: 'center' },
  delete: { padding: Spacing.three, alignItems: 'center' },
});
