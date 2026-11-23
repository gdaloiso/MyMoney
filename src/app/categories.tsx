import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/features/categories-provider';
import { useTheme } from '@/hooks/use-theme';
import type { TransactionType } from '@/lib/types';

export default function CategoriesScreen() {
  const theme = useTheme();
  const { categoriesFor } = useCategories();
  const [type, setType] = useState<TransactionType>('expense');

  const list = categoriesFor(type);

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Categorie' }} />

      <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
        {(['expense', 'income'] as const).map((tp) => (
          <Pressable
            key={tp}
            onPress={() => setType(tp)}
            style={[styles.segmentItem, type === tp && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">{tp === 'expense' ? 'Spese' : 'Entrate'}</ThemedText>
          </Pressable>
        ))}
      </View>

      <SectionTitle>{type === 'expense' ? 'Categorie di spesa' : 'Categorie di entrata'}</SectionTitle>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {list.map((c, i) => (
          <Pressable
            key={c.id}
            onPress={() => router.push({ pathname: '/category-form', params: { id: c.id } })}
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
              pressed && { opacity: 0.6 },
            ]}>
            <View style={[styles.icon, { backgroundColor: c.color + '26' }]}>
              <Ionicons name={c.icon as never} size={20} color={c.color} />
            </View>
            <ThemedText style={{ flex: 1 }}>{c.label}</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/category-form', params: { type } })}
        style={[styles.add, { borderColor: theme.accent }]}>
        <Ionicons name="add" size={20} color={theme.accent} />
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          Nuova categoria
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  card: { borderRadius: 16, paddingHorizontal: Spacing.three, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
