import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { toPersianDigits } from '@/lib/persian';
import { useTheme } from '@/hooks/use-theme';

export interface StepFlowProps extends PropsWithChildren {
  currentStep: number;
  totalSteps: number;
  title: string;
  backLabel: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function StepFlow({
  currentStep,
  totalSteps,
  title,
  backLabel,
  nextLabel = fa.common.continue,
  nextDisabled = false,
  loading = false,
  onBack,
  onNext,
  children,
}: StepFlowProps) {
  const theme = useTheme();
  const progressLabel = fa.common.stepProgress(
    toPersianDigits(currentStep + 1),
    toPersianDigits(totalSteps)
  );

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <ThemedText type="caption" themeColor="textSecondary">
          {progressLabel}
        </ThemedText>
        <View style={styles.progressTrack} accessibilityLabel={progressLabel}>
          {Array.from({ length: totalSteps }, (_, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                { backgroundColor: index <= currentStep ? theme.primary : theme.border },
              ]}
            />
          ))}
        </View>
        <ThemedText type="subtitle">{title}</ThemedText>
      </View>

      <Card style={styles.content}>{children}</Card>

      <View style={styles.actions}>
        <AppButton
          label={backLabel}
          variant="secondary"
          onPress={onBack}
          style={styles.action}
        />
        <AppButton
          label={nextLabel}
          onPress={onNext}
          disabled={nextDisabled}
          loading={loading}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  progressHeader: { gap: Spacing.two },
  progressTrack: { flexDirection: 'row', gap: Spacing.one },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: Radius.pill,
  },
  content: { minHeight: 180, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
