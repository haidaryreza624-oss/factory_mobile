import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  icon?: IconName;
  iconTint?: string;
  /** Trailing text value, e.g. a currency balance. */
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export function ListRow({
  title,
  subtitle,
  leading,
  icon,
  iconTint,
  value,
  trailing,
  onPress,
  showChevron = false,
}: ListRowProps) {
  const theme = useTheme();
  const tint = iconTint ?? theme.primary;

  const body = (
    <>
      {leading}
      {!leading && icon ? (
        <View style={[styles.iconBubble, { backgroundColor: theme.primarySoft }]}>
          <Icon name={icon} size={22} color={tint} />
        </View>
      ) : null}

      <View style={styles.texts}>
        <ThemedText type="default">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
        {value && trailing ? (
          <View style={styles.valueAndTrailing}>
            <ThemedText type="smallBold" style={styles.value}>
              {value}
            </ThemedText>
            {trailing}
          </View>
        ) : null}
      </View>

      {value && !trailing ? (
        <ThemedText type="smallBold" style={styles.value}>
          {value}
        </ThemedText>
      ) : null}
      {!value ? trailing : null}

      {showChevron ? (
        <Icon
          name={Icons.chevronLeft}
          size={18}
          color={theme.textSecondary}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        styles.pressable,
        { backgroundColor: pressed ? theme.surfaceMuted : theme.surface },
      ]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    minHeight: 60,
  },
  pressable: {
    overflow: 'hidden',
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  valueAndTrailing: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  value: {
    maxWidth: '100%',
    flexShrink: 1,
    textAlign: 'left',
  },
});
