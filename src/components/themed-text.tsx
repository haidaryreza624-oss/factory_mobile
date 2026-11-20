import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'display'
    | 'title'
    | 'subtitle'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'label'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'number';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[{ color: theme[themeColor ?? 'text'] }, styles.base, styles[type], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 1,
  },
  display: {
    fontSize: 32,
    lineHeight: 46,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  default: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  small: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  caption: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  label: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  link: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: '#0B6E4F',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  number: {
    fontSize: 26,
    lineHeight: 38,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontVariant: ['tabular-nums'],
  },
});
