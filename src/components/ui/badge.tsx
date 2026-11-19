import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'default' }: BadgeProps) {
  const theme = useTheme();

  const tones = {
    default: { backgroundColor: theme.surfaceMuted, color: theme.textSecondary },
    success: { backgroundColor: theme.successSoft, color: theme.success },
    warning: { backgroundColor: theme.warningSoft, color: theme.warning },
    danger: { backgroundColor: theme.dangerSoft, color: theme.danger },
    info: { backgroundColor: theme.infoSoft, color: theme.info },
  };

  return (
    <View style={[styles.badge, { backgroundColor: tones[tone].backgroundColor }]}>
      <ThemedText type="caption" style={{ color: tones[tone].color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
});
