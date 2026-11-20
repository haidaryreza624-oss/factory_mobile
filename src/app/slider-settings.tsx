import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import {
  DEFAULT_SLIDER_SETTINGS,
  getSliderSettings,
  saveSliderSettings,
  type PriceSliderRange,
  type SliderSettings,
} from '@/db/repositories/slider-settings';
import { parseAfnInput, parseKgInput, parseUsdInput } from '@/domain/money';
import { fa } from '@/i18n';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

interface SliderSettingsForm {
  purchasePriceAfnMin: string;
  purchasePriceAfnMax: string;
  purchasePriceAfnStep: string;
  purchasePriceUsdMin: string;
  purchasePriceUsdMax: string;
  purchasePriceUsdStep: string;
  salePriceAfnMin: string;
  salePriceAfnMax: string;
  salePriceAfnStep: string;
  salePriceUsdMin: string;
  salePriceUsdMax: string;
  salePriceUsdStep: string;
  productionOutputStep: string;
}

type FormField = keyof SliderSettingsForm;

const PRICE_FORM_FIELDS = {
  purchase: {
    AFN: {
      min: 'purchasePriceAfnMin',
      max: 'purchasePriceAfnMax',
      step: 'purchasePriceAfnStep',
    },
    USD: {
      min: 'purchasePriceUsdMin',
      max: 'purchasePriceUsdMax',
      step: 'purchasePriceUsdStep',
    },
  },
  sale: {
    AFN: {
      min: 'salePriceAfnMin',
      max: 'salePriceAfnMax',
      step: 'salePriceAfnStep',
    },
    USD: {
      min: 'salePriceUsdMin',
      max: 'salePriceUsdMax',
      step: 'salePriceUsdStep',
    },
  },
} satisfies Record<'purchase' | 'sale', Record<'AFN' | 'USD', {
  min: FormField;
  max: FormField;
  step: FormField;
}>>;

function minorToInput(value: number, currency: 'AFN' | 'USD'): string {
  if (currency === 'AFN') return String(value);
  return `${Math.trunc(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

function settingsToForm(settings: SliderSettings): SliderSettingsForm {
  return {
    purchasePriceAfnMin: String(settings.purchasePriceAfn.min),
    purchasePriceAfnMax: String(settings.purchasePriceAfn.max),
    purchasePriceAfnStep: String(settings.purchasePriceAfn.step),
    purchasePriceUsdMin: minorToInput(settings.purchasePriceUsd.min, 'USD'),
    purchasePriceUsdMax: minorToInput(settings.purchasePriceUsd.max, 'USD'),
    purchasePriceUsdStep: minorToInput(settings.purchasePriceUsd.step, 'USD'),
    salePriceAfnMin: String(settings.salePriceAfn.min),
    salePriceAfnMax: String(settings.salePriceAfn.max),
    salePriceAfnStep: String(settings.salePriceAfn.step),
    salePriceUsdMin: minorToInput(settings.salePriceUsd.min, 'USD'),
    salePriceUsdMax: minorToInput(settings.salePriceUsd.max, 'USD'),
    salePriceUsdStep: minorToInput(settings.salePriceUsd.step, 'USD'),
    productionOutputStep: String(settings.productionOutputStepGrams / 1000),
  };
}

function parsePositiveInteger(
  value: string,
  parse: (text: string) => number | null
): number | null {
  const parsed = parse(value);
  return parsed !== null && Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function parsePriceRange(
  form: SliderSettingsForm,
  errors: Partial<Record<FormField, string>>,
  keys: { min: FormField; max: FormField; step: FormField },
  parse: (text: string) => number | null
): PriceSliderRange | null {
  const min = parse(form[keys.min]);
  const max = parse(form[keys.max]);
  const step = parsePositiveInteger(form[keys.step], parse);

  if (min === null || !Number.isSafeInteger(min)) {
    errors[keys.min] = fa.sliderSettings.invalidRange;
  }
  if (max === null || !Number.isSafeInteger(max)) {
    errors[keys.max] = fa.sliderSettings.invalidRange;
  } else if (min !== null && max <= min) {
    errors[keys.max] = fa.sliderSettings.invalidRange;
  }
  if (step === null) {
    errors[keys.step] = fa.sliderSettings.invalidStep;
  }

  if (
    min === null ||
    max === null ||
    step === null ||
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    max <= min
  ) {
    return null;
  }

  return { min, max, step };
}

function parseForm(
  form: SliderSettingsForm
): { settings: SliderSettings | null; errors: Partial<Record<FormField, string>> } {
  const errors: Partial<Record<FormField, string>> = {};
  const purchasePriceAfn = parsePriceRange(
    form,
    errors,
    {
      min: 'purchasePriceAfnMin',
      max: 'purchasePriceAfnMax',
      step: 'purchasePriceAfnStep',
    },
    parseAfnInput
  );
  const purchasePriceUsd = parsePriceRange(
    form,
    errors,
    {
      min: 'purchasePriceUsdMin',
      max: 'purchasePriceUsdMax',
      step: 'purchasePriceUsdStep',
    },
    parseUsdInput
  );
  const salePriceAfn = parsePriceRange(
    form,
    errors,
    {
      min: 'salePriceAfnMin',
      max: 'salePriceAfnMax',
      step: 'salePriceAfnStep',
    },
    parseAfnInput
  );
  const salePriceUsd = parsePriceRange(
    form,
    errors,
    {
      min: 'salePriceUsdMin',
      max: 'salePriceUsdMax',
      step: 'salePriceUsdStep',
    },
    parseUsdInput
  );
  const productionOutputStepGrams = parsePositiveInteger(
    form.productionOutputStep,
    parseKgInput
  );
  if (productionOutputStepGrams === null) {
    errors.productionOutputStep = fa.sliderSettings.invalidStep;
  }

  if (
    Object.keys(errors).length > 0 ||
    !purchasePriceAfn ||
    !purchasePriceUsd ||
    !salePriceAfn ||
    !salePriceUsd ||
    productionOutputStepGrams === null
  ) {
    return { settings: null, errors };
  }

  return {
    settings: {
      purchasePriceAfn,
      purchasePriceUsd,
      salePriceAfn,
      salePriceUsd,
      productionOutputStepGrams,
    },
    errors,
  };
}

export default function SliderSettingsScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const [form, setForm] = useState(() => settingsToForm(DEFAULT_SLIDER_SETTINGS));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!factory) return;
    let cancelled = false;

    getSliderSettings(db, factory.id)
      .then((settings) => {
        if (!cancelled) setForm(settingsToForm(settings));
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError(cause instanceof Error ? cause.message : fa.sliderSettings.loadError);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [db, factory]);

  if (!factory) return null;

  const updateField = (field: FormField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
    setSaveError(null);
  };

  const renderInput = (
    field: FormField,
    label: string,
    suffix: string
  ) => (
    <AppTextInput
      key={field}
      label={label}
      value={form[field]}
      onChangeText={(value) => updateField(field, value)}
      suffix={suffix}
      keyboardType="decimal-pad"
      error={fieldErrors[field]}
      editable={!loading && !saving && !loadError}
    />
  );

  const renderPriceRange = (
    prefix: 'purchase' | 'sale',
    currency: 'AFN' | 'USD'
  ) => {
    const fields = PRICE_FORM_FIELDS[prefix][currency];
    const unit = currency === 'AFN' ? fa.units.afn : fa.units.usd;
    return (
      <View style={styles.currencyGroup}>
        <ThemedText type="smallBold">{unit}</ThemedText>
        {renderInput(fields.min, fa.sliderSettings.minimum, unit)}
        {renderInput(fields.max, fa.sliderSettings.maximum, unit)}
        {renderInput(fields.step, fa.sliderSettings.step, unit)}
      </View>
    );
  };

  const handleSave = async () => {
    if (saving || loading || loadError) return;
    const parsed = parseForm(form);
    setFieldErrors(parsed.errors);
    setSaved(false);
    setSaveError(null);
    if (!parsed.settings) return;

    setSaving(true);
    try {
      await saveSliderSettings(db, factory.id, parsed.settings);
      setForm(settingsToForm(parsed.settings));
      setSaved(true);
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : fa.sliderSettings.saveError
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={fa.sliderSettings.title}
        subtitle={fa.sliderSettings.subtitle}
        onBack={() => router.back()}
      />

      <Card tone="info">
        <ThemedText type="small">{fa.sliderSettings.overview}</ThemedText>
      </Card>

      {loadError ? (
        <Card tone="danger">
          <ThemedText type="smallBold">{fa.sliderSettings.loadError}</ThemedText>
          <ThemedText type="caption">{loadError}</ThemedText>
        </Card>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <Card>
            <ThemedText type="subtitle">{fa.sliderSettings.purchaseUnitPrice}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.sliderSettings.priceBounds}
            </ThemedText>
            {renderPriceRange('purchase', 'AFN')}
            {renderPriceRange('purchase', 'USD')}
          </Card>

          <Card>
            <ThemedText type="subtitle">{fa.sliderSettings.saleUnitPrice}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.sliderSettings.priceBounds}
            </ThemedText>
            {renderPriceRange('sale', 'AFN')}
            {renderPriceRange('sale', 'USD')}
          </Card>

          <Card>
            <ThemedText type="subtitle">{fa.sliderSettings.productionOutput}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.sliderSettings.productionOutputHint}
            </ThemedText>
            {renderInput(
              'productionOutputStep',
              fa.sliderSettings.step,
              fa.common.kg
            )}
          </Card>

          {saveError ? (
            <Card tone="danger">
              <ThemedText type="smallBold">{fa.sliderSettings.saveError}</ThemedText>
              <ThemedText type="caption">{saveError}</ThemedText>
            </Card>
          ) : null}
          {saved ? (
            <Card tone="success">
              <ThemedText type="smallBold">{fa.sliderSettings.saved}</ThemedText>
            </Card>
          ) : null}
          <AppButton
            label={fa.sliderSettings.save}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={Boolean(loadError)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  currencyGroup: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
});
