import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/ui/brand-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export function LoadingScreen({ label = fa.common.loading }: { label?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <BrandMark size={64} />
      <ActivityIndicator size="large" color={theme.primary} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
