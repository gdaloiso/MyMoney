import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/features/categories-provider';
import { formatMoney } from '@/lib/format';
import type { Transaction } from '@/lib/types';

type Props = {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function TransactionRow({ transaction: t, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const { getCategory } = useCategories();
  const cat = getCategory(t.category);
  const sign = t.type === 'income' ? '+' : '−';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={[styles.icon, { backgroundColor: cat.color + '26' }]}>
        <Ionicons name={cat.icon as never} size={20} color={cat.color} />
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          {t.recurringId ? <Ionicons name="repeat" size={14} color={theme.textSecondary} /> : null}
          <ThemedText type="default" numberOfLines={1} style={{ flexShrink: 1 }}>
            {t.note || cat.label}
          </ThemedText>
        </View>
        {t.note ? (
          <ThemedText type="small" themeColor="textSecondary">
            {cat.label}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText
        type="default"
        style={{ color: t.type === 'income' ? theme.income : theme.text, fontWeight: '700' }}>
        {sign} {formatMoney(t.amountCents)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
