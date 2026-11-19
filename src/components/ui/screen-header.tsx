import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { fa } from '@/i18n';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional element rendered on the opposite side of the title. */
  action?: ReactNode;
  /** Shows a back control when provided. */
  onBack?: () => void;
}

export function ScreenHeader({ title, subtitle, action, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <IconButton
          icon={{ ios: 'chevron.right', android: 'chevron_right' }}
          label={fa.common.back}
          onPress={onBack}
        />
      ) : null}

      <View style={styles.texts}>
        <ThemedText type="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  texts: {
    flex: 1,
    gap: Spacing.half,
  },
});
