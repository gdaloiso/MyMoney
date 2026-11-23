import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/features/categories-provider';
import { useTransactions } from '@/features/transactions-provider';
import { useTheme } from '@/hooks/use-theme';
import { COLOR_CHOICES, FALLBACK_ID, ICON_CHOICES } from '@/lib/categories';
import type { TransactionType } from '@/lib/types';

export default function CategoryFormScreen() {
  const theme = useTheme();
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: TransactionType }>();
  const { categories, addCategory, editCategory, removeCategory } = useCategories();
  const { transactions } = useTransactions();

  const editing = id ? categories.find((c) => c.id === id) : undefined;
  const type: TransactionType = editing?.type ?? (typeParam === 'income' ? 'income' : 'expense');
  const isFallback = editing ? Object.values(FALLBACK_ID).includes(editing.id) : false;

  const [label, setLabel] = useState(editing?.label ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? 'wallet');
  const [color, setColor] = useState(editing?.color ?? COLOR_CHOICES[7]);
  const [saving, setSaving] = useState(false);

  const trimmed = label.trim();
  const duplicate = categories.some(
    (c) => c.type === type && c.id !== editing?.id && c.label.toLowerCase() === trimmed.toLowerCase(),
  );
  const valid = trimmed.length > 0 && !duplicate;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      if (editing) await editCategory(editing.id, { label: trimmed, icon, color });
      else await addCategory({ type, label: trimmed, icon, color });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Errore', 'Non sono riuscito a salvare la categoria.');
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    const used = transactions.filter((t) => t.category === editing.id).length;
    const msg = used
      ? `${used} moviment${used === 1 ? 'o verrà spostato' : 'i verranno spostati'} nella categoria "Altro".`
      : 'La categoria non è usata da nessun movimento.';
    Alert.alert(`Eliminare "${editing.label}"?`, msg, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await removeCategory(editing.id, editing.type);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: editing ? 'Modifica categoria' : 'Nuova categoria' }} />

      <View style={styles.preview}>
        <View style={[styles.previewIcon, { backgroundColor: color + '26' }]}>
          <Ionicons name={icon as never} size={34} color={color} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {type === 'expense' ? 'Categoria di spesa' : 'Categoria di entrata'}
        </ThemedText>
      </View>

      <SectionTitle>Nome</SectionTitle>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Es. Animali"
        placeholderTextColor={theme.textSecondary}
        maxLength={24}
        autoFocus={!editing}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
      {duplicate ? (
        <ThemedText type="small" style={{ color: theme.expense }}>
          Esiste già una categoria con questo nome
        </ThemedText>
      ) : null}

      <SectionTitle>Icona</SectionTitle>
      <View style={styles.grid}>
        {ICON_CHOICES.map((name) => (
          <Pressable
            key={name}
            onPress={() => setIcon(name)}
            style={[
              styles.iconCell,
              { backgroundColor: theme.backgroundElement },
              icon === name && { borderColor: color, backgroundColor: color + '26' },
            ]}>
            <Ionicons name={name as never} size={22} color={icon === name ? color : theme.text} />
          </Pressable>
        ))}
      </View>

      <SectionTitle>Colore</SectionTitle>
      <View style={styles.grid}>
        {COLOR_CHOICES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.colorCell, { backgroundColor: c }, color === c && styles.colorSelected]}>
            {color === c ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={save}
        disabled={!valid || saving}
        style={[styles.save, { backgroundColor: theme.accent }, (!valid || saving) && { opacity: 0.4 }]}>
        <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
          {editing ? 'Salva modifiche' : 'Aggiungi categoria'}
        </ThemedText>
      </Pressable>

      {editing && !isFallback ? (
        <Pressable onPress={confirmDelete} style={styles.delete}>
          <ThemedText style={{ color: theme.expense }}>Elimina categoria</ThemedText>
        </Pressable>
      ) : null}
      {isFallback ? (
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 12 }}>
          Questa categoria raccoglie i movimenti delle categorie eliminate, quindi non si può rimuovere.
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  preview: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  previewIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  input: { padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorCell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  save: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: 14, alignItems: 'center' },
  delete: { padding: Spacing.three, alignItems: 'center' },
});
