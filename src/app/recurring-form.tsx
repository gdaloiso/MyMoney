import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { DateStepper } from '@/components/date-stepper';
import { ThemedText } from '@/components/themed-text';
import { SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/features/categories-provider';
import { useRecurring } from '@/features/recurring-provider';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney, parseAmountToCents, toISODate } from '@/lib/format';
import { countUpTo, describeRecurrence, type Frequency } from '@/lib/recurring';
import type { TransactionType } from '@/lib/types';

export default function RecurringFormScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { rules, addRule, updateRule, removeRule } = useRecurring();
  const { categoriesFor } = useCategories();
  const editing = id ? rules.find((r) => r.id === Number(id)) : undefined;
  const today = toISODate(new Date());

  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [amount, setAmount] = useState(
    editing ? (editing.amountCents / 100).toFixed(2).replace('.', ',') : '',
  );
  const [category, setCategory] = useState(editing?.category ?? categoriesFor('expense')[0]?.id ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [startDate, setStartDate] = useState(editing?.startDate ?? today);
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? 'monthly');
  const [active, setActive] = useState(editing?.active ?? true);
  const [backfill, setBackfill] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dopo la prima registrazione data e frequenza non si cambiano (altrimenti le scadenze si sfalserebbero)
  const locked = !!editing && editing.generatedCount > 0;
  const cents = parseAmountToCents(amount);
  const valid = Number.isFinite(cents) && cents > 0 && category !== '';
  const pastCount = !editing && startDate <= today ? countUpTo(startDate, frequency, today) : 0;
  const accent = type === 'income' ? theme.income : theme.expense;

  const switchType = (next: TransactionType) => {
    setType(next);
    setCategory(categoriesFor(next)[0]?.id ?? '');
  };

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = { type, amountCents: cents, category, note: note.trim(), startDate, frequency, active };
      if (editing) await updateRule(editing, payload);
      else await addRule(payload, backfill);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Errore', 'Non sono riuscito a salvare la ricorrenza.');
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert(
      'Eliminare la ricorrenza?',
      'Non verranno più registrati nuovi movimenti. Quelli già registrati restano.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await removeRule(editing.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editing ? 'Modifica ricorrenza' : 'Nuova ricorrenza' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {(['expense', 'income'] as const).map((tp) => (
            <Pressable
              key={tp}
              disabled={!!editing}
              onPress={() => switchType(tp)}
              style={[styles.segmentItem, type === tp && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={type === tp ? { color: accent } : undefined}>
                {tp === 'expense' ? 'Spesa' : 'Entrata'}
              </ThemedText>
            </Pressable>
          ))}
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
        ) : null}

        <SectionTitle>Nome</SectionTitle>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Es. Affitto, Netflix, Palestra"
          placeholderTextColor={theme.textSecondary}
          maxLength={40}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
        />

        <SectionTitle>Categoria</SectionTitle>
        <View style={styles.grid}>
          {categoriesFor(type).map((c) => {
            const on = c.id === category;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.chip,
                  { backgroundColor: theme.backgroundElement },
                  on && { borderColor: c.color, backgroundColor: c.color + '26' },
                ]}>
                <Ionicons name={c.icon as never} size={18} color={c.color} />
                <ThemedText type="small">{c.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Frequenza</SectionTitle>
        <View
          style={[
            styles.segment,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            locked && { opacity: 0.5 },
          ]}>
          {(['monthly', 'yearly'] as const).map((f) => (
            <Pressable
              key={f}
              disabled={locked}
              onPress={() => setFrequency(f)}
              style={[styles.segmentItem, frequency === f && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">{f === 'monthly' ? 'Ogni mese' : 'Ogni anno'}</ThemedText>
            </Pressable>
          ))}
        </View>

        <SectionTitle>{locked ? 'Prima scadenza' : 'Data della prima scadenza'}</SectionTitle>
        {locked ? (
          <ThemedText type="small" themeColor="textSecondary">
            {describeRecurrence({ startDate, frequency })}. Data e frequenza non si possono cambiare dopo la prima
            registrazione: per modificarle, elimina la ricorrenza e creane una nuova.
          </ThemedText>
        ) : (
          <>
            <DateStepper date={startDate} onChange={setStartDate} />
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6 }}>
              {describeRecurrence({ startDate, frequency })}
              {valid ? ` · ${formatMoney(cents)}` : ''}
            </ThemedText>
          </>
        )}

        {pastCount > 0 ? (
          <View style={[styles.switchRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">Registra anche le scadenze passate</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {backfill
                  ? `Verranno creati ${pastCount} movimenti dal passato.`
                  : 'Si parte dalla prossima scadenza. Utile se hai già importato i movimenti passati.'}
              </ThemedText>
            </View>
            <Switch value={backfill} onValueChange={setBackfill} />
          </View>
        ) : null}

        {editing ? (
          <View style={[styles.switchRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">Attiva</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                In pausa non registra nulla. Riattivandola ripartirà dalla prossima scadenza.
              </ThemedText>
            </View>
            <Switch value={active} onValueChange={setActive} />
          </View>
        ) : null}

        <Pressable
          onPress={save}
          disabled={!valid || saving}
          style={[styles.save, { backgroundColor: accent }, (!valid || saving) && { opacity: 0.4 }]}>
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
            {editing ? 'Salva modifiche' : 'Crea ricorrenza'}
          </ThemedText>
        </Pressable>

        {editing ? (
          <Pressable onPress={confirmDelete} style={styles.delete}>
            <ThemedText style={{ color: theme.expense }}>Elimina ricorrenza</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, borderWidth: StyleSheet.hairlineWidth },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  amountInput: { fontSize: 44, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  input: { padding: Spacing.three, borderRadius: 12, fontSize: 16, borderWidth: StyleSheet.hairlineWidth },
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
  },
  save: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: 14, alignItems: 'center' },
  delete: { padding: Spacing.three, alignItems: 'center' },
});
