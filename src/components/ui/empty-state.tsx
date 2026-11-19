import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body?: string;
}

export function EmptyState({ icon, title, body }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={[styles.iconBubble, { backgroundColor: theme.primarySoft }]}>
          <Icon name={icon} size={30} color={theme.primary} />
        </View>
      ) : null}
      <ThemedText type="subtitle" style={styles.center}>
        {title}
      </ThemedText>
      {body ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {body}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  center: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
