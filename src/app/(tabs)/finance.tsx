import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
  ];

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <ScreenHeader title={fa.finance.title} subtitle={fa.finance.subtitle} />

      <Card padded={false}>
        {features.map((feature) => (
          <ListRow
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            subtitle={feature.body}
            onPress={() => router.push(feature.href)}
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
