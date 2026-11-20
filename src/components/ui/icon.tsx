import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

export type IconName = SymbolViewProps['name'];

export interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Centralized platform-aware icon component.
 * iOS uses SF Symbols; Android and web use matching Material Symbols.
 */
export function AppIcon({
  name,
  size = 22,
  color,
  accessibilityLabel,
  style,
}: AppIconProps) {
  let platformName: IconName = name;

  if (typeof name === 'object') {
    if (Platform.OS === 'ios' && name.ios) {
      platformName = { ios: name.ios };
    } else if (Platform.OS === 'web' && name.android) {
      platformName = { web: name.android };
    } else if (Platform.OS === 'android' && name.android) {
      platformName = { android: name.android };
    } else if (name.ios) {
      platformName = { ios: name.ios };
    }
  }

  return (
    <SymbolView
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      name={platformName ?? name}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}

export type IconProps = AppIconProps;

export function Icon(props: IconProps) {
  return <AppIcon {...props} />;
}
