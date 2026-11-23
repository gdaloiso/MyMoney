import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

import { LockGate } from '@/components/lock-gate';
import { DATABASE_NAME, migrateDb } from '@/db/database';
import { BudgetsProvider } from '@/features/budgets-provider';
import { CategoriesProvider } from '@/features/categories-provider';
import { LockProvider } from '@/features/lock-provider';
import { RecurringProvider } from '@/features/recurring-provider';
import { SettingsProvider } from '@/features/settings-provider';
import { TransactionsProvider } from '@/features/transactions-provider';

function buildNavTheme(dark: boolean) {
  const c = Colors[dark ? 'dark' : 'light'];
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: c.background,
      card: c.background,
      text: c.text,
      border: c.border,
      primary: c.accent,
    },
  };
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={buildNavTheme(scheme === 'dark')}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb}>
        <SettingsProvider>
          <LockProvider>
            <CategoriesProvider>
              <TransactionsProvider>
               <BudgetsProvider>
                <RecurringProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Nuovo movimento' }} />
                  <Stack.Screen name="categories" options={{ title: 'Categorie' }} />
                  <Stack.Screen
                    name="category-form"
                    options={{ presentation: 'modal', title: 'Categoria' }}
                  />
                  <Stack.Screen name="pin" options={{ presentation: 'modal', title: 'PIN' }} />
                  <Stack.Screen name="budgets" options={{ title: 'Budget mensile' }} />
                  <Stack.Screen name="recurring" options={{ title: 'Spese ricorrenti' }} />
                  <Stack.Screen
                    name="recurring-form"
                    options={{ presentation: 'modal', title: 'Ricorrenza' }}
                  />
                </Stack>
                <LockGate />
                </RecurringProvider>
               </BudgetsProvider>
              </TransactionsProvider>
            </CategoriesProvider>
          </LockProvider>
        </SettingsProvider>
      </SQLiteProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
