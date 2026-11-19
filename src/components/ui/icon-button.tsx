import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  color?: string;
}

export function IconButton({ icon, label, onPress, color }: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.surfaceMuted,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Icon name={icon} size={20} color={color ?? theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
