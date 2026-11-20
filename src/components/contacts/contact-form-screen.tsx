import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ContactPhotoField } from '@/components/contacts/contact-avatar';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import {
  getSuppliers,
  saveSupplier,
} from '@/db/repositories/purchases';
import {
  getCustomers,
  saveCustomer,
} from '@/db/repositories/sales';
import type { Customer, Supplier } from '@/db/types';
import { fa } from '@/i18n';
import { deleteStoredProductPhoto, persistProductPhoto } from '@/lib/product-photos';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export function ContactFormScreen({
  kind,
}: {
  kind: 'supplier' | 'customer';
}) {
  const { id: routeId } = useLocalSearchParams<{ id?: string }>();
  const contactId = typeof routeId === 'string' ? routeId : undefined;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [contact, setContact] = useState<Supplier | Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(contactId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contactId) {
      setContact(null);
      setLoading(false);
      return;
    }
    if (!factory) return;
    setLoading(true);
    setError(null);
    try {
      const rows = kind === 'supplier'
        ? await getSuppliers(db, factory.id, true)
        : await getCustomers(db, factory.id, true);
      const row = rows.find((item) => item.id === contactId) ?? null;
      if (!row) throw new Error(fa.contacts.contactNotFound);
      setContact(row);
      setName(row.name);
      setPhone(row.phone ?? '');
      setAddress(row.address ?? '');
      setNotes(row.notes ?? '');
      setPhotoUri(row.photoUri);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [contactId, db, factory, kind]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!factory || saving) return;
    if (name.trim().length < 2) {
      setError(fa.contacts.nameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    let savedPhotoUri: string | null = null;
    let photoCopyCreated = false;
    try {
      savedPhotoUri = photoUri ? await persistProductPhoto(photoUri) : null;
      photoCopyCreated = Boolean(photoUri && savedPhotoUri !== photoUri);
      const input = {
        factoryId: factory.id,
        id: contactId,
        name,
        phone,
        address,
        photoUri: savedPhotoUri,
        notes,
      };
      if (kind === 'supplier') {
        await saveSupplier(db, input);
      } else {
        await saveCustomer(db, input);
      }
      photoCopyCreated = false;
      if (contact?.photoUri && contact.photoUri !== savedPhotoUri) {
        deleteStoredProductPhoto(contact.photoUri);
      }
      router.back();
    } catch (cause) {
      let message = cause instanceof Error ? cause.message : String(cause);
      if (photoCopyCreated && savedPhotoUri) {
        try {
          deleteStoredProductPhoto(savedPhotoUri);
        } catch (cleanupCause) {
          const cleanupMessage = cleanupCause instanceof Error
            ? cleanupCause.message
            : String(cleanupCause);
          message = `${message} ${cleanupMessage}`;
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const title = kind === 'supplier'
    ? contactId ? fa.contacts.editSupplier : fa.purchases.addSupplier
    : contactId ? fa.contacts.editCustomer : fa.sales.addCustomer;
  const nameLabel = kind === 'supplier'
    ? fa.purchases.supplierName
    : fa.sales.customerName;
  const phoneLabel = kind === 'supplier'
    ? fa.purchases.supplierPhone
    : fa.sales.customerPhone;
  const addressLabel = kind === 'supplier'
    ? fa.purchases.supplierAddress
    : fa.sales.customerAddress;
  const notesLabel = kind === 'supplier'
    ? fa.purchases.supplierNotes
    : fa.sales.customerNotes;

  return (
    <Screen>
      <ScreenHeader title={title} onBack={() => router.back()} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : null}
      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
        </Card>
      ) : null}
      {!loading && (!contactId || contact) ? (
        <Card>
          <AppTextInput
            label={nameLabel}
            value={name}
            onChangeText={setName}
            editable={!saving}
          />
          <ContactPhotoField
            name={name}
            value={photoUri}
            onChange={setPhotoUri}
            disabled={saving}
          />
          <AppTextInput
            label={phoneLabel}
            optional
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!saving}
          />
          <AppTextInput
            label={addressLabel}
            optional
            value={address}
            onChangeText={setAddress}
            editable={!saving}
          />
          <AppTextInput
            label={notesLabel}
            optional
            multiline
            value={notes}
            onChangeText={setNotes}
            editable={!saving}
          />
          <View style={styles.actions}>
            <AppButton
              label={fa.common.cancel}
              variant="secondary"
              disabled={saving}
              onPress={() => router.back()}
              style={styles.action}
            />
            <AppButton
              label={fa.common.save}
              loading={saving}
              onPress={() => void save()}
              style={styles.action}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
