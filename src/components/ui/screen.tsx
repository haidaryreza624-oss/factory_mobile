import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenProps extends PropsWithChildren {
  /** Wrap content in a vertical ScrollView. Defaults to true. */
  scroll?: boolean;
  /** Apply standard horizontal page padding. Defaults to true. */
  padded?: boolean;
  contentContainerStyle?: ViewStyle;
  /** Override safe area edges for screens managed by a tab navigator. */
  safeAreaEdges?: Edge[];
}

/**
 * Page shell. Explicit native direction keeps Expo Go layouts RTL; web uses
 * the document direction set in the global stylesheet.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  contentContainerStyle,
  safeAreaEdges = ['top', 'right', 'bottom', 'left'],
}: ScreenProps) {
  const theme = useTheme();
  const nativeDirectionStyle = Platform.OS === 'web' ? undefined : styles.rtl;

  const content = (
    <View
      style={[
        styles.content,
        nativeDirectionStyle,
        padded && styles.padded,
        contentContainerStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, nativeDirectionStyle, { backgroundColor: theme.background }]}
      edges={safeAreaEdges}>
      <KeyboardAvoidingView
        style={[styles.flex, nativeDirectionStyle]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scroll ? (
          <ScrollView
            style={[styles.flex, nativeDirectionStyle]}
            contentContainerStyle={[styles.scrollContent, nativeDirectionStyle]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
  },
  rtl: {
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
