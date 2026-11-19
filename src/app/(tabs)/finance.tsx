import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { fa } from '@/i18n';

export default function FinanceScreen() {
  const features = [
    { title: fa.finance.expenses, body: fa.finance.expensesBody, icon: Icons.receipt, href: '/business-expenses' as const },
    { title: fa.finance.personal, body: fa.finance.personalBody, icon: Icons.person, href: '/personal-finance' as const },
    { title: fa.finance.exchange, body: fa.finance.exchangeBody, icon: Icons.rate },
    { title: fa.finance.ownerTransfers, body: fa.finance.ownerTransfersBody, icon: Icons.wallet },
  ];

  return (
    <Screen>
      <ScreenHeader title={fa.finance.title} subtitle={fa.finance.subtitle} />

      <Card padded={false}>
        {features.map((feature) => (
          <ListRow
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            subtitle={feature.body}
            trailing={feature.href ? undefined : <Badge label={fa.common.comingSoon} />}
            onPress={feature.href ? () => router.push(feature.href) : undefined}
          />
        ))}
      </Card>

      <View style={styles.footnote}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
          {fa.dashboard.localNotice}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingTop: Spacing.two,
  },
  footnote: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  center: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
