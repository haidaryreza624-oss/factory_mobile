import { Alert, StyleSheet, View } from 'react-native';

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
  const showComingSoon = () => {
    Alert.alert(fa.common.comingSoon, fa.common.comingSoonBody);
  };

  const features = [
    { title: fa.finance.expenses, body: fa.finance.expensesBody, icon: Icons.receipt },
    { title: fa.finance.exchange, body: fa.finance.exchangeBody, icon: Icons.rate },
    { title: fa.finance.ownerTransfers, body: fa.finance.ownerTransfersBody, icon: Icons.wallet },
    { title: fa.finance.personal, body: fa.finance.personalBody, icon: Icons.person },
  ];

  return (
    <Screen>
      <ScreenHeader title={fa.finance.title} subtitle={fa.finance.subtitle} />

      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        {fa.finance.soon}
      </ThemedText>

      <Card padded={false}>
        {features.map((feature) => (
          <ListRow
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            subtitle={feature.body}
            trailing={<Badge label={fa.common.comingSoon} />}
            onPress={showComingSoon}
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
