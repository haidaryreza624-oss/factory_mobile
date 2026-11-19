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
import { useApp } from '@/providers/app-provider';

export default function MoreScreen() {
  const { factory } = useApp();
  const theme = useTheme();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <ScreenHeader title={fa.more.title} subtitle={fa.more.subtitle} />

      <Card padded={false}>
        <ListRow
          icon={Icons.factory}
          title={factory?.name ?? fa.common.notSet}
          subtitle={fa.more.business}
        />
        <ListRow
          icon={Icons.person}
          title={fa.more.owner}
          value={factory?.ownerName ?? fa.common.notSet}
        />
        <ListRow
          icon={Icons.wallet}
          title={fa.more.currency}
          value={fa.units.afn}
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
          icon={Icons.cloudOff}
          title={fa.more.sync}
          subtitle={fa.more.syncBody}
          value={fa.more.syncValue}
        />
        <ListRow icon={Icons.globe} title={fa.more.language} value={fa.more.languageValue} />
        <ListRow icon={Icons.calendar} title={fa.more.timezone} value={fa.more.timezoneValue} />
        <ListRow icon={Icons.lock} title={fa.more.security} value={fa.more.securityValue} />
      </Card>

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
