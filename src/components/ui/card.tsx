import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface CardProps extends PropsWithChildren {
  tone?: CardTone;
  /** Set false when the card only groups list rows. Defaults to true. */
  padded?: boolean;
  style?: ViewStyle;
}

export function Card({ children, tone = 'default', padded = true, style }: CardProps) {
  const theme = useTheme();

  const tones = {
    default: { backgroundColor: theme.surface, borderColor: theme.border },
    primary: { backgroundColor: theme.primarySoft, borderColor: theme.primarySoft },
    success: { backgroundColor: theme.successSoft, borderColor: theme.successSoft },
    warning: { backgroundColor: theme.warningSoft, borderColor: theme.warningSoft },
    danger: { backgroundColor: theme.dangerSoft, borderColor: theme.dangerSoft },
    info: { backgroundColor: theme.infoSoft, borderColor: theme.infoSoft },
  };

  return (
    <View style={[styles.card, tones[tone], padded && styles.padded, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.three,
  },
});
