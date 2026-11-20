import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RangeSliderInput } from '@/components/ui/range-slider-input';
import { Spacing } from '@/constants/theme';
import {
  afnEquivalent,
  moneyMinorToInput,
  parseAfnInput,
  parseUsdInput,
  type Currency,
} from '@/domain/money';
import { fa } from '@/i18n';
import { formatAfn, formatMoney } from '@/lib/format';

interface PaymentSliderProps {
  totalMinor: number;
  paidMinor: number;
  step: number;
  currency: Currency;
  rateMilli?: number | null;
  rateMissingLabel?: string;
  paidLabel: string;
  remainingLabel: string;
  invalidAmountMessage: string;
  amountInput: string | null;
  onAmountInputChange: (value: string) => void;
  onChange: (amountMinor: number) => void;
  onSliderChange: (amountMinor: number, amountInput: string | null) => void;
}

export function PaymentSlider({
  totalMinor,
  paidMinor,
  step,
  currency,
  rateMilli,
  rateMissingLabel,
  paidLabel,
  remainingLabel,
  invalidAmountMessage,
  amountInput,
  onAmountInputChange,
  onChange,
  onSliderChange,
}: PaymentSliderProps) {
  const safeTotal = Math.max(0, Math.round(totalMinor));
  const currentPaid = Math.max(0, Math.min(safeTotal, Math.round(paidMinor)));
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const remaining = safeTotal - currentPaid;
  const displayedAmount = amountInput ?? moneyMinorToInput(currentPaid, currency);
  const parsedInputAmount = amountInput === null
    ? currentPaid
    : currency === 'AFN'
      ? parseAfnInput(amountInput)
      : parseUsdInput(amountInput);
  const amountExceedsTotal =
    parsedInputAmount !== null && parsedInputAmount > safeTotal;
  const invalidInput =
    amountInput !== null && parsedInputAmount === null;

  return (
    <View style={styles.container}>
      <RangeSliderInput
        label={paidLabel}
        min={0}
        max={safeTotal}
        step={safeTotal > 0 ? Math.min(safeStep, safeTotal) : safeStep}
        value={currentPaid}
        inputValue={displayedAmount}
        suffix={currency === 'AFN' ? fa.units.afn : fa.units.usd}
        parseValue={(value) => currency === 'AFN'
          ? parseAfnInput(value)
          : parseUsdInput(value)}
        formatValue={(value) => moneyMinorToInput(value, currency)}
        formatRangeLabel={(value) => formatMoney(value, currency)}
        onInputValueChange={onAmountInputChange}
        onValueChange={(amount, source) => {
          if (source === 'slider') {
            onSliderChange(
              amount,
              amount >= safeTotal ? null : moneyMinorToInput(amount, currency)
            );
          } else {
            onChange(amount);
          }
        }}
        accessibilityHint={fa.common.paymentSliderHint}
        disabled={safeTotal === 0}
        error={
          amountExceedsTotal
            ? fa.common.paymentExceedsTotal
            : invalidInput
              ? invalidAmountMessage
              : null
        }
      />
      <ThemedText type="smallBold">
        {remainingLabel}: {formatMoney(remaining, currency)}
      </ThemedText>
      {currency === 'USD' ? rateMilli ? (
        <ThemedText type="small" themeColor="textSecondary">
          {fa.common.afnEquivalent}: {formatAfn(afnEquivalent('USD', currentPaid, rateMilli))}
        </ThemedText>
      ) : rateMissingLabel ? (
        <ThemedText type="small" themeColor="textSecondary">
          {rateMissingLabel}
        </ThemedText>
      ) : null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
});
