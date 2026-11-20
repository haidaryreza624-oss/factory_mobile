import { StyleSheet, View } from 'react-native';

import { PaymentSlider } from '@/components/finance/payment-slider';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { Currency } from '@/domain/money';
import { fa } from '@/i18n';

interface PaymentCollectionFormProps {
  title: string;
  outstandingLabel: string;
  outstandingOriginalMinor: number;
  step: number;
  currencyLabel: string;
  amountLabel: string;
  invalidAmountMessage: string;
  saveLabel: string;
  amountMinor: number;
  amountInput: string | null;
  currency: Currency;
  rateMilli: number | null;
  saving: boolean;
  onAmountInputChange: (value: string) => void;
  onAmountChange: (value: number) => void;
  onSliderChange: (amountMinor: number, amountInput: string | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PaymentCollectionForm({
  title,
  outstandingLabel,
  outstandingOriginalMinor,
  step,
  currencyLabel,
  amountLabel,
  invalidAmountMessage,
  saveLabel,
  amountMinor,
  amountInput,
  currency,
  rateMilli,
  saving,
  onAmountInputChange,
  onAmountChange,
  onSliderChange,
  onSave,
  onCancel,
}: PaymentCollectionFormProps) {
  return (
    <Card>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {currencyLabel}: {currency === 'AFN' ? fa.units.afn : fa.units.usd}
      </ThemedText>
      <PaymentSlider
        totalMinor={outstandingOriginalMinor}
        paidMinor={amountMinor}
        step={step}
        currency={currency}
        rateMilli={rateMilli}
        rateMissingLabel={fa.common.dailyRateUnavailable}
        paidLabel={amountLabel}
        remainingLabel={outstandingLabel}
        invalidAmountMessage={invalidAmountMessage}
        amountInput={amountInput}
        onAmountInputChange={onAmountInputChange}
        onChange={onAmountChange}
        onSliderChange={onSliderChange}
      />
      <View style={styles.formActions}>
        <AppButton
          label={fa.common.cancel}
          variant="secondary"
          onPress={onCancel}
          disabled={saving}
          style={styles.action}
        />
        <AppButton
          label={saveLabel}
          onPress={onSave}
          loading={saving}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
