import { Slider } from '@expo/ui/community/slider';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SliderValueSource = 'input' | 'slider';

export interface RangeSliderInputProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value?: number | null;
  inputValue?: string;
  suffix?: string;
  error?: string | null;
  accessibilityHint?: string;
  disabled?: boolean;
  parseValue: (text: string) => number | null;
  formatValue: (value: number) => string;
  formatRangeLabel?: (value: number) => string;
  onInputValueChange: (text: string) => void;
  onValueChange: (value: number, source: SliderValueSource) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function RangeSliderInput({
  label,
  min,
  max,
  step,
  value,
  inputValue,
  suffix,
  error,
  accessibilityHint,
  disabled = false,
  parseValue,
  formatValue,
  formatRangeLabel = formatValue,
  onInputValueChange,
  onValueChange,
}: RangeSliderInputProps) {
  const theme = useTheme();
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? Math.max(safeMin, max) : safeMin;
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const sliderValue = value == null || !Number.isFinite(value)
    ? safeMax
    : clamp(value, safeMin, safeMax);
  const sliderDisabled = disabled || safeMax <= safeMin;

  const handleSliderChange = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) return;
    const range = safeMax - safeMin;
    const completeSteps = Math.floor(range / safeStep);
    const finalPartialStep = range - completeSteps * safeStep;
    const reachesMaximum =
      finalPartialStep > 0 &&
      nextValue >= safeMax - finalPartialStep / 2;
    const increments = Math.round((nextValue - safeMin) / safeStep);
    const snappedValue = reachesMaximum
      ? safeMax
      : clamp(safeMin + increments * safeStep, safeMin, safeMax);
    const normalizedValue = Number(snappedValue.toFixed(8));
    onInputValueChange(formatValue(normalizedValue));
    onValueChange(normalizedValue, 'slider');
  };

  return (
    <View style={styles.container}>
      <AppTextInput
        label={label}
        value={inputValue ?? formatValue(sliderValue)}
        onChangeText={(text) => {
          onInputValueChange(text);
          const parsed = parseValue(text);
          if (
            parsed !== null &&
            Number.isFinite(parsed) &&
            parsed >= safeMin &&
            parsed <= safeMax
          ) {
            onValueChange(parsed, 'input');
          }
        }}
        suffix={suffix}
        keyboardType="decimal-pad"
        error={error}
        editable={!disabled}
      />
      {/* Keep the native slider continuous so the component can snap to an irregular maximum. */}
      <Slider
        minimumValue={safeMin}
        maximumValue={safeMax > safeMin ? safeMax : safeMin + safeStep}
        step={0}
        value={sliderValue}
        disabled={sliderDisabled}
        inverted
        minimumTrackTintColor={theme.primary}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        onValueChange={handleSliderChange}
        style={styles.slider}
      />
      <View style={styles.rangeLabels}>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatRangeLabel(safeMin)}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatRangeLabel(safeMax)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  slider: { width: '100%', height: 40 },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
