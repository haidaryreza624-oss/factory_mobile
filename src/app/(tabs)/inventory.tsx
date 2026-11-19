import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export default function InventoryScreen() {
  const theme = useTheme();

  const planned = [fa.inventory.plannedMaterials, fa.inventory.plannedThresholds, fa.inventory.plannedMovements];

  return (
    <Screen>
      <ScreenHeader title={fa.inventory.title} subtitle={fa.inventory.subtitle} />

      <EmptyState
        icon={Icons.inventory}
        title={fa.inventory.emptyTitle}
        body={fa.inventory.emptyBody}
      />

      <Card>
        <ThemedText type="smallBold">{fa.inventory.plannedTitle}</ThemedText>
        <View style={styles.list}>
          {planned.map((item) => (
            <View key={item} style={styles.row}>
              <Icon name={Icons.check} size={18} color={theme.primary} />
              <ThemedText type="small" style={styles.rowText}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
});
