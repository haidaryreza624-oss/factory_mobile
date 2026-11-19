import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export interface BrandMarkProps {
  size?: number;
  showName?: boolean;
}

export function BrandMark({ size = 48, showName = false }: BrandMarkProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: theme.primary,
          },
        ]}>
        <Icon name={Icons.factory} size={size * 0.52} color={theme.primaryText} />
      </View>
      {showName ? (
        <ThemedText type="subtitle" style={styles.name}>
          {fa.appName}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  name: {
    textAlign: 'center',
  },
});
