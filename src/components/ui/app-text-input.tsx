import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface AppTextInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  /** Unit rendered at the trailing edge, e.g. «افغانی». */
  suffix?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
}

export function AppTextInput({
  label,
  hint,
  error,
  suffix,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...inputProps
}: AppTextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <ThemedText type="label">{label}</ThemedText> : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.surface,
            borderColor,
          },
        ]}>
        <TextInput
          {...inputProps}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              color: theme.text,
            },
            inputStyle,
          ]}
        />
        {suffix ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.suffix}>
            {suffix}
          </ThemedText>
        ) : null}
      </View>

      {error ? (
        <ThemedText type="caption" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
    paddingVertical: Spacing.two,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  suffix: {
    textAlign: 'left',
  },
});
