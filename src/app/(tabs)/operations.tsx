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

export default function OperationsScreen() {
  const showComingSoon = () => {
    Alert.alert(fa.common.comingSoon, fa.common.comingSoonBody);
  };

  const features = [
    { title: fa.operations.purchases, body: fa.operations.purchasesBody, icon: Icons.cart },
    { title: fa.operations.production, body: fa.operations.productionBody, icon: Icons.operations },
    { title: fa.operations.sales, body: fa.operations.salesBody, icon: Icons.receipt },
  ];

  return (
    <Screen>
      <ScreenHeader title={fa.operations.title} subtitle={fa.operations.subtitle} />

      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        {fa.operations.soon}
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
