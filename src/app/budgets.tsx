import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useBudgets } from '@/features/budgets-provider';
import { useCategories } from '@/features/categories-provider';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/lib/categories';
import { parseAmountToCents } from '@/lib/format';

const toText = (cents?: number) => (cents ? (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') : '');

export default function BudgetsScreen() {
  const theme = useTheme();
  const { categoriesFor } = useCategories();
  const { budgets, setBudget } = useBudgets();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      <Stack.Screen options={{ title: 'Budget mensile' }} />
      <ThemedText type="small" themeColor="textSecondary">
        Imposta quanto vuoi spendere al massimo ogni mese per categoria. Lascia vuoto per non avere un limite.
        Il limite vale per ogni mese.
      </ThemedText>

      <SectionTitle>Limite mensile per categoria</SectionTitle>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {categoriesFor('expense').map((c, i) => (
          <BudgetRow
            key={c.id}
            category={c}
            first={i === 0}
            cents={budgets[c.id]}
            onCommit={(cents) => setBudget(c.id, cents)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function BudgetRow({
  category,
  first,
  cents,
  onCommit,
}: {
  category: Category;
  first: boolean;
  cents?: number;
  onCommit: (cents: number | null) => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(toText(cents));
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    const t = text.trim();
    if (t === '') {
      setInvalid(false);
      return onCommit(null);
    }
    const parsed = parseAmountToCents(t);
    if (!Number.isFinite(parsed) || parsed <= 0) return setInvalid(true);
    setInvalid(false);
    setText(toText(parsed));
    onCommit(parsed);
  };

  return (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
      ]}>
      <View style={[styles.icon, { backgroundColor: category.color + '26' }]}>
        <Ionicons name={category.icon as never} size={20} color={category.color} />
      </View>
      <ThemedText style={{ flex: 1 }}>{category.label}</ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        placeholder="—"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.background, borderColor: invalid ? theme.expense : 'transparent' },
        ]}
      />
      <ThemedText themeColor="textSecondary">€</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  card: { borderRadius: 16, paddingHorizontal: Spacing.three, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  input: {
    minWidth: 90,
    textAlign: 'right',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
