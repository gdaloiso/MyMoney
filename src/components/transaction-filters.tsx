import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useCategories } from "@/features/categories-provider";
import { useTheme } from "@/hooks/use-theme";
import {
  EMPTY_FILTER,
  isFilterActive,
  type TransactionFilter,
  type TypeFilter,
} from "@/lib/filter";

const TYPES: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "expense", label: "Uscite" },
  { value: "income", label: "Entrate" },
];

type Props = {
  filter: TransactionFilter;
  onChange: (f: TransactionFilter) => void;
  resultCount: number;
};

export function TransactionFilters({ filter, onChange, resultCount }: Props) {
  const theme = useTheme();
  const { categories } = useCategories();

  const visible = useMemo(
    () =>
      categories.filter((c) => filter.type === "all" || c.type === filter.type),
    [categories, filter.type],
  );
  const duplicated = useMemo(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const c of visible) (seen.has(c.label) ? dup : seen).add(c.label);
    return dup;
  }, [visible]);

  const setType = (type: TypeFilter) => {
    const allowed = new Set(
      categories
        .filter((c) => type === "all" || c.type === type)
        .map((c) => c.id),
    );
    onChange({
      ...filter,
      type,
      categoryIds: filter.categoryIds.filter((id) => allowed.has(id)),
    });
  };
  const toggleCategory = (id: string) =>
    onChange({
      ...filter,
      categoryIds: filter.categoryIds.includes(id)
        ? filter.categoryIds.filter((x) => x !== id)
        : [...filter.categoryIds, id],
    });

  const active = isFilterActive(filter);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.search,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          value={filter.query}
          onChangeText={(query) => onChange({ ...filter, query })}
          placeholder="Cerca per nota, categoria o importo"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Cerca movimenti"
          style={[styles.input, { color: theme.text }]}
        />
        {filter.query ? (
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancella ricerca"
            onPress={() => onChange({ ...filter, query: "" })}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.typeRow}>
        {TYPES.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={filter.type === o.value}
            onPress={() => setType(o.value)}
          />
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.catRow}
      >
        {visible.map((c) => (
          <Chip
            key={c.id}
            label={
              filter.type === "all" && duplicated.has(c.label)
                ? `${c.label} (${c.type === "income" ? "entrata" : "spesa"})`
                : c.label
            }
            color={c.color}
            selected={filter.categoryIds.includes(c.id)}
            onPress={() => toggleCategory(c.id)}
          />
        ))}
      </ScrollView>

      {active ? (
        <View style={styles.summary}>
          <ThemedText type="small" themeColor="textSecondary">
            {resultCount === 1 ? "1 movimento" : `${resultCount} movimenti`}
          </ThemedText>
          <Pressable hitSlop={10} onPress={() => onChange(EMPTY_FILTER)}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Azzera filtri
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  selected,
  color,
  onPress,
}: {
  label: string;
  selected: boolean;
  color?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      {color ? (
        <View
          style={[styles.dot, { backgroundColor: selected ? "#fff" : color }]}
        />
      ) : null}
      <ThemedText
        type="small"
        style={{ color: selected ? "#fff" : theme.text, fontWeight: "600" }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  typeRow: { flexDirection: "row", gap: Spacing.two },
  catRow: { gap: Spacing.two, paddingRight: Spacing.three },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
