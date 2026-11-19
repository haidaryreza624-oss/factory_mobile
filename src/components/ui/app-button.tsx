import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'regular' | 'small';

export interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  loading = false,
  disabled = false,
  icon,
  style,
}: AppButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.surface
          : 'transparent';

  const border = variant === 'secondary' ? theme.border : 'transparent';
  const textColor =
    variant === 'primary'
      ? theme.primaryText
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'secondary'
          ? theme.text
          : theme.primary;

  const spinnerColor = variant === 'primary' || variant === 'danger' ? theme.primaryText : theme.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'small' && styles.small,
        {
          backgroundColor: background,
          borderColor: border,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1,
        },
        style,
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          icon
        )}
        <ThemedText
          type={size === 'small' ? 'smallBold' : 'subtitle'}
          style={[styles.label, { color: textColor }]}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    textAlign: 'center',
  },
});
