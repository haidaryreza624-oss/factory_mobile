/**
 * Design tokens for the factory management app.
 *
 * The palette is used through `useTheme()` so every screen follows the
 * device light/dark preference. The app itself is Persian/RTL only.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#101828',
    background: '#F6F7F9',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F1EE',
    textSecondary: '#667085',
    primary: '#0B6E4F',
    primaryText: '#FFFFFF',
    primarySoft: '#E6F4EE',
    border: '#E4E7EC',
    surface: '#FFFFFF',
    surfaceMuted: '#F2F4F7',
    success: '#067647',
    successSoft: '#ECFDF3',
    warning: '#B54708',
    warningSoft: '#FFFAEB',
    danger: '#B42318',
    dangerSoft: '#FEF3F2',
    info: '#175CD3',
    infoSoft: '#EFF8FF',
    gold: '#C98A18',
  },
  dark: {
    text: '#F5F7FA',
    background: '#0C111D',
    backgroundElement: '#161B26',
    backgroundSelected: '#1F2937',
    textSecondary: '#98A2B3',
    primary: '#3DDC97',
    primaryText: '#06281C',
    primarySoft: '#123B2C',
    border: '#1F2937',
    surface: '#161B26',
    surfaceMuted: '#1F2937',
    success: '#75E0A7',
    successSoft: '#123B2C',
    warning: '#FDB022',
    warningSoft: '#3B2A0B',
    danger: '#FDA29B',
    dangerSoft: '#3B1219',
    info: '#84CAFF',
    infoSoft: '#0B2A4A',
    gold: '#F5C15C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
