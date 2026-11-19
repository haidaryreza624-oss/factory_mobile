import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { BrandMark } from '@/components/ui/brand-mark';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { parseAfnInput, parseUsdInput } from '@/domain/money';
import { createFactoryWithSetup } from '@/db/repositories/factory';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

interface FormErrors {
  name?: string;
  afn?: string;
  usd?: string;
}

export default function SetupScreen() {
  const db = useDatabase();
  const { factory, refresh } = useApp();
  const theme = useTheme();

  const [factoryName, setFactoryName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [openingAfn, setOpeningAfn] = useState('');
  const [openingUsd, setOpeningUsd] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Setup is only reachable while the app is unconfigured. If the factory is
  // created (or already existed), go straight to the dashboard.
  if (factory) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const nextErrors: FormErrors = {};
    const name = factoryName.trim();

    if (name.length === 0) {
      nextErrors.name = fa.setup.nameRequired;
    } else if (name.length < 2) {
      nextErrors.name = fa.setup.nameTooShort;
    }

    const afn = parseAfnInput(openingAfn);
    if (afn === null) {
      nextErrors.afn = fa.setup.invalidAfn;
    }

    const usd = parseUsdInput(openingUsd);
    if (usd === null) {
      nextErrors.usd = fa.setup.invalidUsd;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);

    try {
      await createFactoryWithSetup(db, {
        factoryName: name,
        ownerName: ownerName.trim() || null,
        openingAfn: afn ?? 0,
        openingUsd: usd ?? 0,
      });

      await refresh();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : fa.errors.factoryCreate);
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <BrandMark size={60} showName />
        <ThemedText type="title" style={styles.center}>
          {fa.setup.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={[styles.center, styles.subtitle]}>
          {fa.setup.subtitle}
        </ThemedText>
      </View>

      <Card style={styles.formCard}>
        <AppTextInput
          label={fa.setup.factoryName}
          placeholder={fa.setup.factoryNamePlaceholder}
          value={factoryName}
          onChangeText={(value) => {
            setFactoryName(value);
            if (errors.name) {
              setErrors((current) => ({ ...current, name: undefined }));
            }
          }}
          error={errors.name}
          autoFocus
          maxLength={120}
          returnKeyType="next"
        />

        <AppTextInput
          label={`${fa.setup.ownerName} (${fa.common.optional})`}
          placeholder={fa.setup.ownerNamePlaceholder}
          value={ownerName}
          onChangeText={setOwnerName}
          maxLength={120}
        />

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">{fa.setup.openingTitle}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {fa.setup.openingHint}
          </ThemedText>
        </View>

        <AppTextInput
          label={fa.setup.openingAfn}
          placeholder="۰"
          value={openingAfn}
          onChangeText={(value) => {
            setOpeningAfn(value);
            if (errors.afn) {
              setErrors((current) => ({ ...current, afn: undefined }));
            }
          }}
          error={errors.afn}
          keyboardType="number-pad"
          suffix={fa.units.afn}
        />

        <AppTextInput
          label={fa.setup.openingUsd}
          hint={fa.setup.openingUsdHint}
          placeholder="۰"
          value={openingUsd}
          onChangeText={(value) => {
            setOpeningUsd(value);
            if (errors.usd) {
              setErrors((current) => ({ ...current, usd: undefined }));
            }
          }}
          error={errors.usd}
          keyboardType="decimal-pad"
          suffix={fa.units.usd}
        />
      </Card>

      <Card padded={false}>
        <ListRow
          icon={Icons.calendar}
          title={fa.setup.timezone}
          value={fa.setup.timezoneValue}
        />
      </Card>

      <Card tone="warning">
        <View style={styles.noticeRow}>
          <Icon name={Icons.cloudOff} size={22} color={theme.warning} />
          <ThemedText type="small" style={styles.noticeText}>
            {fa.setup.localNotice}
          </ThemedText>
        </View>
      </Card>

      {submitError ? (
        <Card tone="danger">
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            {fa.errors.factoryCreate}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {submitError}
          </ThemedText>
        </Card>
      ) : null}

      <AppButton label={fa.setup.submit} onPress={handleSubmit} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  center: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    maxWidth: 520,
    paddingHorizontal: Spacing.two,
  },
  formCard: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  sectionHeader: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
  },
});
