import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { exportCsv, pickAndImportCsv } from '@/features/backup';
import { useBudgets } from '@/features/budgets-provider';
import { useCategories } from '@/features/categories-provider';
import { useLock } from '@/features/lock-provider';
import { useRecurring } from '@/features/recurring-provider';
import { type ThemePreference, useSettings } from '@/features/settings-provider';
import { useTransactions } from '@/features/transactions-provider';
import { useTheme } from '@/hooks/use-theme';

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Chiaro' },
  { id: 'dark', label: 'Scuro' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const lock = useLock();
  const { theme: themePref, setTheme } = useSettings();
  const { transactions, addMany } = useTransactions();
  const { budgets } = useBudgets();
  const { rules } = useRecurring();
  const { categories, getCategory, addCategory, reloadCategories } = useCategories();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Qualcosa è andato storto', e instanceof Error ? e.message : 'Riprova tra poco.');
    } finally {
      setBusy(null);
    }
  };

  const onExport = () =>
    run('export', async () => {
      if (transactions.length === 0) {
        Alert.alert('Niente da esportare', 'Non ci sono ancora movimenti.');
        return;
      }
      const res = await exportCsv(transactions, (id) => getCategory(id).label);
      if (res === 'unavailable') Alert.alert('Condivisione non disponibile su questo dispositivo.');
    });

  const onImport = () =>
    run('import', async () => {
      const r = await pickAndImportCsv({
        existing: transactions,
        categories,
        addCategory,
        insertMany: addMany,
      });
      if (!r) return;
      await reloadCategories();
      const lines = [
        `Importati: ${r.imported}`,
        r.duplicates ? `Già presenti (saltati): ${r.duplicates}` : null,
        r.invalid ? `Righe non valide (saltate): ${r.invalid}` : null,
        r.newCategories ? `Nuove categorie create: ${r.newCategories}` : null,
      ].filter(Boolean);
      Alert.alert('Importazione completata', lines.join('\n'));
    });

  const onToggleLock = (on: boolean) => router.push({ pathname: '/pin', params: { mode: on ? 'setup' : 'disable' } });

  const onToggleBio = async (on: boolean) => {
    const ok = await lock.setBiometricEnabled(on);
    if (!ok && on) Alert.alert('Autenticazione non riuscita', 'La biometria non è stata attivata.');
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <SectionTitle>Sicurezza</SectionTitle>
      <Group>
        <Row icon="lock-closed" title="Blocco con PIN" right={<Switch value={lock.enabled} onValueChange={onToggleLock} />} />
        {lock.enabled ? (
          <Row
            icon="key"
            title="Cambia PIN"
            onPress={() => router.push({ pathname: '/pin', params: { mode: 'change' } })}
            chevron
          />
        ) : null}
        {lock.enabled && lock.biometricAvailable ? (
          <Row
            icon="finger-print"
            title={`Sblocca con ${lock.biometricLabel}`}
            right={<Switch value={lock.biometricEnabled} onValueChange={onToggleBio} />}
          />
        ) : null}
      </Group>
      <Hint>
        {lock.enabled
          ? 'Il PIN è richiesto all’apertura e dopo 30 secondi in background.'
          : 'Proteggi i tuoi dati: all’apertura dell’app verrà chiesto un PIN.'}
      </Hint>

      <SectionTitle>Pianificazione</SectionTitle>
      <Group>
        <Row
          icon="speedometer-outline"
          title="Budget mensile"
          detail={Object.keys(budgets).length ? `${Object.keys(budgets).length} impostati` : undefined}
          onPress={() => router.push('/budgets')}
          chevron
        />
        <Row
          icon="repeat"
          title="Spese ricorrenti"
          detail={rules.length ? `${rules.filter((r) => r.active).length} attive` : undefined}
          onPress={() => router.push('/recurring')}
          chevron
        />
      </Group>
      <Hint>Le ricorrenze (affitto, abbonamenti…) si registrano da sole alla scadenza, anche se non apri l’app quel giorno.</Hint>

      <SectionTitle>Categorie</SectionTitle>
      <Group>
        <Row
          icon="pricetags"
          title="Gestisci categorie"
          detail={`${categories.length}`}
          onPress={() => router.push('/categories')}
          chevron
        />
      </Group>

      <SectionTitle>Dati e backup</SectionTitle>
      <Group>
        <Row
          icon="share-outline"
          title="Esporta in CSV"
          detail={busy === 'export' ? undefined : `${transactions.length} movimenti`}
          loading={busy === 'export'}
          onPress={onExport}
        />
        <Row icon="download-outline" title="Importa da CSV" loading={busy === 'import'} onPress={onImport} />
      </Group>
      <Hint>
        Per cambiare telefono: esporta il CSV, salvalo (Drive, e-mail…), poi importalo nel nuovo telefono. Reimportare lo
        stesso file non crea doppioni. Il CSV contiene solo i movimenti: budget e ricorrenze vanno reimpostati.
      </Hint>

      <SectionTitle>Aspetto</SectionTitle>
      <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
        {THEME_OPTIONS.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => setTheme(o.id)}
            style={[styles.segmentItem, themePref === o.id && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">{o.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
        MyMoney {Constants.expoConfig?.version ?? ''} · i tuoi dati restano solo su questo telefono
      </ThemedText>
    </ScrollView>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean) as React.ReactElement[];
  return (
    <View style={[styles.group, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {items.map((child, i) => (
        <View
          key={i}
          style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border } : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
}

function Hint({ children }: { children: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
      {children}
    </ThemedText>
  );
}

function Row({
  icon,
  title,
  detail,
  right,
  onPress,
  chevron,
  destructive,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const color = destructive ? theme.expense : theme.text;
  return (
    <Pressable
      disabled={!onPress || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={22} color={destructive ? theme.expense : theme.accent} />
      <ThemedText style={{ flex: 1, color }}>{title}</ThemedText>
      {loading ? <ActivityIndicator /> : null}
      {detail ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      ) : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  group: { borderRadius: 16, paddingHorizontal: Spacing.three, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 52, paddingVertical: 8 },
  hint: { marginTop: Spacing.two, paddingHorizontal: Spacing.two },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  version: { textAlign: 'center', marginTop: Spacing.five },
});
