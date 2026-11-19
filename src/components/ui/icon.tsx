import { SymbolView, type SymbolViewProps } from 'expo-symbols';

export type IconName = SymbolViewProps['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Platform-aware icon. Pass `{ ios, android }` names so the app uses SF
 * Symbols on iOS and Material Symbols on Android. Every icon used by the app
 * must be listed in one place (`src/constants/icons.ts`) so missing names are
 * caught at build time.
 */
export function Icon({ name, size = 22, color }: IconProps) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}
