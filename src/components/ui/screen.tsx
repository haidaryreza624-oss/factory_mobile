import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenProps extends PropsWithChildren {
  /** Wrap content in a vertical ScrollView. Defaults to true. */
  scroll?: boolean;
  /** Apply standard horizontal page padding. Defaults to true. */
  padded?: boolean;
  contentContainerStyle?: ViewStyle;
}

/**
 * Page shell. `direction: 'rtl'` makes layout deterministic even when the
 * phone itself is set to a left-to-right language (Expo Go cannot force the
 * native RTL flag without a development build).
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  contentContainerStyle,
}: ScreenProps) {
  const theme = useTheme();

  const content = (
    <View style={[styles.content, padded && styles.padded, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    direction: 'rtl',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.five,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  padded: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});
