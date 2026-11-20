import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { Icon } from '@/components/ui/icon';
import { Icons } from '@/constants/icons';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export interface FatalErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export function FatalErrorScreen({ message, onRetry }: FatalErrorScreenProps) {
  const theme = useTheme();
  const nativeDirectionStyle = Platform.OS === 'web' ? undefined : styles.rtl;

  return (
    <SafeAreaView style={[styles.safeArea, nativeDirectionStyle, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={[styles.iconBubble, { backgroundColor: theme.dangerSoft }]}>
          <Icon name={Icons.warning} size={34} color={theme.danger} />
        </View>
        <ThemedText type="title" style={styles.center}>
          {fa.errors.dbOpen}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {message ?? fa.common.unknownError}
        </ThemedText>
        {onRetry ? (
          <AppButton label={fa.common.retry} onPress={onRetry} style={styles.button} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  rtl: {
    direction: 'rtl',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  button: {
    alignSelf: 'stretch',
    maxWidth: 320,
    width: '100%',
  },
});
