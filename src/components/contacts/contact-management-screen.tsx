import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ContactAvatar } from '@/components/contacts/contact-avatar';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import {
  deleteSupplier,
  getSuppliers,
} from '@/db/repositories/purchases';
import {
  deleteCustomer,
  getCustomers,
} from '@/db/repositories/sales';
import type { Customer, Supplier } from '@/db/types';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export type ContactKind = 'supplier' | 'customer';
type ContactRecord = Supplier | Customer;

export function ContactManagementScreen({ kind }: { kind: ContactKind }) {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    setLoading(true);
    setError(null);
    try {
      const rows = kind === 'supplier'
        ? await getSuppliers(db, factory.id)
        : await getCustomers(db, factory.id);
      setContacts(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory, kind]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.phone, contact.address]
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
    );
  }, [contacts, query]);

  const openForm = (id?: string) => {
    if (kind === 'supplier') {
      router.push(id ? { pathname: '/supplier-form', params: { id } } : '/supplier-form');
    } else {
      router.push(id ? { pathname: '/customer-form', params: { id } } : '/customer-form');
    }
  };

  const handleDelete = async (contact: ContactRecord) => {
    if (!factory || deletingId) return;
    setDeletingId(contact.id);
    setError(null);
    setSuccess(null);
    try {
      if (kind === 'supplier') {
        await deleteSupplier(db, factory.id, contact.id);
      } else {
        await deleteCustomer(db, factory.id, contact.id);
      }
      setContacts((current) => current.filter((item) => item.id !== contact.id));
      setConfirmDeleteId(null);
      setSuccess(fa.contacts.deleteSuccess);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingId(null);
    }
  };

  const title = kind === 'supplier'
    ? fa.contacts.suppliersTitle
    : fa.contacts.customersTitle;
  const addLabel = kind === 'supplier'
    ? fa.purchases.addSupplier
    : fa.sales.addCustomer;
  const emptyLabel = kind === 'supplier'
    ? fa.contacts.noSuppliers
    : fa.contacts.noCustomers;
  const editLabel = kind === 'supplier'
    ? fa.contacts.editSupplier
    : fa.contacts.editCustomer;

  return (
    <Screen>
      <ScreenHeader title={title} onBack={() => router.back()} />
      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
          <AppButton label={fa.common.retry} variant="secondary" onPress={() => void load()} />
        </Card>
      ) : null}
      {success ? (
        <Card tone="success">
          <ThemedText type="small">{success}</ThemedText>
        </Card>
      ) : null}

      <AppButton label={addLabel} onPress={() => openForm()} />

      <AppTextInput
        accessibilityLabel={fa.common.search}
        placeholder={fa.common.search}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {query.trim() ? fa.common.noResults : emptyLabel}
          </ThemedText>
        </Card>
      ) : filteredContacts.map((contact) => (
        <Card key={contact.id}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${contact.name}, ${fa.contacts.transactions}`}
            onPress={() => router.push({
              pathname: '/contact/[kind]/[id]',
              params: { kind, id: contact.id },
            })}
            style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
          >
            <ContactAvatar name={contact.name} photoUri={contact.photoUri} size={48} />
            <View style={styles.contactDetails}>
              <ThemedText type="smallBold">{contact.name}</ThemedText>
              {contact.phone ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {contact.phone}
                </ThemedText>
              ) : null}
              {contact.address ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {contact.address}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
          <View style={styles.actions}>
            <AppButton
              label={editLabel}
              size="small"
              variant="secondary"
              disabled={Boolean(deletingId)}
              onPress={() => openForm(contact.id)}
              style={styles.action}
            />
            <AppButton
              label={fa.contacts.delete}
              size="small"
              variant="danger"
              disabled={Boolean(deletingId)}
              onPress={() => setConfirmDeleteId(
                confirmDeleteId === contact.id ? null : contact.id
              )}
              style={styles.action}
            />
          </View>
          {confirmDeleteId === contact.id ? (
            <View style={styles.confirmation}>
              <ThemedText type="caption">
                {fa.contacts.deletePrompt(contact.name)}
              </ThemedText>
              <View style={styles.actions}>
                <AppButton
                  label={fa.common.cancel}
                  size="small"
                  variant="secondary"
                  disabled={Boolean(deletingId)}
                  onPress={() => setConfirmDeleteId(null)}
                  style={styles.action}
                />
                <AppButton
                  label={fa.contacts.confirmDelete}
                  size="small"
                  variant="danger"
                  loading={deletingId === contact.id}
                  onPress={() => void handleDelete(contact)}
                  style={styles.action}
                />
              </View>
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: { opacity: 0.72 },
  contactDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  confirmation: { gap: Spacing.two, paddingTop: Spacing.two },
});
