import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { toPersianDigits } from '@/lib/persian';
import { useTheme } from '@/hooks/use-theme';

export default function MoreScreen() {
  const theme = useTheme();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <ScreenHeader title={fa.more.title} subtitle={fa.more.subtitle} />

      <Card padded={false}>
        <ListRow
          icon={Icons.chart}
          title={fa.more.reports}
          subtitle={fa.more.reportsBody}
          onPress={() => router.push('/reports')}
          showChevron
        />
        <ListRow
          icon={Icons.calendar}
          title={fa.more.notifications}
          subtitle={fa.more.notificationsBody}
          onPress={() => router.push('/notifications')}
          showChevron
        />
      </Card>

      <Card padded={false}>
        <ListRow
          icon={Icons.inventory}
          title={fa.more.rawMaterials}
          subtitle={fa.more.rawMaterialsBody}
          onPress={() => router.push('/(tabs)/inventory')}
          showChevron
        />
        <ListRow
          icon={Icons.factory}
          title={fa.more.finishedProducts}
          subtitle={fa.more.finishedProductsBody}
          onPress={() => router.push('/finished-products')}
          showChevron
        />
      </Card>

      <Card padded={false}>
        <ListRow
          icon={Icons.rate}
          title={fa.more.rateSettings}
          subtitle={fa.rate.subtitle}
          onPress={() => router.push('/rate')}
          showChevron
        />
        <ListRow
          icon={Icons.settings}
          title={fa.more.sliderSettings}
          subtitle={fa.more.sliderSettingsBody}
          onPress={() => router.push('/slider-settings')}
          showChevron
        />
        <ListRow
          icon={Icons.cloudOff}
          title={fa.more.sync}
          subtitle={fa.more.syncBody}
          onPress={() => router.push('/cloud-backup')}
          showChevron
        />
      </Card>

      {__DEV__ ? (
        <Card padded={false}>
          <ListRow
            icon={Icons.settings}
            title={fa.more.admin}
            subtitle={fa.more.adminBody}
            onPress={() => router.push('/admin')}
            showChevron
          />
        </Card>
      ) : null}

      <Card tone="info">
        <View style={styles.noticeRow}>
          <Icon name={Icons.database} size={22} color={theme.info} />
          <ThemedText type="small" style={styles.noticeText}>
            {fa.more.localDataNote}
          </ThemedText>
        </View>
      </Card>

      <Card padded={false}>
        <ListRow
          icon={Icons.info}
          title={fa.more.about}
          subtitle={fa.appName}
          value={`${fa.common.version} ${toPersianDigits(version)}`}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
  },
});
